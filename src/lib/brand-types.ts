/**
 * 「看板切替」の型。BRIDGE HATCH / FOOD HATCH は同じエンジンで、
 * 名前・制作メニュー・業種タブ・AIの設定だけをここで差し替える。
 */

export type QuestionType = "text" | "textarea" | "number" | "select" | "multi" | "file" | "date";

export type Question = {
  key: string; // 保存時の見出し（detail のキーになる）
  label: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
};

/** 件数で金額が変わるメニュー（テレアポなど） */
export type Quantity = {
  key: string; // 例: 架電件数
  unit: string; // 例: 件
  pointsPer: number; // 1単位あたりのpt
  min: number;
  max: number;
  step: number;
  hint?: string;
};

export type CatalogItem = {
  name: string;
  points: number; // 固定pt。quantity があるときは min 件数のときのpt
  group: string;
  size: string; // 一覧に出す短い説明
  days: string; // 目安日数
  monthly?: boolean; // 月額メニュー
  quantity?: Quantity;
  questions?: Question[];
  agreements?: string[];
};

export type Brand = {
  id: "bridge" | "food";
  name: string;
  tagline: string;
  /** 発注トップの大きな入口 */
  hero: { title: string; sub: string };
  /** 業種タブの初期値（DBが空のときだけ入る） */
  industries: string[];
  /** 全カテゴリで最初に聞くこと（店舗情報など） */
  commonQuestions: Question[];
  catalog: CatalogItem[];
  /** AIエージェント経由で発注できるカテゴリ */
  orderable: string[];
  agent: {
    system: string;
    quickActions: { label: string; hint: string; prompt: string }[];
    promptLibrary: string[];
    searchEmptyHint: string;
  };
};
