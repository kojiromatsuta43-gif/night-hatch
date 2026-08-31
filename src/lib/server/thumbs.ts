import fs from "fs";
import path from "path";
import { DATA_DIR, getDb } from "./db";

/**
 * 参考動画のサムネイルとアカウントのアイコンの置き場。
 *
 * TikTokの画像URLは署名付きで、時間が経つと期限切れになり画像が出なくなる。
 * そこで一度取得した画像を縮小して自分のディスクに保存し、以降はそこから配る。
 *
 * 速さの考え方:
 *  - 画面からの要求では「ディスクにあるものだけ」を即返す。無ければ裏で取りに行く（画面を待たせない）
 *  - 取り込み直後と定期的に、まだ無い画像を裏でまとめて温めておく
 *  - 画像は縮小（サムネ 幅480 / アイコン 96px）して、一覧で何十枚出しても軽いようにする
 */
export const THUMB_DIR = path.join(DATA_DIR, "thumbs");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export function ensureThumbDir() {
  if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });
}

const thumbPath = (id: string) => path.join(THUMB_DIR, `${id}.jpg`);
const iconPath = (id: string) => path.join(THUMB_DIR, `icon-${id}.jpg`);

async function download(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/*,*/*;q=0.8", Referer: "https://www.tiktok.com/" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/** oEmbed から今使えるサムネイルURLを取り直す */
async function freshThumbUrl(videoUrl: string): Promise<string | null> {
  if (!videoUrl.includes("tiktok.com")) return null;
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const meta = await res.json();
    return typeof meta.thumbnail_url === "string" ? meta.thumbnail_url : null;
  } catch {
    return null;
  }
}

/** 縮小して JPEG にする。sharp が無い環境ではそのまま返す */
async function shrink(buf: Buffer, width: number): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buf).rotate().resize({ width, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  } catch {
    return buf;
  }
}

// ── 裏で取りに行く仕組み（同時に走らせる数を絞り、同じものを二重に取らない） ──
const inFlight = new Map<string, Promise<Buffer | null>>();
const queue: (() => Promise<void>)[] = [];
let running = 0;
const CONCURRENCY = 4;

function pump() {
  while (running < CONCURRENCY && queue.length > 0) {
    const job = queue.shift()!;
    running++;
    job().finally(() => {
      running--;
      pump();
    });
  }
}

