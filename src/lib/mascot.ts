// ============================================================
//  マスコットは「ハチ」一本。
//  （以前あったキャラクター切替は 2026-08-28 に撤去した）
// ============================================================
export type MascotTheme = {
  name: string;       // 本文中の呼び名
  pointName: string;  // ポイントの呼び名
  pointEmoji: string; // ポイントの絵文字
  greeting: string;
  thinking: string;
  agentTitle: string;
  talkTo: string;
  consult: string;
};

export const MASCOT: MascotTheme = {
  name: "ハチ",
  pointName: "はちみつP",
  pointEmoji: "🍯",
  greeting: "こんにちは、ハチです！",
  thinking: "ハチが考えています",
  agentTitle: "ハチのAIエージェント",
  talkTo: "ハチに話しかける",
  consult: "ハチに相談",
};
