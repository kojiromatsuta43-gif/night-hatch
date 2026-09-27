import { night } from "./brands/night";
import type { Brand, CatalogItem } from "./brand-types";

export type { Brand, CatalogItem, Question, Quantity } from "./brand-types";

/**
 * NIGHT HATCH は夜のお店専用（2026-09-28 に FOOD HATCH から派生）。
 * 看板の切替はなく、常に night を使う。
 */
export const BRAND: Brand = night;

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
  if (order.length > 0 && out.every((g) => order.includes(g.heading))) {
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
