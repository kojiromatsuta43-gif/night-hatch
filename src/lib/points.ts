// ============================================================
//  ハニーP（ポイント）の値段。ここが唯一の定義。
//  画面・決済・履歴のすべてがこの数字を見る。
//  値上げ・値下げはこのファイルだけ直せばよい。
// ============================================================

/** 追加購入の単価（税抜・1ポイントあたり） */
export const POINT_UNIT_PRICE = 1000;

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
