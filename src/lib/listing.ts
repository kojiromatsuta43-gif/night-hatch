/**
 * 公開サイト「Night HATCH -ナイト・ハッチ-」の掲載情報まわりで、画面とサーバーの両方が使うもの。
 * （DB に触る処理は src/lib/server/listings.ts）
 */
import { BRAND } from "./brand";

export const SITE_NAME = "Night HATCH";
export const SITE_SUB = "-ナイト・ハッチ-";
/** 運営会社名。決まったらここを書き換える */
export const SITE_OPERATOR = "[運営会社名]";
/** 掲載希望の店舗さま向けの問い合わせ先。決まったらここを書き換える（mailto: か LINE のURL） */
export const SITE_CONTACT_URL = "[問い合わせ先]";

/** 業態（ツールの業種と同じ） */
export const GENRES: string[] = BRAND.industries;

export const PREFECTURES = ["東京都", "神奈川県", "埼玉県", "千葉県", "大阪府", "京都府", "兵庫県", "愛知県", "福岡県", "北海道", "宮城県", "広島県", "沖縄県", "その他"];

/** 掲載の同意（お店が1つのチェックで3つ全部に同意する） */
export const LISTING_AGREEMENTS = [
  "Night HATCH のサイトに店舗情報・写真・TikTok動画を掲載することに同意します",
  "出演しているキャスト・スタッフ本人の掲載同意を得ています",
  "掲載する料金・待遇は実際の内容と一致させます",
];

export const MAX_PHOTOS = 6;
export const MAX_TIKTOK_URLS = 6;

export type ListingStatus = "draft" | "review" | "live";
export const STATUS_LABEL: Record<ListingStatus, string> = { draft: "下書き", review: "審査中", live: "掲載中" };

export type Listing = {
  id: string;
  user_id: string | null;
  slug: string;
  store_name: string;
  genre: string;
  prefecture: string;
  area: string;
  access: string;
  address: string;
  hours: string;
  holidays: string;
  catch_copy: string;
  description: string;
  price_system: string;
  recruit_hiring: number;
  recruit_trial_wage: string;
  recruit_wage: string;
  recruit_benefits: string;
  recruit_hours: string;
  recruit_message: string;
  line_url: string;
  phone: string;
  tiktok_handle: string;
  tiktok_urls: string[];
  photos: string[];
  store_opt_in: number;
  agreed_at: string | null;
  admin_published: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function listingStatus(l: Pick<Listing, "store_opt_in" | "admin_published" | "line_url">): ListingStatus {
  if (!l.store_opt_in || !isLineUrl(l.line_url)) return "draft";
  if (!l.admin_published) return "review";
  return "live";
}

/** 公式LINEのURLらしいか（lin.ee / line.me / page.line.me） */
export function isLineUrl(url: string): boolean {
  return /^https:\/\/(lin\.ee|line\.me|page\.line\.me|liff\.line\.me)\//i.test((url ?? "").trim());
}

/** TikTok の @ハンドルを「@handle」に揃える（URLを貼られても拾う）。空なら "" */
export function normalizeHandle(input: string): string {
  const h = (input ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.|m\.)?tiktok\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "");
  if (!/^[A-Za-z0-9._]{2,32}$/.test(h)) return "";
  return `@${h}`;
}

/** TikTok の動画URLから動画IDを取り出す */
export function tiktokVideoId(url: string): string | null {
  const m = (url ?? "").match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return m ? m[1] : null;
}

/** slug に使える形か（英小文字・数字・ハイフン、3〜40文字） */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug);
}

/** Googleマップの検索リンク（APIキー不要） */
export function mapsUrl(l: Pick<Listing, "address" | "store_name" | "area" | "access" | "prefecture">): string {
  const q = l.address ? `${l.address} ${l.store_name}` : `${l.store_name} ${l.area} ${l.access}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** 業態ごとの英字ラベル（サイトの飾り）と、写真が無いときの絵・色 */
export const GENRE_STYLE: Record<string, { en: string; illust: "glass" | "neon" | "bottle" | "champagne" | "mirrorball"; from: string; to: string }> = {
  バー: { en: "BAR", illust: "glass", from: "#2B1E33", to: "#4A2A2E" },
  ガールズバー: { en: "GIRLS BAR", illust: "neon", from: "#22183A", to: "#4B1F45" },
  スナック: { en: "SNACK", illust: "bottle", from: "#2A1C24", to: "#523026" },
  キャバクラ: { en: "CABARET CLUB", illust: "champagne", from: "#2E1426", to: "#5C1E3B" },
  ラウンジ: { en: "LOUNGE", illust: "mirrorball", from: "#1D1830", to: "#3E2A4C" },
  クラブ: { en: "MEMBERS CLUB", illust: "mirrorball", from: "#1A1522", to: "#3A2E22" },
  ホストクラブ: { en: "HOST CLUB", illust: "champagne", from: "#15182E", to: "#2E2150" },
};
export const genreStyle = (g: string) => GENRE_STYLE[g] ?? { en: "NIGHT", illust: "glass" as const, from: "#1D1726", to: "#3A2536" };

/** 「ラベル: 値」の行を分ける（料金システムを点線リーダーで並べるため）。分けられなければ label だけ */
export function splitPriceLine(line: string): { label: string; value: string } {
  const m = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
  if (m && m[1].length <= 24) return { label: m[1].trim(), value: m[2].trim() };
  return { label: line.trim(), value: "" };
}

/** 待遇の文字列をチップ用に分ける（「・」「、」「,」「/」改行区切り） */
export function splitBenefits(s: string): string[] {
  return (s ?? "").split(/[・、,，/／\n]+/).map((x) => x.trim()).filter(Boolean).slice(0, 16);
}
