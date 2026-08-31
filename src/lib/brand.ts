import { bridge } from "./brands/bridge";
import { food } from "./brands/food";
import type { Brand, CatalogItem } from "./brand-types";

export type { Brand, CatalogItem, Question, Quantity } from "./brand-types";

/**
 * 看板の切替。Railway の Variables に NEXT_PUBLIC_APP_BRAND=food を入れると FOOD HATCH になる。
 * NEXT_PUBLIC_ 付きなのはビルド時に画面側へ埋め込むため（サーバー側でも同じ値が読める）。
 * 未設定なら BRIDGE HATCH。
 */
const id = (process.env.NEXT_PUBLIC_APP_BRAND ?? "bridge").trim().toLowerCase();
export const BRAND: Brand = id === "food" ? food : bridge;

export const CATALOG: CatalogItem[] = BRAND.catalog;

export function catalogItem(name: string): CatalogItem | undefined {
  return CATALOG.find((c) => c.name === name);
}

/** カテゴリ一覧をグループごとに（発注画面の並び順） */
export function catalogGroups(): { heading: string; items: CatalogItem[] }[] {
  const out: { heading: string; items: CatalogItem[] }[] = [];
  for (const c of CATALOG) {
    let g = out.find((x) => x.heading === c.group);
    if (!g) {
      g = { heading: c.group, items: [] };
      out.push(g);
    }
    g.items.push(c);
  }
  // 看板側で groups の並びが決めてあれば、その順に（発注トップのタイルと一致させる）
  const order = BRAND.groups.map((g) => g.name);
  if (order.length > 0) {
    out.sort((a, b) => {
      const ia = order.indexOf(a.heading), ib = order.indexOf(b.heading);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }
  return out;
}

/**
 * 消費ptを計算する。件数メニュー（テレアポ）は 件数 × 単価、それ以外は固定。
 * 画面とAPIの両方でこれを使い、画面から送られた数字を信用しない。
 */
export function pointsFor(category: string, detail?: Record<string, unknown> | null): number {
  const item = catalogItem(category);
  if (!item) return 10;
  if (item.quantity) {
    const raw = Number(detail?.[item.quantity.key] ?? item.quantity.min);
    const n = clampQuantity(item, raw);
    return Math.round(n * item.quantity.pointsPer);
  }
  return item.points;
}

export function clampQuantity(item: CatalogItem, raw: number): number {
  const q = item.quantity;
  if (!q) return 0;
  if (!Number.isFinite(raw)) return q.min;
  const stepped = Math.round(raw / q.step) * q.step;
  return Math.min(q.max, Math.max(q.min, stepped));
}
