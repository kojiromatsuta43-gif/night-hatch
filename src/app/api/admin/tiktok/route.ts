import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { isSyncing, isTikTokSyncConfigured, pruneImported } from "@/lib/server/tiktok";

/** 取り込み設定の一覧と状態（管理者のみ） */
export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = getDb();
  const queries = db.prepare("SELECT * FROM tiktok_queries ORDER BY industry, kind, created_at").all();
  const runs = db.prepare("SELECT * FROM tiktok_sync_runs ORDER BY started_at DESC LIMIT 10").all();
  const lastSync = (db.prepare("SELECT value FROM app_meta WHERE key = 'tiktok_last_sync_at'").get() as { value: string } | undefined)?.value ?? null;
  const totals = db.prepare("SELECT COUNT(*) AS videos, SUM(CASE WHEN source_id <> '' THEN 1 ELSE 0 END) AS synced FROM ref_videos").get();
  return NextResponse.json({ configured: isTikTokSyncConfigured(), syncing: isSyncing(), queries, runs, lastSync, totals });
}

/** 取り込み設定を追加。kind: profile | search | hashtag */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await req.json();
  if (b.action === "prune") {
    return NextResponse.json(pruneImported());
  }
  const kind = String(b.kind ?? "");
  const value = String(b.value ?? "").trim();
  const industry = String(b.industry ?? "").trim();
  if (!["profile", "search", "hashtag"].includes(kind)) return NextResponse.json({ error: "種類が不正です" }, { status: 400 });
  if (!value) return NextResponse.json({ error: "値を入力してください" }, { status: 400 });
  if (!industry) return NextResponse.json({ error: "業種を選んでください" }, { status: 400 });
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO tiktok_queries (id, kind, value, industry) VALUES (?, ?, ?, ?)
     ON CONFLICT(kind, value) DO UPDATE SET industry = excluded.industry, active = 1`
  ).run(id, kind, value, industry);
  return NextResponse.json({ ok: true });
}
