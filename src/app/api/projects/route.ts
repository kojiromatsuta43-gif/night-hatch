import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { consumeFromGrants } from "@/lib/server/points-ledger";
import { requireUser } from "@/lib/server/auth";
import { notifyNewJob } from "@/lib/server/notifications";
import { pointsFor, catalogItem } from "@/lib/brand";

export async function GET() {
  const user = await requireUser();
  const db = getDb();
  const rows = (
    user.role === "admin"
      ? db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all()
      : user.role === "freelancer"
        ? // フリーランスは自分が担当する案件だけ見える
          db.prepare("SELECT * FROM projects WHERE assignee_id = ? ORDER BY created_at DESC").all(user.id)
        : db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC").all(user.id)
  ) as Record<string, unknown>[];
  // バッジ用: 修正依頼になっている提出・検収待ちの提出の数
  const counts = db
    .prepare(
      `SELECT project_id,
              SUM(CASE WHEN status = '修正依頼' THEN 1 ELSE 0 END) AS revise_count,
              SUM(CASE WHEN status = '' OR status = '確認待ち' THEN 1 ELSE 0 END) AS await_count
         FROM deliverables WHERE kind = '提出' GROUP BY project_id`
    )
    .all() as { project_id: string; revise_count: number; await_count: number }[];
  const byId = new Map(counts.map((c) => [c.project_id, c]));
  for (const r of rows) {
    const c = byId.get(String(r.id));
    r.revise_count = c?.revise_count ?? 0;
    r.await_count = c?.await_count ?? 0;
  }
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const db = getDb();
  if (!catalogItem(String(body.category ?? ""))) {
    return NextResponse.json({ error: "案件の種類を選んでください" }, { status: 400 });
  }
  const detail = (body.detail && typeof body.detail === "object" ? body.detail : {}) as Record<string, unknown>;
  // 消費ptは画面から送られた数字ではなく、メニュー表（件数メニューは件数×単価）から計算し直す
  const points = pointsFor(String(body.category), detail);
  if (user.points < points) {
    return NextResponse.json({ error: `ハニーPが足りません（必要 ${points} / 残高 ${user.points}）` }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const item = catalogItem(String(body.category));
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO projects (id, user_id, title, category, description, points, deadline, status, detail, requested_on, assignee_id) VALUES (?, ?, ?, ?, ?, ?, ?, '募集中', ?, ?, ?)"
    ).run(id, user.id, body.title, body.category, body.description, points, body.deadline, JSON.stringify(detail), new Date().toISOString().slice(0, 10), body.assignee_id ?? null);
    db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(points, user.id);
    consumeFromGrants(db, user.id, points);
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'spend', ?)").run(
      crypto.randomUUID(), user.id, -points, `案件登録: ${body.title}`
    );
    // 月額メニューは翌月から自動で継続（いつでも停止できる）
    if (item?.monthly) {
      const month = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
      const baseTitle = String(body.title).replace(/（\d+月分）$/, "");
      const exists = db
        .prepare("SELECT id FROM menu_subscriptions WHERE user_id = ? AND category = ? AND base_title = ? AND active = 1")
        .get(user.id, body.category, baseTitle);
      if (!exists) {
        db.prepare(
          "INSERT INTO menu_subscriptions (id, user_id, category, base_title, detail, points, last_month) VALUES (?,?,?,?,?,?,?)"
        ).run(crypto.randomUUID(), user.id, String(body.category), baseTitle, JSON.stringify(detail), points, month);
      } else {
        db.prepare("UPDATE menu_subscriptions SET last_month = ? WHERE id = ?").run(month, (exists as { id: string }).id);
      }
    }
  });
  tx();

  // 募集中で登録されるので、この時点でフリーランスに知らせる
  notifyNewJob({
    id,
    title: body.title,
    category: body.category,
    deadline: body.deadline,
    assignee_id: body.assignee_id ?? null,
  });

  return NextResponse.json({ id });
}
