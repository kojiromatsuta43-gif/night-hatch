import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { notifyChatMessage } from "@/lib/server/notifications";

export async function GET() {
  const user = await requireUser();
  const db = getDb();

  const users = db
    .prepare("SELECT id, name, role, last_seen_at FROM users WHERE id != ? AND role != 'admin'")
    .all(user.id) as { id: string; name: string; role: string }[];

  // 案件名と添付ファイルを一緒に返す（相手の案件でもスレッド名を出せるようにする）
  const messages = db
    .prepare(
      `SELECT c.*, p.title AS project_title, u.filename AS upload_name, u.mime AS upload_mime
       FROM chat_messages c
       LEFT JOIN projects p ON p.id = c.project_id
       LEFT JOIN uploads u ON u.id = c.upload_id
       WHERE c.from_id = ? OR c.to_id = ?
       ORDER BY c.created_at ASC, c.rowid ASC`
    )
    .all(user.id, user.id);

  // 新しくスレッドを始めるときの選択肢。
  // クライアントは自分が発注した案件、フリーランスは自分が担当する案件。
  const projects = db
    .prepare(
      user.role === "freelancer"
        ? "SELECT id, title FROM projects WHERE assignee_id = ? ORDER BY created_at DESC"
        : "SELECT id, title FROM projects WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(user.id) as { id: string; title: string }[];

  return NextResponse.json({ users, messages, projects, me: user.id });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { to, body, projectId, uploadId } = (await req.json()) as {
    to: string;
    body: string;
    projectId?: string | null;
    uploadId?: string | null;
  };

  const text = String(body ?? "").trim();
  if (!to || (!text && !uploadId)) {
    return NextResponse.json({ error: "メッセージかファイルを入力してください" }, { status: 400 });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO chat_messages (id, from_id, to_id, body, project_id, upload_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, user.id, to, text, projectId ?? null, uploadId ?? null);

  const project = projectId
    ? (db.prepare("SELECT title FROM projects WHERE id = ?").get(projectId) as { title: string } | undefined)
    : undefined;

  notifyChatMessage(to, { id: user.id, name: user.name }, text || "ファイルが届きました", project?.title);

  return NextResponse.json({ id });
}
