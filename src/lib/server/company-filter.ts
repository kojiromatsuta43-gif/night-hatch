import type { CompanyFilter } from "./companydb";

/** URL のクエリ文字列 → 企業DBの検索条件 */
export function filterFrom(u: URL): CompanyFilter {
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  const list = (k: string) => (u.searchParams.get(k) ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  const num = (k: string) => {
    const v = u.searchParams.get(k);
    if (v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    q: g("q")?.trim() || undefined,
    prefectures: list("pref"),
    industryL: list("industry"),
    industryS: g("industryS")?.trim() || undefined,
    empMin: num("empMin"),
    empMax: num("empMax"),
    hasPhone: g("phone") === "1",
    hasEmail: g("email") === "1",
    hasForm: g("form") === "1",
    source: g("source") || undefined,
    page: num("page"),
    perPage: num("perPage"),
  };
}

