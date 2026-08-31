import { getDb } from "./db";
import { isTikTokSyncConfigured, runTikTokSync } from "./tiktok";

/**
 * 毎日1回、TikTok の参考動画を自動で取り込む。
 * サーバー起動時に instrumentation.ts から start() が呼ばれ、30分ごとに「今日の分をまだやっていないか」を見る。
 * 実行時刻は日本時間の TIKTOK_SYNC_HOUR 時（既定 4時）以降の最初のチェック。
 * TIKTOK_AUTO_SYNC=off で止められる。
 */
let started = false;

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}

async function tick() {
  try {
    if (!isTikTokSyncConfigured()) return;
    if ((process.env.TIKTOK_AUTO_SYNC ?? "on").toLowerCase() === "off") return;
    const hour = Number(process.env.TIKTOK_SYNC_HOUR ?? 4);
    const now = jstNow();
    if (now.getUTCHours() < hour) return;
    const today = now.toISOString().slice(0, 10);
    const db = getDb();
    const last = (db.prepare("SELECT value FROM app_meta WHERE key = 'tiktok_auto_day'").get() as { value: string } | undefined)?.value;
    if (last === today) return;
    const count = (db.prepare("SELECT COUNT(*) AS c FROM tiktok_queries WHERE active = 1").get() as { c: number }).c;
    if (count === 0) return;
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('tiktok_auto_day', ?)").run(today);
    await runTikTokSync();
  } catch (e) {
    console.error("[tiktok auto sync]", e instanceof Error ? e.message : e);
  }
}

export function start() {
  if (started) return;
  started = true;
  // 起動直後は少し待ってから（DB初期化と重ならないように）
  setTimeout(() => void tick(), 60_000);
  setInterval(() => void tick(), 30 * 60_000);
}
