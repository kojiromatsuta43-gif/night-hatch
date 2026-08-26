import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // オンライン表示のため最終アクセス時刻を記録する
  getDb().prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").run(user.id);
  return NextResponse.json(user);
}
