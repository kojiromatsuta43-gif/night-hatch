import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/**
 * 管理者ダッシュボードの全体集計。
 * 今月の数字と、クライアント・クリエイターそれぞれの状況を1回で返す。
 */
export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  const db = getDb();
  const month = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN kind = '提出' AND substr(created_at, 1, 7) = ? THEN 1 ELSE 0 END), 0) AS submissions,
         COALESCE(SUM(CASE WHEN kind = '提出' AND status = '検収OK' AND substr(created_at, 1, 7) = ? THEN 1 ELSE 0 END), 0) AS accepted,
         COALESCE(SUM(CASE WHEN kind = '提出' AND status = '修正依頼' THEN 1 ELSE 0 END), 0) AS revising
        FROM deliverables`
    )
    .get(month, month) as { submissions: number; accepted: number; revising: number };
  const honey = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN t.amount < 0 THEN -t.amount ELSE 0 END), 0) AS spent
         FROM point_transactions t JOIN users u ON u.id = t.user_id
        WHERE u.role = 'client' AND substr(t.created_at, 1, 7) = ?`
    )
    .get(month) as { spent: number };
  const ai = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN kind = 'chat' THEN 1 ELSE 0 END), 0) AS chat,
         COALESCE(SUM(CASE WHEN kind = 'gen' THEN 1 ELSE 0 END), 0) AS gen
        FROM ai_usage WHERE month = ?`
    )
    .get(month) as { chat: number; gen: number };
  const contracts = (db.prepare("SELECT COUNT(*) AS c FROM users WHERE plan_active = 1").get() as { c: number }).c;

  // クライアントごとの状況
  const clients = db
    .prepare(
      `SELECT u.id, u.name, u.plan, u.plan_active, u.points, u.last_seen_at,
              (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id AND substr(p.requested_on, 1, 7) = ?) AS ordered,
              (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id AND p.status NOT IN ('完了', '未公開')) AS active,
              (SELECT COALESCE(SUM(CASE WHEN t.amount < 0 THEN -t.amount ELSE 0 END), 0)
                 FROM point_transactions t WHERE t.user_id = u.id AND substr(t.created_at, 1, 7) = ?) AS spent,
              (SELECT COUNT(*) FROM deliverables d JOIN projects p ON p.id = d.project_id
                WHERE p.user_id = u.id AND d.kind = '提出' AND substr(d.created_at, 1, 7) = ?) AS submissions,
              (SELECT COUNT(*) FROM deliverables d JOIN projects p ON p.id = d.project_id
                WHERE p.user_id = u.id AND d.kind = '提出' AND (d.status = '' OR d.status = '確認待ち')) AS awaiting
         FROM users u WHERE u.role = 'client' ORDER BY u.plan_active DESC, spent DESC`
    )
    .all(month, month, month);

  // クリエイターごとの状況
  const creators = db
    .prepare(
      `SELECT u.id, u.name, u.last_seen_at,
              (SELECT COUNT(*) FROM projects p WHERE p.assignee_id = u.id AND p.status IN ('制作待ち', 'フィードバック')) AS active,
              (SELECT COUNT(*) FROM deliverables d WHERE d.user_id = u.id AND d.kind = '提出' AND substr(d.created_at, 1, 7) = ?) AS submissions,
              (SELECT COUNT(*) FROM deliverables d WHERE d.user_id = u.id AND d.kind = '提出' AND d.status = '検収OK' AND substr(d.created_at, 1, 7) = ?) AS accepted,
              (SELECT COUNT(*) FROM deliverables d WHERE d.user_id = u.id AND d.kind = '提出' AND d.status = '修正依頼') AS revising
         FROM users u WHERE u.role = 'freelancer' ORDER BY submissions DESC`
    )
    .all(month, month);

  return NextResponse.json({ month, totals: { ...totals, honeySpent: honey.spent, ai, contracts }, clients, creators });
}
