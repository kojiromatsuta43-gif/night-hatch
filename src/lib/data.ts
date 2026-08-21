export const CATEGORIES = [
  "台本作成",
  "チラシ作成",
  "LP作成・修正",
  "動画編集",
  "名刺作成",
  "バナー作成",
  "Instagram投稿",
  "SEO記事作成",
  "サムネイル作成",
  "LINE構築",
] as const;

export const POINTS_BY_CATEGORY: Record<string, number> = {
  "台本作成": 4,
  "チラシ作成": 15,
  "LP作成・修正": 40,
  "動画編集": 30,
  "名刺作成": 10,
  "バナー作成": 12,
  "Instagram投稿": 8,
  "SEO記事作成": 20,
  "サムネイル作成": 6,
  "LINE構築": 50,
};

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
  detail?: Record<string, string | string[]>;
};

export const SEED_PROJECTS: Project[] = [
  { id: "seed-1", title: "地域イベント告知チラシ", category: "チラシ作成", description: "秋の商店街イベントの告知チラシ", points: 21, deadline: "2026-08-30", createdAt: "2026-08-18", status: "募集中" },
  { id: "seed-2", title: "採用ショート動画 台本", category: "台本作成", description: "エンジニア採用向けTikTok台本", points: 4, deadline: "2026-09-05", createdAt: "2026-08-19", status: "制作待ち" },
  { id: "seed-3", title: "新商品LPファーストビュー修正", category: "LP作成・修正", description: "CVR改善のためのFV差し替え", points: 40, deadline: "2026-09-10", createdAt: "2026-08-15", status: "フィードバック" },
  { id: "seed-4", title: "会社紹介動画編集", category: "動画編集", description: "展示会用90秒動画の編集", points: 30, deadline: "2026-08-25", createdAt: "2026-08-10", status: "完了" },
];
