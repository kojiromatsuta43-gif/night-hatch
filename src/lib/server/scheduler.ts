import { getDb } from "./db";
import { isTikTokSyncConfigured, runTikTokSync } from "./tiktok";
import { warmMissingImages, pendingCount, shrinkOversizedCache } from "./thumbs";
import { purgeOldChatVideos } from "./uploads";

/**
 * TikTok の参考動画を定期的に自動で取り込む。
 * サーバー起動時に instrumentation.ts から start() が呼ばれ、30分ごとに「そろそろか」を見る。
 * 間隔は TIKTOK_SYNC_INTERVAL_DAYS 日（既定 7日）、実行時刻は日本時間 TIKTOK_SYNC_HOUR 時（既定 4時）以降。
 * 費用の目安: 設定33件×20本=660本/回 ≒ 1.1ドル。週1回なら月5ドルの無料枠に収まる。毎日にするなら有料プランが要る。
 * TIKTOK_AUTO_SYNC=off で止められる。
 */
let started = false;

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}

/** 期限切れのチャット動画を1日1回消す */
function purge() {
  try {
    const db = getDb();
    const today = jstNow().toISOString().slice(0, 10);
    const last = (db.prepare("SELECT value FROM app_meta WHERE key = 'chat_video_purge_day'").get() as { value: string } | undefined)?.value;
    if (last === today) return;
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('chat_video_purge_day', ?)").run(today);
    const r = purgeOldChatVideos();
    if (r.removed > 0) console.log(`[chat video purge] ${r.removed} files, ${Math.round(r.bytes / 1024 / 1024)}MB`);
  } catch (e) {
    console.error("[chat video purge]", e instanceof Error ? e.message : e);
  }
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
    const intervalDays = Math.max(1, Number(process.env.TIKTOK_SYNC_INTERVAL_DAYS ?? 7));
    const last = (db.prepare("SELECT value FROM app_meta WHERE key = 'tiktok_auto_day'").get() as { value: string } | undefined)?.value;
    if (last) {
      const elapsed = (new Date(today).getTime() - new Date(last).getTime()) / 86400000;
      if (elapsed < intervalDays) return;
    } else {
      // 初回は手動の取り込み日を起点にする（入れた直後にもう一度回さない）
      const lastSync = (db.prepare("SELECT value FROM app_meta WHERE key = 'tiktok_last_sync_at'").get() as { value: string } | undefined)?.value;
      if (lastSync && (Date.now() - new Date(lastSync).getTime()) / 86400000 < intervalDays) return;
    }
    const count = (db.prepare("SELECT COUNT(*) AS c FROM tiktok_queries WHERE active = 1").get() as { c: number }).c;
    if (count === 0) return;
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('tiktok_auto_day', ?)").run(today);
    await runTikTokSync();
  } catch (e) {
    console.error("[tiktok auto sync]", e instanceof Error ? e.message : e);
  }
}

/** まだ無いサムネイル・アイコンを少しずつ裏で取りに行く（起動直後と5分ごと） */
function warm() {
  try {
    // 以前に原寸で保存した画像があれば縮小し直す（数百枚ずつ）
    void shrinkOversizedCache(300).catch(() => {});
    if (pendingCount() > 50) return; // 前の分がまだ残っていれば待つ
    warmMissingImages(600);
  } catch (e) {
    console.error("[thumbs warm]", e instanceof Error ? e.message : e);
  }
}

export function start() {
  if (started) return;
  started = true;
  // 起動直後は少し待ってから（DB初期化と重ならないように）
  setTimeout(() => void tick(), 60_000);
  setInterval(() => void tick(), 30 * 60_000);
  setTimeout(purge, 90_000);
  setInterval(purge, 60 * 60_000);
  setTimeout(warm, 20_000);
  setInterval(warm, 5 * 60_000);
}