function enqueue(key: string, work: () => Promise<Buffer | null>): Promise<Buffer | null> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = new Promise<Buffer | null>((resolve) => {
    queue.push(async () => {
      try {
        resolve(await work());
      } catch {
        resolve(null);
      }
    });
    pump();
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

export function pendingCount() {
  return queue.length + running;
}

// ── サムネイル ──
export function readCachedThumbnail(videoId: string): Buffer | null {
  try {
    return fs.readFileSync(thumbPath(videoId));
  } catch {
    return null;
  }
}

async function fetchAndStoreThumbnail(videoId: string): Promise<Buffer | null> {
  ensureThumbDir();
  const db = getDb();
  const row = db.prepare("SELECT id, url, thumbnail FROM ref_videos WHERE id = ?").get(videoId) as
    | { id: string; url: string; thumbnail: string }
    | undefined;
  if (!row) return null;

  // ①保存済みURLで試す ②だめなら oEmbed で取り直す
  let buf = await download(row.thumbnail);
  if (!buf) {
    const fresh = await freshThumbUrl(row.url);
    if (fresh) {
      buf = await download(fresh);
      if (buf) db.prepare("UPDATE ref_videos SET thumbnail = ? WHERE id = ?").run(fresh, videoId);
    }
  }
  if (!buf) return null;
  const small = await shrink(buf, 480);
  try {
    fs.writeFileSync(thumbPath(videoId), small);
  } catch {
    // 保存に失敗しても画像は返す
  }
  return small;
}

/** 裏で取りに行く（待たない）。すでにあれば何もしない */
export function queueThumbnail(videoId: string): Promise<Buffer | null> {
  if (fs.existsSync(thumbPath(videoId))) return Promise.resolve(readCachedThumbnail(videoId));
  return enqueue(`v:${videoId}`, () => fetchAndStoreThumbnail(videoId));
}

/** 画像を返す。無ければ取りに行って待つ（管理用途など、待ってよいときだけ） */
export function getThumbnail(videoId: string): Promise<Buffer | null> {
  return queueThumbnail(videoId);
}

// ── アカウントのアイコン ──
export function readCachedIcon(accountId: string): Buffer | null {
  try {
    return fs.readFileSync(iconPath(accountId));
  } catch {
    return null;
  }
}

async function fetchAndStoreIcon(accountId: string): Promise<Buffer | null> {
  ensureThumbDir();
  const row = getDb().prepare("SELECT icon_url FROM ref_accounts WHERE id = ?").get(accountId) as { icon_url: string } | undefined;
  if (!row?.icon_url) return null;
  const buf = await download(row.icon_url);
  if (!buf) return null;
  const small = await shrink(buf, 96);
  try {
    fs.writeFileSync(iconPath(accountId), small);
  } catch {
    // 保存に失敗しても画像は返す
  }
  return small;
}

export function queueIcon(accountId: string): Promise<Buffer | null> {
  if (fs.existsSync(iconPath(accountId))) return Promise.resolve(readCachedIcon(accountId));
  return enqueue(`a:${accountId}`, () => fetchAndStoreIcon(accountId));
}

// ── まとめて温める ──
/** 1アカウント分のサムネイルを先に温めておく（応答は待たせない） */
export function warmAccountThumbnails(accountId: string) {
  const rows = getDb().prepare("SELECT id FROM ref_videos WHERE account_id = ?").all(accountId) as { id: string }[];
  for (const r of rows) void queueThumbnail(r.id);
}

/**
 * まだディスクに無い画像を、再生数の多い順に最大 limit 件だけ裏で取りに行く。
 * 取り込み直後と、定期処理から呼ぶ。
 */
export function warmMissingImages(limit = 300): { thumbs: number; icons: number } {
  ensureThumbDir();
  const db = getDb();
  let thumbs = 0;
  let icons = 0;
  const videos = db.prepare("SELECT id FROM ref_videos ORDER BY views DESC, created_at DESC LIMIT 5000").all() as { id: string }[];
  for (const v of videos) {
    if (thumbs >= limit) break;
    if (fs.existsSync(thumbPath(v.id))) continue;
    void queueThumbnail(v.id);
    thumbs++;
  }
  const accounts = db.prepare("SELECT id FROM ref_accounts WHERE icon_url <> '' ORDER BY followers DESC").all() as { id: string }[];
  for (const a of accounts) {
    if (icons >= limit) break;
    if (fs.existsSync(iconPath(a.id))) continue;
    void queueIcon(a.id);
    icons++;
  }
  return { thumbs, icons };
}

/**
 * 以前に原寸のまま保存された画像を縮小し直す（1回の呼び出しで最大 limit 枚）。
 * 縮小の仕組みを入れる前に取った画像が数百KB〜数MBのまま残っているため。
 */
let shrinkCursor: string[] | null = null;
export async function shrinkOversizedCache(limit = 200): Promise<number> {
  ensureThumbDir();
  if (!shrinkCursor) {
    shrinkCursor = fs.readdirSync(THUMB_DIR).filter((f) => f.endsWith(".jpg"));
  }
  let done = 0;
  while (shrinkCursor.length > 0 && done < limit) {
    const f = shrinkCursor.shift()!;
    const full = path.join(THUMB_DIR, f);
    try {
      const st = fs.statSync(full);
      if (st.size <= 120 * 1024) continue;
      const buf = fs.readFileSync(full);
      const small = await shrink(buf, f.startsWith("icon-") ? 96 : 480);
      if (small.length < buf.length) fs.writeFileSync(full, small);
      done++;
    } catch {
      // 1枚失敗しても続ける
    }
  }
  return done;
}
