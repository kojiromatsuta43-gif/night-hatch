/**
 * 公開サイト「Night HATCH -ナイト・ハッチ-」の掲載情報（listings）と、公式LINEボタンのクリック数（listing_clicks）。
 *
 * 公開の条件は3つ: お店が同意（store_opt_in）・運営が公開（admin_published）・公式LINEのURLがある。
 * サイトはこのテーブルと ref_videos（TikTok取り込み）を毎回読むので、ツール側で直せばすぐサイトに出る。
 */
import crypto from "crypto";
import { getDb } from "./db";
import { canonicalArea, findArea } from "../nightAreas";
import {
  GENRES, MAX_PHOTOS, MAX_TIKTOK_URLS, PREFECTURES, isLineUrl, isValidSlug, listingStatus, normalizeHandle, tiktokVideoId,
  type Listing,
} from "../listing";

type Row = Omit<Listing, "tiktok_urls" | "photos"> & { tiktok_urls: string; photos: string };

function parseArr(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function toListing(r: Row): Listing {
  return { ...r, tiktok_urls: parseArr(r.tiktok_urls), photos: parseArr(r.photos) };
}

/** 日本時間で今月 */
const THIS_MONTH = "strftime('%Y-%m', c.created_at, '+9 hours') = strftime('%Y-%m', 'now', '+9 hours')";

/** 公開中の条件（SQL） */
const PUBLIC_WHERE = "l.store_opt_in = 1 AND l.admin_published = 1 AND l.line_url <> ''";

function isPublic(l: Listing) {
  return listingStatus(l) === "live";
}

// ─────────────── 社内確認用のデモ表示 ───────────────
// 管理画面「サイト掲載」で ON にすると、取り込んだ TikTok のお手本アカウントを「お店」としてサイトに並べる。
// 見られるのはログインしている人だけ（外の人・検索エンジンには出さない）。料金・求人・LINE は作らない（実在のお店なので）。
// 事業を始めるときに OFF にする。

export function siteDemoOn(): boolean {
  const r = getDb().prepare("SELECT value FROM app_meta WHERE key = 'site_demo'").get() as { value: string } | undefined;
  return r?.value === "1";
}

export function setSiteDemo(on: boolean) {
  getDb().prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('site_demo', ?)").run(on ? "1" : "0");
}

export const DEMO_SLUG_PREFIX = "demo-tt-";

type RefAccountRow = { id: string; handle: string; name: string; industry: string; bio: string; persona: string; followers: number; created_at: string; top_video: string | null };

function demoListingFrom(a: RefAccountRow): Listing {
  const h = a.handle.replace(/^@/, "");
  const persona = a.persona || "";
  // 「六本木のラウンジ公式」→ エリア「六本木」。辞書（nightAreas.ts）で当て、無ければ「の」の前
  const area = findArea(persona, a.name, a.bio)?.name ?? (persona.includes("の") ? persona.split("の")[0].slice(0, 12) : "");
  const hiring = /募集|求人|体入|採用/.test(`${a.bio}`) ? 1 : 0;
  return {
    id: `demo-${a.id}`,
    user_id: null,
    slug: `${DEMO_SLUG_PREFIX}${h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`,
    store_name: a.name || a.handle,
    genre: a.industry,
    prefecture: "",
    area,
    access: "",
    address: "",
    hours: "",
    holidays: "",
    catch_copy: persona,
    description: a.bio,
    price_system: "",
    recruit_hiring: hiring,
    recruit_trial_wage: "",
    recruit_wage: "",
    recruit_benefits: "",
    recruit_hours: "",
    recruit_message: "",
    line_url: "",
    phone: "",
    tiktok_handle: a.handle.startsWith("@") ? a.handle : `@${a.handle}`,
    tiktok_urls: [],
    // 写真の代わりに、いちばん再生された動画のサムネイルを表紙にする（StoreCover が "thumb:" を見分ける）
    photos: a.top_video ? [`thumb:${a.top_video}`] : [],
    store_opt_in: 0,
    agreed_at: null,
    admin_published: 0,
    published_at: a.created_at,
    created_at: a.created_at,
    updated_at: a.created_at,
  };
}

function demoListings(): Listing[] {
  const rows = getDb()
    .prepare(
      `SELECT a.id, a.handle, a.name, a.industry, a.bio, a.persona, a.followers, a.created_at,
              (SELECT v.id FROM ref_videos v WHERE v.account_id = a.id AND v.url <> '' ORDER BY v.views DESC LIMIT 1) AS top_video
         FROM ref_accounts a
        WHERE a.source = 'apify' AND a.classified_at <> ''
          AND EXISTS (SELECT 1 FROM ref_videos v WHERE v.account_id = a.id AND v.url <> '')
        ORDER BY a.followers DESC`
    )
    .all() as RefAccountRow[];
  return rows.map(demoListingFrom);
}

export const isDemoListing = (l: Pick<Listing, "id">) => l.id.startsWith("demo-");

// ─────────────── お店側 ───────────────

function newSlug(db: ReturnType<typeof getDb>, handle: string): string {
  const base = handle.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  const taken = db.prepare("SELECT 1 FROM listings WHERE slug = ?");
  if (base.length >= 3 && isValidSlug(base) && !taken.get(base)) return base;
  for (;;) {
    const s = `store-${crypto.randomBytes(3).toString("hex")}`;
    if (!taken.get(s)) return s;
  }
}

/** お店の掲載情報。無ければ下書きを作って返す */
export function getOrCreateListingForUser(userId: string): Listing {
  const db = getDb();
  const row = db.prepare("SELECT * FROM listings WHERE user_id = ?").get(userId) as Row | undefined;
  if (row) return toListing(row);
  const user = db.prepare("SELECT name, tiktok_handle FROM users WHERE id = ?").get(userId) as { name: string; tiktok_handle: string } | undefined;
  const handle = normalizeHandle(user?.tiktok_handle ?? "");
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO listings (id, user_id, slug, store_name, tiktok_handle) VALUES (?, ?, ?, ?, ?)").run(
    id, userId, newSlug(db, handle), user?.name ?? "", handle
  );
  return toListing(db.prepare("SELECT * FROM listings WHERE id = ?").get(id) as Row);
}

