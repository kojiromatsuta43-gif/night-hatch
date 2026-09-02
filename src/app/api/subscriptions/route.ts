import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/** 月額メニューの自動継続の一覧と停止（本人のみ） */
export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare(
      "SELECT id, category, base_title, points, last_month, created_at FROM menu_subscriptions WHERE user_id = ? AND active = 1 ORDER BY created_at DESC"
    )
    .all(user.id);
  return NextResponse.json({ subscriptions: rows });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  getDb()
    .prepare("UPDATE menu_subscriptions SET active = 0 WHERE id = ? AND user_id = ?")
    .run(id, user.id);
  return NextResponse.json({ ok: true });
}
