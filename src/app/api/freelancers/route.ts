import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/**
 * 指名できるフリーランス一覧。
 * 「前回のあの人にまた頼みたい」に応えるため、自分の案件を完了させた実績がある人を先頭に出す。
 */
export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.name, u.last_seen_at,
              COUNT(p.id) AS done_count,
              MAX(p.deadline) AS last_deadline
       FROM users u
       LEFT JOIN projects p
         ON p.assignee_id = u.id AND p.user_id = ? AND p.status = '完了'
       WHERE u.role = 'freelancer'
       GROUP BY u.id
       ORDER BY done_count DESC, u.name`
    )
    .all(user.id);
  return NextResponse.json(rows);
}
