// ============================================================
//  ハニーP（ポイント）の値段。ここが唯一の定義。
//  画面・決済・履歴のすべてがこの数字を見る。
//  値上げ・値下げはこのファイルだけ直せばよい。
// ============================================================

/** 定価（追加購入の単価。税抜・1ハニーあたり）。プランは定価換算にボーナスを乗せる */
export const POINT_UNIT_PRICE = 1200;

/**
 * 月額プラン（NIGHT HATCH・補助金なしの月額サブスク）。
 * 付与 = 月額÷定価 にボーナスを乗せた数（スタンダード 100×1.2=120、プレミアム 208×1.2≒250）。
 * 実質単価: ライト1,200円 / スタンダード1,000円 / プレミアム1,000円。
 * ショート動画は 台本5＋編集10＝15P/本。
 */
export const PLANS = [
  { id: "light", name: "ライト", monthly: 30000, points: 25, bonus: 0, carryMonths: 3, initial: 0, note: "台本＋編集で月1本＋投稿1本、または編集のみ月2本。バー・スナック向け" },
  { id: "standard", name: "スタンダード", monthly: 120000, points: 120, bonus: 20, carryMonths: 6, initial: 50000, note: "台本＋編集で月8本（採用4本＋集客4本）。キャバクラ・ラウンジ1店舗向け" },
  { id: "premium", name: "プレミアム", monthly: 250000, points: 250, bonus: 20, carryMonths: 12, initial: 100000, note: "台本＋編集で月16本（MAX 編集のみ25本）。多店舗・グループ向け" },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];
export function planOf(id: string | undefined) {
  return PLANS.find((p) => p.id === id);
}

/** 消費税率（%） */
export const POINT_TAX_RATE = 10;

/** 追加購入できるパック */
export const POINT_PACKS = [10, 50, 100] as const;
export type PointPack = (typeof POINT_PACKS)[number];

/** 税抜金額 */
export function priceExclTax(points: number): number {
  return Math.max(0, Math.round(points)) * POINT_UNIT_PRICE;
}

/** 税込金額。端数は切り捨て（1円未満は請求しない） */
export function priceInclTax(points: number): number {
  const base = priceExclTax(points);
  return base + Math.floor((base * POINT_TAX_RATE) / 100);
}

/** 消費税額 */
export function taxAmount(points: number): number {
  return priceInclTax(points) - priceExclTax(points);
}

/** 買えるパックかどうか（画面からの指定を信用しないための確認） */
export function isValidPack(points: unknown): points is PointPack {
  return typeof points === "number" && (POINT_PACKS as readonly number[]).includes(points);
}

export const yen = (n: number) => `¥${n.toLocaleString()}`;
