import { getDb } from "./db";
import { isTikTokSyncConfigured, runTikTokSync } from "./tiktok";
import { warmMissingImages, pendingCount, shrinkOversizedCache } from "./thumbs";
import { purgeOldChatVideos } from "./uploads";
import { runMonthlyGrants, runExpiry, jstMonth } from "./points-ledger";
import { consumeFromGrants } from "./points-ledger";
import crypto from "crypto";
import { notify } from "./notifications";

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

/**
 * ハニーPの月次処理（1日1回）。
 * ・契約中プランへ今月分を付与（月をまたいだ最初の実行で入る）
 * ・繰越期限を過ぎた付与を失効
 * ・月が変わったら、先月の月次レポートができたことをお客様へ通知
 */
function honey() {
  try {
    const db = getDb();
    const today = jstNow().toISOString().slice(0, 10);
    const last = (db.prepare("SELECT value FROM app_meta WHERE key = 'honey_daily_day'").get() as { value: string } | undefined)?.value;
    if (last === today) return;
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('honey_daily_day', ?)").run(today);
    const granted = runMonthlyGrants();
    const expired = runExpiry();
    if (granted || expired) console.log(`[honey] granted:${granted}users expired:${expired}pt`);
    renewMonthlyMenus();
    // 先月のレポート通知（クライアントに1回だけ）
    const month = jstMonth();
    const [y, m] = month.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
    const clients = db.prepare("SELECT id FROM users WHERE role = 'client'").all() as { id: string }[];
    for (const c of clients) {
      notify(c.id, {
        id: `report:${c.id}:${prev}`,
        kind: "report",
        title: `${Number(prev.slice(5))}月のレポートができました`,
        body: "今月作った本数・使ったハニー・動画の伸びをまとめました。",
        link: `/reports?month=${prev}`,
      });
    }
  } catch (e) {
    console.error("[honey daily]", e instanceof Error ? e.message : e);
  }
}

/**
 * 月額メニュー（HP保守・SNS運用など）の自動継続。
 * 月が変わったら、契約中の予約ごとに今月分の案件を作ってハニーPを引く。
 * 残高が足りない月はスキップして通知（月内に補充されれば翌日の実行で作られる）。
 */
function renewMonthlyMenus() {
  const db = getDb();
  const month = jstMonth();
  const monthNum = Number(month.slice(5));
  const subs = db
    .prepare("SELECT * FROM menu_subscriptions WHERE active = 1 AND last_month < ?")
    .all(month) as { id: string; user_id: string; category: string; base_title: string; detail: string | null; points: number }[];
  for (const sub of subs) {
    try {
      const u = db.prepare("SELECT points FROM users WHERE id = ?").get(sub.user_id) as { points: number } | undefined;
      if (!u) continue;
      if (u.points < sub.points) {
        notify(sub.user_id, {
          id: `subshort:${sub.id}:${month}`,
          kind: "points",
          title: `「${sub.base_title}」の継続にハニーPが足りません`,
          body: `今月分（${sub.points}pt）の残高が不足しています。チャージされしだい自動で継続します。`,
          link: "/points",
        });
        continue;
      }
      const title = `${sub.base_title}（${monthNum}月分）`;
      const deadline = new Date(Date.now() + 9 * 3600 * 1000);
      deadline.setUTCMonth(deadline.getUTCMonth() + 1, 0); // 月末
      const projectId = crypto.randomUUID();
      db.transaction(() => {
        db.prepare(
          "INSERT INTO projects (id, user_id, title, category, description, points, deadline, status, detail, requested_on) VALUES (?,?,?,?,?,?,?,'募集中',?,date('now'))"
        ).run(
          projectId, sub.user_id, title, sub.category,
          `月額メニューの自動継続（${monthNum}月分）`, sub.points,
          deadline.toISOString().slice(0, 10), sub.detail
        );
        db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(sub.points, sub.user_id);
        consumeFromGrants(db, sub.user_id, sub.points);
        db.prepare("INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?,?,?,'spend',?)").run(
          crypto.randomUUID(), sub.user_id, -sub.points, `月額メニュー継続: ${title}`
        );
        db.prepare("UPDATE menu_subscriptions SET last_month = ? WHERE id = ?").run(month, sub.id);
      })();
      notify(sub.user_id, {
        id: `subrenew:${sub.id}:${month}`,
        kind: "project",
        title: `「${sub.base_title}」の${monthNum}月分を継続しました`,
        body: `${sub.points}ptを使用。停止はハニーPのページからいつでもできます。`,
        link: `/projects/${projectId}`,
      });
    } catch (e) {
      console.error("[menu renew]", e instanceof Error ? e.message : e);
    }
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
  setTimeout(honey, 45_000);
  setInterval(honey, 60 * 60_000);
  setTimeout(warm, 20_000);
  setInterval(warm, 5 * 60_000);
}
