import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

// 1アカウント分の動画のみを返す（一覧を軽くするため分離）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const db = getDb();
  const account = db.prepare("SELECT * FROM ref_accounts WHERE id = ?").get(id);
  if (!account) return NextResponse.json({ error: "not found" }, { status: 404 });
  const videos = db
    .prepare("SELECT * FROM ref_videos WHERE account_id = ? ORDER BY created_at ASC")
    .all(id);
  return NextResponse.json({ ...account, videos });
}
