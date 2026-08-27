import fs from "fs";
import path from "path";
import { DATA_DIR, getDb } from "./db";

/**
 * 参考動画のサムネイル置き場。
 *
 * TikTokのサムネイルURLは署名付きで、時間が経つと期限切れになり画像が出なくなる。
 * そこで一度取得した画像を自分のディスクに保存し、以降はそこから配る。
 * 期限切れだった場合は oEmbed で最新のURLを取り直して自己修復する。
 */
export const THUMB_DIR = path.join(DATA_DIR, "thumbs");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export function ensureThumbDir() {
  if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });
}

function filePathFor(id: string) {
  return path.join(THUMB_DIR, `${id}.jpg`);
}

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

/**
 * 同じ画像を同時に何度も取りに行かないための待ち合わせ表。
 * 一覧は30枚を一斉に要求するので、これが無いと同じoEmbedを何度も叩いてしまう。
 */
const inFlight = new Map<string, Promise<Buffer | null>>();

export function getThumbnail(videoId: string): Promise<Buffer | null> {
  const running = inFlight.get(videoId);
  if (running) return running;
  const task = fetchThumbnail(videoId).finally(() => inFlight.delete(videoId));
  inFlight.set(videoId, task);
  return task;
}

/**
 * サムネイル画像を返す。無ければ取りに行き、保存してから返す。
 * 取れなかった場合は null（呼び出し側で代替表示にする）。
 */
async function fetchThumbnail(videoId: string): Promise<Buffer | null> {
  ensureThumbDir();
  const cached = filePathFor(videoId);
  if (fs.existsSync(cached)) {
    try {
      return fs.readFileSync(cached);
    } catch {
      // 壊れていたら取り直す
    }
  }

  const db = getDb();
  const row = db
    .prepare("SELECT id, url, thumbnail FROM ref_videos WHERE id = ?")
    .get(videoId) as { id: string; url: string; thumbnail: string } | undefined;
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

  try {
    fs.writeFileSync(cached, buf);
  } catch {
    // 保存に失敗しても画像は返す
  }
  return buf;
}

/**
 * 1アカウント分のサムネイルを先に温めておく。
 * 画面を開いた時点で走らせておくと、利用者が見るころには自前のディスクから出せる。
 * 待たせないように呼び出し側では await しない。
 */
export function warmAccountThumbnails(accountId: string) {
  const rows = getDb()
    .prepare("SELECT id FROM ref_videos WHERE account_id = ?")
    .all(accountId) as { id: string }[];

  let i = 0;
  const CONCURRENCY = 4;
  const next = async (): Promise<void> => {
    const row = rows[i++];
    if (!row) return;
    const file = filePathFor(row.id);
    if (!fs.existsSync(file)) {
      try {
        await getThumbnail(row.id);
      } catch {
        // 1枚失敗しても続ける
      }
    }
    return next();
  };
  for (let n = 0; n < CONCURRENCY; n++) void next();
}
