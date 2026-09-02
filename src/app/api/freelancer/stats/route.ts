import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/** クリエイターの今月の実績（ダッシュボード用） */
export async function GET() {
  const user = await requireUser();
  const db = getDb();
  const month = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  const r = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN substr(created_at, 1, 7) = ? THEN 1 ELSE 0 END), 0) AS submissions,
         COALESCE(SUM(CASE WHEN substr(created_at, 1, 7) = ? AND status = '検収OK' THEN 1 ELSE 0 END), 0) AS accepted,
         COALESCE(SUM(CASE WHEN status = '修正依頼' THEN 1 ELSE 0 END), 0) AS revising
        FROM deliverables WHERE user_id = ? AND kind = '提出'`
    )
    .get(month, month, user.id) as { submissions: number; accepted: number; revising: number };
  return NextResponse.json({ month, ...r });
}
