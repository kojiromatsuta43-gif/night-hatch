/** 小さな CSV/TSV パーサ（引用符・改行・BOM 対応）。営業リストの取り込みに使う */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const delim = src.split("\n")[0]?.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += c;
      continue;
    }
    if (c === '"') inQ = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

export type LeadField = "company" | "contact_name" | "phone" | "email" | "address" | "prefecture" | "industry" | "employees" | "website" | "memo";

export const LEAD_FIELD_LABELS: Record<LeadField, string> = {
  company: "会社名",
  contact_name: "担当者",
  phone: "電話",
  email: "メール",
  address: "住所",
  prefecture: "都道府県",
  industry: "業種",
  employees: "従業員数",
  website: "URL",
  memo: "メモ",
};

const ALIASES: Record<LeadField, RegExp> = {
  company: /会社|社名|法人|店名|店舗名|企業|company|name$/i,
  contact_name: /担当|氏名|代表者|contact|person/i,
  phone: /電話|tel|phone|携帯/i,
  email: /メール|mail/i,
  address: /住所|所在地|address/i,
  prefecture: /都道府県|県名|pref/i,
  industry: /業種|業態|カテゴリ|industry|category/i,
  employees: /従業員|社員数|人数|規模|employee/i,
  website: /url|hp|ホームページ|web|サイト/i,
  memo: /メモ|備考|note|remark|コメント/i,
};

/** 見出し行から列の対応を推定する */
export function guessMapping(headers: string[]): Partial<Record<LeadField, number>> {
  const map: Partial<Record<LeadField, number>> = {};
  const used = new Set<number>();
  // 会社名は「代表者名」などに誤爆しやすいので、担当者を先に確定する
  const order: LeadField[] = ["contact_name", "prefecture", "phone", "email", "address", "industry", "employees", "website", "memo", "company"];
  for (const f of order) {
    const idx = headers.findIndex((h, i) => !used.has(i) && ALIASES[f].test(h.trim()));
    if (idx >= 0) {
      map[f] = idx;
      used.add(idx);
    }
  }
  return map;
}