const TEXT_LIMITS: Record<string, number> = {
  store_name: 60, genre: 20, prefecture: 10, area: 40, access: 120, address: 160, hours: 120, holidays: 80,
  catch_copy: 60, description: 1200, price_system: 1500,
  recruit_trial_wage: 80, recruit_wage: 160, recruit_benefits: 400, recruit_hours: 160, recruit_message: 600,
  line_url: 300, phone: 20,
};

export type ListingInput = Partial<Record<keyof typeof TEXT_LIMITS, string>> & {
  recruit_hiring?: boolean;
  tiktok_handle?: string;
  tiktok_urls?: string[];
  photos?: string[];
  store_opt_in?: boolean;
};

/**
 * お店が保存したときの更新。入力を整えて返す。問題があればエラー文を投げる。
 * 同意（store_opt_in）を付けるには、店名・業態・エリア・公式LINE が必要。
 */
export function saveListingFromStore(userId: string, input: ListingInput): Listing {
  const db = getDb();
  const cur = getOrCreateListingForUser(userId);
  const next: Record<string, string | number | null> = {};

  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    const v = input[key as keyof typeof TEXT_LIMITS];
    if (typeof v === "string") next[key] = v.trim().slice(0, max);
  }
  if (typeof next.genre === "string" && next.genre && !GENRES.includes(next.genre)) throw new Error("業態を選んでください");
  if (typeof next.prefecture === "string" && next.prefecture && !PREFECTURES.includes(next.prefecture)) next.prefecture = "その他";
  if (typeof next.line_url === "string" && next.line_url && !isLineUrl(next.line_url)) {
    throw new Error("公式LINEのURLは https://lin.ee/… か https://line.me/… の形で入れてください");
  }
  if (typeof next.phone === "string" && next.phone && !/^[0-9０-９+\-() ]{8,20}$/.test(next.phone)) throw new Error("電話番号の形が正しくありません");
  if (typeof input.recruit_hiring === "boolean") next.recruit_hiring = input.recruit_hiring ? 1 : 0;

  if (typeof input.tiktok_handle === "string") {
    const h = normalizeHandle(input.tiktok_handle);
    if (input.tiktok_handle.trim() && !h) throw new Error("TikTokのアカウントは @から始まるID（英数字・._）で入れてください");
    next.tiktok_handle = h;
  }
  if (Array.isArray(input.tiktok_urls)) {
    const urls = Array.from(new Set(input.tiktok_urls.map((u) => String(u).trim()).filter(Boolean)));
    const bad = urls.find((u) => !tiktokVideoId(u));
    if (bad) throw new Error(`TikTok動画のURLの形が違います: ${bad.slice(0, 60)}（https://www.tiktok.com/@…/video/… の形）`);
    if (urls.length > MAX_TIKTOK_URLS) throw new Error(`TikTok動画のURLは${MAX_TIKTOK_URLS}本までです`);
    next.tiktok_urls = JSON.stringify(urls);
  }
  if (Array.isArray(input.photos)) {
    const ids = Array.from(new Set(input.photos.map(String))).slice(0, MAX_PHOTOS);
    // 自分がアップロードした画像だけ
    const own = db.prepare("SELECT id FROM uploads WHERE id = ? AND user_id = ? AND mime LIKE 'image/%'");
    next.photos = JSON.stringify(ids.filter((id) => own.get(id, userId)));
  }

  const merged = { ...cur, ...next } as unknown as Row;
  if (typeof input.store_opt_in === "boolean") {
    if (input.store_opt_in) {
      const missing = [
        !merged.store_name && "店名",
        !merged.genre && "業態",
        !merged.area && "エリア",
        !isLineUrl(merged.line_url) && "公式LINEのURL",
      ].filter(Boolean);
      if (missing.length) throw new Error(`掲載に同意するには ${missing.join("・")} を入れてください`);
      next.store_opt_in = 1;
      if (!cur.store_opt_in) next.agreed_at = new Date().toISOString();
    } else {
      next.store_opt_in = 0;
    }
  }

  const keys = Object.keys(next);
  if (keys.length > 0) {
    db.prepare(`UPDATE listings SET ${keys.map((k) => `${k} = @${k}`).join(", ")}, updated_at = datetime('now') WHERE id = @__id`).run({
      ...next,
      __id: cur.id,
    });
  }
  const saved = toListing(db.prepare("SELECT * FROM listings WHERE id = ?").get(cur.id) as Row);
  ensureTikTokImport(saved);
  return saved;
}

