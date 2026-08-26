import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/**
 * 指名できるフリーランス一覧。
 * 一度でも自社の案件を担当した人だけが指名の対象。
 * （初めての相手には公募で受注してもらい、実績ができてから指名する運用）
 */
export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.name, u.last_seen_at,
              SUM(CASE WHEN p.status = '完了' THEN 1 ELSE 0 END) AS done_count,
              COUNT(p.id) AS worked_count,
              MAX(p.deadline) AS last_deadline
       FROM users u
       JOIN projects p
         ON p.assignee_id = u.id AND p.user_id = ?
       WHERE u.role = 'freelancer'
       GROUP BY u.id
       ORDER BY done_count DESC, u.name`
    )
    .all(user.id);
  return NextResponse.json(rows);
}
