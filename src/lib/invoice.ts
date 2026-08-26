// ============================================================
//  適格請求書（インボイス）の金額計算
//  制度上のポイント:
//   - 税率区分ごとに「合計額」と「消費税額」を記載する必要がある
//   - 端数処理は 1つの請求書につき、税率区分ごとに1回だけ
//     （明細1行ずつ端数処理して足し上げるのは認められない）
// ============================================================

export type TaxRate = 10 | 8 | 0;
export type Rounding = "切り捨て" | "切り上げ" | "四捨五入";

export type InvoiceItem = {
  id?: string;
  name: string;
  delivered_on?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_rate: TaxRate;
  /** 8%が軽減税率かどうか（※印の対象） */
  reduced?: boolean | number;
  note?: string;
};

export type TaxGroup = {
  rate: TaxRate;
  /** その税率区分の税抜合計 */
  base: number;
  /** その税率区分の消費税額（端数処理はここで1回だけ） */
  tax: number;
  reduced: boolean;
};

export const TAX_RATE_OPTIONS: { value: TaxRate; label: string; reduced: boolean }[] = [
  { value: 10, label: "10%（標準）", reduced: false },
  { value: 8, label: "8%（軽減税率）", reduced: true },
  { value: 0, label: "非課税・対象外", reduced: false },
];

export function lineAmount(item: Pick<InvoiceItem, "quantity" | "unit_price">): number {
  return Math.round((Number(item.quantity) || 0) * (Number(item.unit_price) || 0));
}

function applyRounding(value: number, mode: Rounding): number {
  if (mode === "切り上げ") return Math.ceil(value);
  if (mode === "四捨五入") return Math.round(value);
  return Math.floor(value);
}

/** 税率区分ごとに集計する。端数処理は区分ごとに1回だけ行う。 */
export function summarize(items: InvoiceItem[], rounding: Rounding = "切り捨て") {
  const buckets = new Map<TaxRate, { base: number; reduced: boolean }>();

  for (const item of items) {
    const rate = (Number(item.tax_rate) as TaxRate) ?? 10;
    const cur = buckets.get(rate) ?? { base: 0, reduced: false };
    cur.base += lineAmount(item);
    if (rate === 8 && (item.reduced === true || item.reduced === 1)) cur.reduced = true;
    buckets.set(rate, cur);
  }

  const groups: TaxGroup[] = [...buckets.entries()]
    .map(([rate, v]) => ({
      rate,
      base: v.base,
      tax: rate === 0 ? 0 : applyRounding((v.base * rate) / 100, rounding),
      reduced: rate === 8 ? true : v.reduced,
    }))
    .sort((a, b) => b.rate - a.rate);

  const subtotal = groups.reduce((sum, g) => sum + g.base, 0);
  const taxTotal = groups.reduce((sum, g) => sum + g.tax, 0);

  return { groups, subtotal, taxTotal, total: subtotal + taxTotal };
}

/** 登録番号の形式チェック（T + 数字13桁） */
export function isValidRegistrationNo(value: string): boolean {
  return /^T\d{13}$/.test((value ?? "").trim());
}

/**
 * 適格請求書の法定記載事項（6項目）が揃っているかを判定する。
 * 交付前のチェックリスト表示に使う。
 */
export function checkRequirements(input: {
  issuerName: string;
  registrationNo: string;
  issuedOn: string;
  partnerName: string;
  items: InvoiceItem[];
}): { label: string; ok: boolean; hint: string }[] {
  const { groups } = summarize(input.items);
  const hasReduced = input.items.some((i) => Number(i.tax_rate) === 8);
  return [
    {
      label: "① 発行者の氏名または名称",
      ok: Boolean(input.issuerName.trim()),
      hint: "自社情報の「会社名・屋号」",
    },
    {
      label: "② 登録番号（T＋13桁）",
      ok: isValidRegistrationNo(input.registrationNo),
      hint: "自社情報の「適格請求書発行事業者 登録番号」",
    },
    {
      label: "③ 取引年月日",
      ok: Boolean(input.issuedOn),
      hint: "請求日、または明細ごとの提供日",
    },
    {
      label: "④ 取引の内容（軽減税率対象はその旨）",
      ok: input.items.length > 0 && input.items.every((i) => i.name.trim().length > 0),
      hint: hasReduced ? "8%の行には ※ が付きます" : "すべての明細に品目名が必要です",
    },
    {
      label: "⑤ 税率ごとの合計額と適用税率",
      ok: groups.length > 0,
      hint: "明細を1行以上入れると自動で集計されます",
    },
    {
      label: "⑥ 交付を受ける者の氏名または名称",
      ok: Boolean(input.partnerName.trim()),
      hint: "請求先（取引先）の名称",
    },
  ];
}
