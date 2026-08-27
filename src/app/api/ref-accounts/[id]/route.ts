import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { warmAccountThumbnails } from "@/lib/server/thumbs";

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
  // 画面が表示されるあいだにサムネイルを取りに行かせる（応答は待たせない）
  warmAccountThumbnails(id);

  return NextResponse.json({ ...account, videos });
}
