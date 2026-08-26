import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/**
 * フリーランス向けの「お仕事をさがす」一覧。
 * ・自分に指名された案件（先に出す）
 * ・担当者がまだ決まっていない募集中の案件（公募）
 */
export async function GET() {
  const user = await requireUser();
  if (user.role !== "freelancer" && user.role !== "admin") {
    return NextResponse.json({ error: "この画面はフリーランス専用です" }, { status: 403 });
  }
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.title, p.category, p.description, p.deadline, p.requested_on,
              p.assignee_id, u.name AS owner_name,
              CASE WHEN p.assignee_id = ? THEN 1 ELSE 0 END AS nominated
       FROM projects p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.status = '募集中'
         AND (p.assignee_id IS NULL OR p.assignee_id = ?)
       ORDER BY nominated DESC, p.deadline`
    )
    .all(user.id, user.id);
  return NextResponse.json(rows);
}
