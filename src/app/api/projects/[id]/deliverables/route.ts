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

  // 立場で出せるものを決める。画面側でも分けているが、ここでも必ず判定する。
  //   担当者（作る人）… 提出
  //   発注者          … フィードバック
  //   管理者          … 動作確認のため両方
  const requested: string = b.kind === "フィードバック" ? "フィードバック" : "提出";
  let kind: string;
  if (user.role === "admin") {
    kind = requested;
  } else if (project.assignee_id === user.id) {
    kind = "提出";
  } else if (project.user_id === user.id) {
    kind = "フィードバック";
  } else {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
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

/**
 * 提出物の検収。発注者（と管理者）だけが「検収OK」「修正依頼」を付けられる。
 * 検収OKになると担当者に通知が届く。修正依頼は、具体的な場所をコメント（動画の
 * 再生位置つき）で伝えるのとセットで使う。
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const itemId = String(b?.itemId ?? "");
  const status = String(b?.status ?? "");
  if (!itemId || !["検収OK", "修正依頼", "確認待ち"].includes(status)) {
    return NextResponse.json({ error: "検収の状態が不正です" }, { status: 400 });
  }
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  if (!project) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  if (project.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "検収は発注者が行います" }, { status: 403 });
  }
  const item = db.prepare("SELECT id, kind FROM deliverables WHERE id = ? AND project_id = ?").get(itemId, id) as
    | { id: string; kind: string }
    | undefined;
  if (!item || item.kind !== "提出") return NextResponse.json({ error: "提出物が見つかりません" }, { status: 404 });

  db.prepare("UPDATE deliverables SET status = ? WHERE id = ?").run(status, itemId);
  if (project.assignee_id && status !== "確認待ち") {
    notify(project.assignee_id, {
      id: `accept:${itemId}:${status}`,
      kind: "project",
      title: status === "検収OK" ? "提出物が検収されました 🎉" : "修正依頼が届きました",
      body: project.title,
      link: `/projects/${id}`,
    });
  }
  return NextResponse.json({ ok: true });
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
