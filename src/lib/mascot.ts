// ============================================================
//  キャラクター切替（遊び心の機能）
//  ▼ この1行を false にすると切替タブが消え、ハチ固定に戻ります。
//    完全に削除したい場合は README の「キャラクター切替の消し方」を参照。
// ============================================================
export const MASCOT_SWITCHER_ENABLED = true;

export type MascotId = "bee" | "pig" | "tanuki";

export type MascotTheme = {
  id: MascotId;
  label: string;      // 切替タブに出す名前
  emoji: string;      // 切替タブの絵文字
  name: string;       // 本文中の呼び名
  pointName: string;  // ポイントの呼び名
  pointEmoji: string; // ポイントの絵文字
  greeting: string;
  thinking: string;
  agentTitle: string;
  talkTo: string;
  consult: string;
};

export const MASCOTS: Record<MascotId, MascotTheme> = {
  bee: {
    id: "bee",
    label: "ハチ",
    emoji: "🐝",
    name: "ハチ",
    pointName: "はちみつP",
    pointEmoji: "🍯",
    greeting: "こんにちは、ハチです！",
    thinking: "ハチが考えています",
    agentTitle: "ハチのAIエージェント",
    talkTo: "ハチに話しかける",
    consult: "ハチに相談",
  },
  pig: {
    id: "pig",
    label: "ぶた",
    emoji: "🐖",
    name: "ぶた",
    pointName: "飼料P",
    pointEmoji: "🌿",
    greeting: "こんにちは、ぶたです！",
    thinking: "ぶたが考えています",
    agentTitle: "ぶたのAIエージェント",
    talkTo: "ぶたに話しかける",
    consult: "ぶたに相談",
  },
  tanuki: {
    id: "tanuki",
    label: "たぬ",
    emoji: "🦝",
    name: "たぬ",
    pointName: "無糖レモンP",
    pointEmoji: "🍋",
    greeting: "こんにちは、たぬです！",
    thinking: "たぬが考えています",
    agentTitle: "たぬのAIエージェント",
    talkTo: "たぬに話しかける",
    consult: "たぬに相談",
  },
};

export const DEFAULT_MASCOT: MascotId = "bee";

/** 合言葉（?fun=on）を入れた端末にだけ出るキャラ。ここから外せば通常表示になる。 */
export const SECRET_MASCOTS: MascotId[] = ["tanuki"];
export const isSecretMascot = (id: MascotId) => SECRET_MASCOTS.includes(id);
export const MASCOT_STORAGE_KEY = "bridge-hatch-mascot";
/** 合言葉を入れた端末かどうかの保存先 */
export const FUN_STORAGE_KEY = "bridge-hatch-fun";
