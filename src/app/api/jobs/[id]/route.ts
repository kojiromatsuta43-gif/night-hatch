import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { notify } from "@/lib/server/notifications";

/** この仕事を受ける（担当者になり、制作待ちへ進める） */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (user.role !== "freelancer") {
    return NextResponse.json({ error: "フリーランスのみ受注できます" }, { status: 403 });
  }
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | { id: string; user_id: string; title: string; status: string; assignee_id: string | null }
    | undefined;

  if (!project) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  if (project.status !== "募集中") {
    return NextResponse.json({ error: "この案件はすでに募集を終了しています" }, { status: 409 });
  }
  if (project.assignee_id && project.assignee_id !== user.id) {
    return NextResponse.json({ error: "この案件は他の方に決まりました" }, { status: 409 });
  }

  // 先着で埋まる可能性があるので、募集中かつ未割当のときだけ更新する
  const result = db
    .prepare(
      `UPDATE projects SET assignee_id = ?, status = '制作待ち'
       WHERE id = ? AND status = '募集中' AND (assignee_id IS NULL OR assignee_id = ?)`
    )
    .run(user.id, id, user.id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "ひと足違いで他の方に決まりました" }, { status: 409 });
  }

  notify(project.user_id, {
    id: `claimed:${id}`,
    kind: "project",
    title: "担当者が決まりました",
    body: `${user.name}さんが「${project.title}」を担当します`,
    link: `/projects/${id}`,
  });

  return NextResponse.json({ ok: true });
}
