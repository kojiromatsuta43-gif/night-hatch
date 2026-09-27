import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { ensureSalesTables } from "@/lib/server/sales";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // オンライン表示のため最終アクセス時刻を記録する
  const db = getDb();
  db.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").run(user.id);
  // 営業リストのメニューは、営業系の案件やリストがある人にだけ見せる
  let hasSales = user.role === "admin";
  if (!hasSales) {
    // 新しいDB（初回起動）では営業リストの表がまだ無いので先に作る
    ensureSalesTables();
    const own = db.prepare("SELECT 1 FROM sales_leads WHERE user_id = ? LIMIT 1").get(user.id);
    const proj = db
      .prepare(
        "SELECT 1 FROM projects WHERE (user_id = ? OR assignee_id = ?) AND (category LIKE '%架電%' OR category LIKE '%テレアポ%' OR category LIKE '%営業%') LIMIT 1"
      )
      .get(user.id, user.id);
    hasSales = Boolean(own || proj);
  }
  return NextResponse.json({ ...user, hasSales });
}
