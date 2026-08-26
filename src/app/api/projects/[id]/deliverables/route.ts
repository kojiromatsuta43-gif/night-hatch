import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { notify } from "@/lib/server/notifications";

type ProjectRow = { id: string; user_id: string; title: string; assignee_id: string | null };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const b = await req.json();
  const db = getDb();

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  if (!project) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  const allowed = project.user_id === user.id || project.assignee_id === user.id || user.role === "admin";
  if (!allowed) return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const kind: string = b.kind === "フィードバック" ? "フィードバック" : "提出";
  if (!String(b.body ?? "").trim() && !b.upload_id && !String(b.url ?? "").trim()) {
    return NextResponse.json({ error: "内容かファイル、URLのいずれかを入れてください" }, { status: 400 });
  }

  const did = crypto.randomUUID();
  db.prepare(
    `INSERT INTO deliverables (id, project_id, user_id, kind, title, body, url, upload_id)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(did, id, user.id, kind, b.title ?? "", b.body ?? "", b.url ?? "", b.upload_id ?? null);

  // 相手側に知らせる
  const other = user.id === project.user_id ? project.assignee_id : project.user_id;
  if (other) {
    notify(other, {
      id: `deliverable:${did}`,
      kind: "project",
      title: kind === "提出" ? "提出物が届きました" : "フィードバックが届きました",
      body: project.title,
      link: `/projects/${id}`,
    });
  }

  return NextResponse.json({ id: did });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("itemId");
  if (!target) return NextResponse.json({ error: "itemId が必要です" }, { status: 400 });
  getDb()
    .prepare("DELETE FROM deliverables WHERE id = ? AND project_id = ? AND user_id = ?")
    .run(target, id, user.id);
  return NextResponse.json({ ok: true });
}
