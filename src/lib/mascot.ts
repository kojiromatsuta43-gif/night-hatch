// ============================================================
//  マスコットは「ハッチ」一本（2026-09-01 命名）。
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
  name: "ハッチ",
  pointName: "はちみつP",
  pointEmoji: "🍯",
  greeting: "こんにちは、ハッチです！",
  thinking: "ハッチが考えています",
  agentTitle: "ハッチのAIエージェント",
  talkTo: "ハッチに話しかける",
  consult: "ハッチに相談",
};
