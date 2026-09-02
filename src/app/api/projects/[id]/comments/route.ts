import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { notify } from "@/lib/server/notifications";

type ProjectRow = { id: string; user_id: string; title: string; assignee_id: string | null };

/**
 * 提出物への修正指示コメント。
 * at_seconds を入れると「動画の何秒のところか」が担当者に伝わる。
 * 発注者・担当者・管理者だけが書ける。
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const deliverableId = String(b?.deliverable_id ?? "");
  const body = String(b?.body ?? "").trim();
  const atRaw = b?.at_seconds;
  const atSeconds = typeof atRaw === "number" && Number.isFinite(atRaw) && atRaw >= 0 ? Math.round(atRaw * 10) / 10 : null;
  if (!deliverableId || !body) {
    return NextResponse.json({ error: "コメントを入れてください" }, { status: 400 });
  }

  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  if (!project) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  const allowed = project.user_id === user.id || project.assignee_id === user.id || user.role === "admin";
  if (!allowed) return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  const item = db.prepare("SELECT id FROM deliverables WHERE id = ? AND project_id = ?").get(deliverableId, id);
  if (!item) return NextResponse.json({ error: "提出物が見つかりません" }, { status: 404 });

  const cid = crypto.randomUUID();
  db.prepare(
    "INSERT INTO deliverable_comments (id, deliverable_id, project_id, user_id, at_seconds, body) VALUES (?,?,?,?,?,?)"
  ).run(cid, deliverableId, id, user.id, atSeconds, body);

  const other = user.id === project.user_id ? project.assignee_id : project.user_id;
  if (other) {
    notify(other, {
      id: `dcomment:${cid}`,
      kind: "project",
      title: atSeconds != null ? "動画に修正指示が付きました" : "提出物にコメントが付きました",
      body: `${project.title}: ${body.slice(0, 60)}`,
      link: `/projects/${id}`,
    });
  }
  return NextResponse.json({ id: cid });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("commentId");
  if (!target) return NextResponse.json({ error: "commentId が必要です" }, { status: 400 });
  getDb()
    .prepare("DELETE FROM deliverable_comments WHERE id = ? AND project_id = ? AND user_id = ?")
    .run(target, id, user.id);
  return NextResponse.json({ ok: true });
}