// ─────────────── 運営（管理画面） ───────────────

export type AdminListingRow = Listing & {
  owner_name: string | null;
  owner_email: string | null;
  clicks_drink: number;
  clicks_work: number;
  video_count: number;
};

export function listAllListings(): AdminListingRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT l.*, u.name AS owner_name, u.email AS owner_email,
              (SELECT COUNT(*) FROM listing_clicks c WHERE c.listing_id = l.id AND c.kind = 'drink' AND ${THIS_MONTH}) AS clicks_drink,
              (SELECT COUNT(*) FROM listing_clicks c WHERE c.listing_id = l.id AND c.kind = 'work' AND ${THIS_MONTH}) AS clicks_work
         FROM listings l LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.admin_published DESC, l.store_opt_in DESC, l.updated_at DESC`
    )
    .all() as (Row & { owner_name: string | null; owner_email: string | null; clicks_drink: number; clicks_work: number })[];
  return rows.map((r) => {
    const l = toListing(r);
    return { ...r, ...l, video_count: refVideosFor(l.tiktok_handle, 99).length };
  });
}

export function adminUpdateListing(id: string, patch: { admin_published?: boolean; slug?: string }): Listing {
  const db = getDb();
  const row = db.prepare("SELECT * FROM listings WHERE id = ?").get(id) as Row | undefined;
  if (!row) throw new Error("掲載が見つかりません");
  if (typeof patch.slug === "string") {
    const slug = patch.slug.trim().toLowerCase();
    if (!isValidSlug(slug)) throw new Error("URL名は英小文字・数字・ハイフンの3〜40文字にしてください（先頭と最後は英数字）");
    const dup = db.prepare("SELECT id FROM listings WHERE slug = ? AND id <> ?").get(slug, id);
    if (dup) throw new Error(`「${slug}」はほかのお店が使っています`);
    db.prepare("UPDATE listings SET slug = ?, updated_at = datetime('now') WHERE id = ?").run(slug, id);
  }
  if (typeof patch.admin_published === "boolean") {
    if (patch.admin_published) {
      const l = toListing(row);
      if (!l.store_opt_in) throw new Error("お店がまだ掲載に同意していません");
      if (!isLineUrl(l.line_url)) throw new Error("公式LINEのURLが入っていません");
    }
    db.prepare(
      `UPDATE listings SET admin_published = ?, published_at = CASE WHEN ? = 1 THEN COALESCE(published_at, datetime('now')) ELSE published_at END WHERE id = ?`
    ).run(patch.admin_published ? 1 : 0, patch.admin_published ? 1 : 0, id);
  }
  const saved = toListing(db.prepare("SELECT * FROM listings WHERE id = ?").get(id) as Row);
  ensureTikTokImport(saved);
  return saved;
}

/**
 * 公開中で TikTok の @ハンドルがあるお店は、TikTok取り込みの設定（profile）に足す。
 * これで週1回の自動取り込みでお店自身の動画が ref_videos に入り、サイトに出る。
 */
function ensureTikTokImport(l: Listing) {
  if (!isPublic(l) || !l.tiktok_handle) return;
  getDb()
    .prepare("INSERT OR IGNORE INTO tiktok_queries (id, kind, value, industry) VALUES (?, 'profile', ?, ?)")
    .run(crypto.randomUUID(), l.tiktok_handle, l.genre || "");
}

// ─────────────── 公開サイト ───────────────

export type PublicFilter = { genre?: string; area?: string; hiring?: boolean; demo?: boolean };

export function publicListings(f: PublicFilter = {}): Listing[] {
  const db = getDb();
  const where = [PUBLIC_WHERE];
  const args: string[] = [];
  if (f.genre && GENRES.includes(f.genre)) {
    where.push("l.genre = ?");
    args.push(f.genre);
  }
  if (f.hiring) where.push("l.recruit_hiring = 1");
  const rows = db
    .prepare(`SELECT l.* FROM listings l WHERE ${where.join(" AND ")} ORDER BY COALESCE(l.published_at, l.updated_at) DESC`)
    .all(...args) as Row[];
  // エリアは自由入力なので、辞書で正式名にそろえてから比べる（「札幌すすきの」も「すすきの」で当たる）
  const inArea = (l: Listing) => !f.area || l.area === f.area || l.prefecture === f.area || canonicalArea(l.area) === f.area;
  const real = rows.map(toListing).filter(inArea);
  if (!f.demo) return real;
  const demo = demoListings().filter((l) => (!f.genre || l.genre === f.genre) && inArea(l) && (!f.hiring || l.recruit_hiring));
  return [...real, ...demo];
}

/** 地図用: エリアごとの件数（飲みに行く＝全店、働く＝求人中） */
export function areaStats(demo = false): { area: string; drink: number; work: number }[] {
  const m = new Map<string, { drink: number; work: number }>();
  for (const l of publicListings({ demo })) {
    const a = canonicalArea(l.area);
    if (!a) continue;
    const c = m.get(a) ?? { drink: 0, work: 0 };
    c.drink++;
    if (l.recruit_hiring) c.work++;
    m.set(a, c);
  }
  return Array.from(m, ([area, c]) => ({ area, ...c }));
}

/** 公開中のお店があるエリア（件数つき）。検索の選択肢に使う */
export function publicAreas(demo = false): { area: string; count: number }[] {
  return areaStats(demo)
    .map((a) => ({ area: a.area, count: a.drink }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
}

/**
 * slug で1件。公開中でなければ null。
 * previewUserId を渡すと、そのお店の持ち主（または管理者）には公開前でも返す（プレビュー用）。
 */
export function listingBySlug(slug: string, preview?: { userId: string; role: string }, demo = false): Listing | null {
  if (slug.startsWith(DEMO_SLUG_PREFIX)) return demo ? demoListings().find((l) => l.slug === slug) ?? null : null;
  const row = getDb().prepare("SELECT * FROM listings WHERE slug = ?").get(slug) as Row | undefined;
  if (!row) return null;
  const l = toListing(row);
  if (isPublic(l)) return l;
  if (preview && (preview.role === "admin" || preview.userId === l.user_id)) return l;
  return null;
}

// ─────────────── 動画 ───────────────

export type SiteVideo = {
  key: string;
  tiktokId: string;
  url: string;
  caption: string;
  views: number;
  /** サムネイルのURL（無ければ null） */
  thumb: string | null;
};

function refVideosFor(handle: string, limit: number): SiteVideo[] {
  if (!handle) return [];
  const rows = getDb()
    .prepare(
      `SELECT v.id, v.url, v.caption, v.views FROM ref_videos v JOIN ref_accounts a ON a.id = v.account_id
        WHERE lower(a.handle) = lower(?) AND v.url <> '' ORDER BY v.views DESC LIMIT ?`
    )
    .all(handle, limit) as { id: string; url: string; caption: string; views: number }[];
  return rows
    .map((r) => ({ key: `r-${r.id}`, tiktokId: tiktokVideoId(r.url) ?? "", url: r.url, caption: r.caption, views: r.views, thumb: `/api/site/thumbs/${r.id}` }))
    .filter((v) => v.tiktokId);
}

/** お店の動画: 取り込み済みの自店アカウントの動画（再生数の多い順・最大6本）＋手入力のURL */
export function videosForListing(l: Listing): SiteVideo[] {
  const fromRef = refVideosFor(l.tiktok_handle, 6);
  const seen = new Set(fromRef.map((v) => v.tiktokId));
  const manual: SiteVideo[] = [];
  for (const url of l.tiktok_urls) {
    const id = tiktokVideoId(url);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    manual.push({ key: `u-${id}`, tiktokId: id, url, caption: "", views: 0, thumb: `/api/site/tiktok-thumbs/${id}` });
  }
  return [...manual, ...fromRef];
}

/** トップの「今週の動画」: 公開中のお店の動画から、ここ1週間の投稿を優先して再生数順 */
export function weeklyVideos(limit = 8, demo = false): (SiteVideo & { store: Pick<Listing, "slug" | "store_name" | "genre" | "area"> })[] {
  const db = getDb();
  const stores = publicListings({ demo });
  const byHandle = new Map(stores.filter((s) => s.tiktok_handle).map((s) => [s.tiktok_handle.toLowerCase(), s]));
  const out: (SiteVideo & { store: Pick<Listing, "slug" | "store_name" | "genre" | "area"> })[] = [];
  if (byHandle.size > 0) {
    const rows = db
      .prepare(
        `SELECT v.id, v.url, v.caption, v.views, lower(a.handle) AS handle FROM ref_videos v JOIN ref_accounts a ON a.id = v.account_id
          WHERE lower(a.handle) IN (${Array.from(byHandle.keys()).map(() => "?").join(",")}) AND v.url <> ''
          ORDER BY CASE WHEN v.posted_at >= ? THEN 0 ELSE 1 END, v.views DESC LIMIT ?`
      )
      .all(...byHandle.keys(), new Date(Date.now() - 7 * 86400000).toISOString(), limit) as { id: string; url: string; caption: string; views: number; handle: string }[];
    for (const r of rows) {
      const id = tiktokVideoId(r.url);
      const s = byHandle.get(r.handle);
      if (!id || !s) continue;
      out.push({ key: `r-${r.id}`, tiktokId: id, url: r.url, caption: r.caption, views: r.views, thumb: `/api/site/thumbs/${r.id}`, store: s });
    }
  }
  // 足りなければ手入力の動画で埋める（新しく掲載されたお店から）
  for (const s of stores) {
    if (out.length >= limit) break;
    for (const url of s.tiktok_urls) {
      if (out.length >= limit) break;
      const id = tiktokVideoId(url);
      if (!id || out.some((v) => v.tiktokId === id)) continue;
      out.push({ key: `u-${id}`, tiktokId: id, url, caption: "", views: 0, thumb: `/api/site/tiktok-thumbs/${id}`, store: s });
    }
  }
  return out;
}

/** 公開中のお店の取り込み動画か（サムネイルを誰にでも出してよいか） */
export function isPublicRefVideo(refVideoId: string, demo = false): boolean {
  if (demo) {
    const hit = getDb()
      .prepare("SELECT 1 FROM ref_videos v JOIN ref_accounts a ON a.id = v.account_id WHERE v.id = ? AND a.source = 'apify' AND a.classified_at <> ''")
      .get(refVideoId);
    if (hit) return true;
  }
  const row = getDb()
    .prepare(
      `SELECT 1 FROM ref_videos v JOIN ref_accounts a ON a.id = v.account_id
        JOIN listings l ON lower(l.tiktok_handle) = lower(a.handle) AND l.tiktok_handle <> ''
        WHERE v.id = ? AND ${PUBLIC_WHERE}`
    )
    .get(refVideoId);
  return Boolean(row);
}

/** 公開中のお店が手入力した TikTok 動画か。そうなら URL を返す */
export function publicManualVideoUrl(tiktokId: string): string | null {
  const rows = getDb()
    .prepare(`SELECT l.tiktok_urls FROM listings l WHERE ${PUBLIC_WHERE} AND l.tiktok_urls LIKE ?`)
    .all(`%${tiktokId}%`) as { tiktok_urls: string }[];
  for (const r of rows) {
    const hit = parseArr(r.tiktok_urls).find((u) => tiktokVideoId(u) === tiktokId);
    if (hit) return hit;
  }
  return null;
}

/**
 * 写真を誰に見せてよいか。公開中のお店の写真なら誰でも。
 * そうでなければ、そのお店の持ち主か管理者だけ（プレビュー用）。
 */
export function canSeePhoto(uploadId: string, viewer?: { id: string; role: string } | null): boolean {
  const rows = getDb().prepare("SELECT l.* FROM listings l WHERE l.photos LIKE ?").all(`%${uploadId}%`) as Row[];
  for (const r of rows) {
    const l = toListing(r);
    if (!l.photos.includes(uploadId)) continue;
    if (isPublic(l)) return true;
    if (viewer && (viewer.role === "admin" || viewer.id === l.user_id)) return true;
  }
  return false;
}

// ─────────────── クリック数 ───────────────

export function recordClick(slug: string, kind: "drink" | "work"): boolean {
  const db = getDb();
  const row = db.prepare(`SELECT l.id FROM listings l WHERE l.slug = ? AND ${PUBLIC_WHERE}`).get(slug) as { id: string } | undefined;
  if (!row) return false;
  db.prepare("INSERT INTO listing_clicks (listing_id, kind) VALUES (?, ?)").run(row.id, kind);
  return true;
}

export function clicksThisMonth(listingId: string): { drink: number; work: number } {
  const rows = getDb()
    .prepare(`SELECT c.kind, COUNT(*) AS n FROM listing_clicks c WHERE c.listing_id = ? AND ${THIS_MONTH} GROUP BY c.kind`)
    .all(listingId) as { kind: string; n: number }[];
  const get = (k: string) => rows.find((r) => r.kind === k)?.n ?? 0;
  return { drink: get("drink"), work: get("work") };
}
