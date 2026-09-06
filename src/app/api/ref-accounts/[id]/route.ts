import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { warmAccountThumbnails } from "@/lib/server/thumbs";
import { viewGrowth7d } from "@/lib/server/tiktok";

// 1アカウント分の動画のみを返す（一覧を軽くするため分離）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const db = getDb();
  const account = db.prepare("SELECT * FROM ref_accounts WHERE id = ?").get(id);
  if (!account) return NextResponse.json({ error: "not found" }, { status: 404 });
  const rows = db
    .prepare("SELECT * FROM ref_videos WHERE account_id = ? ORDER BY views DESC, created_at ASC")
    .all(id) as { id: string }[];
  const growth = viewGrowth7d(rows.map((r) => r.id));
  const videos = rows.map((r) => ({ ...r, growth: growth.get(r.id) ?? 0 }));
  // 画面が表示されるあいだにサムネイルを取りに行かせる（応答は待たせない）
  warmAccountThumbnails(id);

  return NextResponse.json({ ...account, videos });
}

/** 管理者だけ: 参考アカウントを動画ごと削除する（お手本にふさわしくないアカウントの掃除用） */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM ref_videos WHERE account_id = ?").run(id);
    const r = db.prepare("DELETE FROM ref_accounts WHERE id = ?").run(id);
    return r.changes;
  });
  const changes = tx();
  return NextResponse.json({ ok: true, deleted: changes });
}
