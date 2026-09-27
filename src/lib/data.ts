import { BRAND, CATALOG } from "./brand";

/**
 * 制作メニュー。中身は看板（BRIDGE / FOOD / NIGHT）ごとに src/lib/brands/ にある。
 * 営業資料の一覧と必ず一致させること（食い違うと商談で数字が合わなくなる）。
 */
export const CATEGORIES: readonly string[] = CATALOG.map((c) => c.name);

export const POINTS_BY_CATEGORY: Record<string, number> = Object.fromEntries(CATALOG.map((c) => [c.name, c.points]));

export const BRAND_NAME = BRAND.name;

/** 詳細ヒアリングの出し分けに使う */
export const SCRIPT_CATEGORIES: string[] = ["台本作成（ショート）", "台本作成（長尺）"];
export const VIDEO_CATEGORIES: string[] = ["ショート動画編集", "動画編集（3分）"];
export const isScriptCategory = (c: string) => SCRIPT_CATEGORIES.includes(c);
export const isVideoCategory = (c: string) => VIDEO_CATEGORIES.includes(c);

/** 発注トップや台本からの導線で使う既定カテゴリ */
export const DEFAULT_SCRIPT_CATEGORY = "台本作成（ショート）";
export const DEFAULT_VIDEO_CATEGORY = "ショート動画編集";

export const MEDIA_OPTIONS = ["TikTok", "Instagramリール", "YouTubeショート／本編", "LINE VOOM", "その他"];
export const DURATION_OPTIONS = ["15秒以内", "30秒以内", "1分以内", "3分以内", "指定なし"];
export const PURPOSE_OPTIONS = ["認知拡大", "サービス・商品購入", "LINE登録", "問い合わせ誘導", "信頼獲得", "エンタメ・共感", "ノウハウ提供", "その他"];
export const FORMAT_OPTIONS = ["会話形式（対話型）", "独白形式（ナレーション・解説）", "モノローグ＋字幕中心", "お客様の声（架空インタビュー）", "その他"];
export const TONE_OPTIONS = ["砕けた・フレンドリー", "信頼感・誠実系", "ストーリー仕立て（感動／ビフォーアフター）", "ウケ狙い・ユーモラス", "セールス・クロージング重視", "その他"];
export const ELEMENT_OPTIONS = ["問題提起 → 解決（フック重視）", "お客様の声・事例紹介", "商品／サービスの特徴・強み", "比較／他社との違い", "専門性・実績の提示", "CTA（LINE登録・資料請求・申し込みなど）"];

export const AGREEMENTS = [
  "構成・表現の方向性が大きく変わる場合、再作成扱いとなる可能性があります",
  "修正は原則2回まで無料、それ以降は別途見積もりとなります",
  "成果（再生数・成約率）は内容以外の要因にも影響されるため、保証はできません",
  "提供素材や方向性に不備がある場合は納期が遅れることがあります",
];

// ── 動画編集フォーム（クラウド発注用）の選択肢 ──────────────
export const VIDEO_USE_OPTIONS = [
  "TikTok",
  "Instagramリール",
  "YouTubeショート／本編",
  "PR用動画（企業／店舗）",
  "セミナー動画",
  "その他",
];
export const ASPECT_OPTIONS = ["縦（9:16）", "横（16:9）", "正方形（1:1）"];
export const EDIT_STYLE_OPTIONS = [
  "ポップ",
  "シネマティック",
  "ビジネス寄り",
  "テロップ多め",
  "インパクト重視",
  "かわいい・やさしい",
];
export const SUBTITLE_OPTIONS = ["セリフすべて表示", "要点のみ表示", "テロップ不要"];
export const MIDCHECK_OPTIONS = ["あり", "なし"];

export const VIDEO_AGREEMENTS = [
  "修正は原則2回まで無料、以降は別途お見積りになります",
  "いただいた素材の状態（画質・音声）によっては仕上がりに影響が出る場合があります",
  "「おまかせ」部分の表現については、制作側に一任されることを了承しています",
  "BGM・音源の著作権にはご注意ください（商用利用が可能な素材をご提供ください）",
];

/** カテゴリごとの同意事項 */
export function agreementsFor(category: string): string[] {
  if (isVideoCategory(category)) return VIDEO_AGREEMENTS;
  if (isScriptCategory(category)) return AGREEMENTS;
  return BRAND.defaultAgreements.length > 0 ? BRAND.defaultAgreements : AGREEMENTS;
}

export const STATUSES = ["未公開", "募集中", "制作待ち", "フィードバック", "完了"] as const;
export type Status = (typeof STATUSES)[number];

export type Project = {
  id: string;
  title: string;
  category: string;
  description: string;
  points: number;
  deadline: string;
  createdAt: string;
  status: Status;
  detail?: Record<string, unknown>;
  requested_on?: string;
  assignee_id?: string | null;
};

export const SEED_PROJECTS: Project[] = [
  { id: "seed-1", title: "秋の新商品ショート動画", category: "ショート動画編集", description: "秋の新商品を紹介する30秒動画", points: 7, deadline: "2026-08-30", createdAt: "2026-08-18", status: "募集中" },
  { id: "seed-2", title: "採用ショート動画 台本", category: "台本作成（ショート）", description: "エンジニア採用向けTikTok台本", points: 4, deadline: "2026-09-05", createdAt: "2026-08-19", status: "制作待ち" },
  { id: "seed-3", title: "新商品LPファーストビュー修正", category: "LPファーストビュー", description: "CVR改善のためのFV差し替え", points: 20, deadline: "2026-09-10", createdAt: "2026-08-15", status: "フィードバック" },
  { id: "seed-4", title: "会社紹介動画編集", category: "動画編集（3分）", description: "展示会用90秒動画の編集", points: 14, deadline: "2026-08-25", createdAt: "2026-08-10", status: "完了" },
]
