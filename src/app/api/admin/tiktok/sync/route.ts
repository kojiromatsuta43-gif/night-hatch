import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { runTikTokSync, NoApifyTokenError, isSyncing, isTikTokSyncConfigured } from "@/lib/server/tiktok";

// 取り込みは数分かかるので、ここでは開始だけして先に返す。進み具合は GET /api/admin/tiktok で見る
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (isSyncing()) return NextResponse.json({ error: "取り込みを実行中です" }, { status: 409 });
  const b = await req.json().catch(() => ({}));
  const ids = Array.isArray(b.queryIds) ? (b.queryIds as string[]) : undefined;
  if (!isTikTokSyncConfigured()) return NextResponse.json({ error: new NoApifyTokenError().message }, { status: 503 });
  const active = (getDb().prepare("SELECT COUNT(*) AS c FROM tiktok_queries WHERE active = 1").get() as { c: number }).c;
  if (active === 0) return NextResponse.json({ error: "取り込む設定がありません。@ハンドルか検索ワードを登録してください。" }, { status: 400 });
  // 呼び出し元を待たせず裏で走らせる（結果は tiktok_sync_runs に残り、管理画面で見える）
  runTikTokSync(ids).catch((e) => console.error("[tiktok sync]", e instanceof Error ? e.message : e));
  return NextResponse.json({ started: true });
}
