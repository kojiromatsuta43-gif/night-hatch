import crypto from "crypto";
import { getDb } from "./db";
import { generateJson, generateText, type ChatMessage } from "./llm";
import { searchCompanies, addByFilter, getStatus, type CompanyFilter } from "./companydb";
import { BRAND } from "../brand";

/**
 * 営業AIエージェント。
 * 1) テレアポ用スクリプトの作成（task: sales）
 * 2) 「福岡の飲食店で従業員10人以下を300社」→ 企業DBの検索条件に変換 → 件数と見本 → 営業リストへ取得
 *
 * 取得は 社内（admin）は無料、お客様は 200社=LIST_POINTS🍯（営業リスト作成メニューと同じ単価）。
 */

export const LIST_BLOCK = 200;
export const LIST_POINTS = 20;
export const LIST_MAX = 1000;

const LIST_HINT = /リスト|社ほしい|社欲しい|件ほしい|件欲しい|抽出|取得|探して|集めて|ピックアップ|ターゲット|企業を|会社を|見込み客/;

export function mightBeListRequest(message: string): boolean {
  return LIST_HINT.test(message);
}

const FILTER_SCHEMA = {
  type: "object",
  properties: {
    is_list_request: { type: "boolean" },
    prefectures: { type: "array", items: { type: "string" } },
    industry_keywords: { type: "array", items: { type: "string" } },
    emp_min: { type: ["integer", "null"] },
    emp_max: { type: ["integer", "null"] },
    need_phone: { type: "boolean" },
    need_email: { type: "boolean" },
    need_form: { type: "boolean" },
    count: { type: ["integer", "null"] },
    keyword: { type: ["string", "null"] },
  },
  required: ["is_list_request", "prefectures", "industry_keywords", "emp_min", "emp_max", "need_phone", "need_email", "need_form", "count", "keyword"],
  additionalProperties: false,
};

type Extracted = {
  is_list_request: boolean;
  prefectures: string[];
  industry_keywords: string[];
  emp_min: number | null;
  emp_max: number | null;
  need_phone: boolean;
  need_email: boolean;
  need_form: boolean;
  count: number | null;
  keyword: string | null;
};

const INDUSTRY_L = [
  "建設", "不動産", "医薬・バイオ", "運輸サービス", "中間流通", "小売", "法人サービス", "建設ゼネコン・工事", "広告・情報通信サービス", "食品",
  "機械・電気製品", "消費者サービス", "その他サービス", "外食・中食", "工事・土木", "医療・製薬・福祉", "小売・販売・卸売", "製造", "IT", "商社",
  "交通・運輸・物流", "自動車・輸送", "機械", "人材・アウトソーシング", "士業", "飲食・外食", "美容・アパレル", "コンサルティング", "広告・制作",
];

/** 自然文 → 企業DBの検索条件。DBに無い言い回しは小業界の部分一致に落とす */
export async function extractFilter(message: string): Promise<{ filter: CompanyFilter; count: number; extracted: Extracted } | null> {
  const system = `営業リストの依頼文から、企業データベースの検索条件をJSONで抜き出す。
- prefectures: 都道府県名を正式名称（例: 福岡県、東京都）で。地方名（九州など）は含まれる都道府県に展開する。
- industry_keywords: 業種を短い語で（例: 飲食店、美容室、建設、介護、歯科）。DBの大業界は次のいずれか: ${INDUSTRY_L.join("、")}。合うものがあればその名前を入れ、無ければ短い語を入れる。
- emp_min / emp_max: 従業員数の範囲。指定が無ければ null。
- need_phone: 電話番号が要るなら true（テレアポ用途なら true）。
- count: 欲しい社数。無ければ null。
- keyword: 社名や地名など上記に入らない条件。無ければ null。
リストの依頼でなければ is_list_request=false。JSONのみを返す。`;
  const out = await generateJson<Extracted>(system, message, FILTER_SCHEMA, { task: "backstage" });
  if (!out?.is_list_request) return null;
  const industryL = (out.industry_keywords ?? []).filter((k) => INDUSTRY_L.includes(k));
  const rest = (out.industry_keywords ?? []).filter((k) => !INDUSTRY_L.includes(k));
  const filter: CompanyFilter = {
    prefectures: (out.prefectures ?? []).filter(Boolean).slice(0, 47),
    industryL,
    industryS: rest[0] || undefined,
    empMin: out.emp_min ?? undefined,
    empMax: out.emp_max ?? undefined,
    hasPhone: out.need_phone !== false,
    hasEmail: !!out.need_email,
    hasForm: !!out.need_form,
    q: out.keyword || undefined,
    perPage: 5,
  };
  const count = Math.min(LIST_MAX, Math.max(1, out.count ?? LIST_BLOCK));
  return { filter, count, extracted: out };
}

export function filterToQuery(f: CompanyFilter): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.prefectures?.length) p.set("pref", f.prefectures.join("|"));
  if (f.industryL?.length) p.set("industry", f.industryL.join("|"));
  if (f.industryS) p.set("industryS", f.industryS);
  if (f.empMin !== undefined) p.set("empMin", String(f.empMin));
  if (f.empMax !== undefined) p.set("empMax", String(f.empMax));
  if (f.hasPhone) p.set("phone", "1");
  if (f.hasEmail) p.set("email", "1");
  if (f.hasForm) p.set("form", "1");
  return p.toString();
}

export function describeFilter(f: CompanyFilter): string {
  const parts: string[] = [];
  if (f.prefectures?.length) parts.push(f.prefectures.join("・"));
  if (f.industryL?.length) parts.push(f.industryL.join("・"));
  if (f.industryS) parts.push(`「${f.industryS}」を含む業種`);
  if (f.empMin !== undefined || f.empMax !== undefined) parts.push(`従業員 ${f.empMin ?? ""}〜${f.empMax ?? ""}人`);
  if (f.hasPhone) parts.push("電話あり");
  if (f.hasEmail) parts.push("メールあり");
  if (f.hasForm) parts.push("フォームあり");
  if (f.q) parts.push(`キーワード「${f.q}」`);
  return parts.join(" / ") || "条件なし";
}

export function companyDbReady(): boolean {
  return getStatus().phase === "ready";
}

/** 件数と見本（電話は伏せる。取得前に個別情報を見せない） */
export async function previewList(filter: CompanyFilter) {
  const r = await searchCompanies({ ...filter, perPage: 10, page: 1 });
  return {
    total: r.total,
    withPhone: r.facets.withPhone,
    sample: r.items.slice(0, 5).map((c) => ({
      name: c.name,
      prefecture: c.prefecture,
      industry: c.industry_s ?? c.industry_l,
      employees: c.employees,
      phoneMasked: c.phone ? c.phone.replace(/\d(?=\d{0,3}$)/g, "*").replace(/^(.{0,6}).*(\*{3,4})$/, "$1…$2") : null,
    })),
  };
}

export function costFor(user: { role: string }, count: number): number {
  if (user.role === "admin") return 0;
  return Math.ceil(Math.min(LIST_MAX, Math.max(1, count)) / LIST_BLOCK) * LIST_POINTS;
}

/** 営業リストへ取得（お客様ははちみつPを消費） */
export async function acquireList(user: { id: string; role: string }, filter: CompanyFilter, count: number) {
  const n = Math.min(LIST_MAX, Math.max(1, count));
  const cost = costFor(user, n);
  const db = getDb();
  if (cost > 0) {
    const u = db.prepare("SELECT points FROM users WHERE id = ?").get(user.id) as { points: number } | undefined;
    if (!u || u.points < cost) throw new Error(`はちみつPが足りません（必要 ${cost}🍯 / 残高 ${u?.points ?? 0}🍯）。「はちみつP」からチャージしてください。`);
  }
  const result = await addByFilter(user.id, filter, n);
  if (cost > 0 && result.added > 0) {
    // 実際に追加できた分だけ課金（重複で飛んだ分は取らない）
    const charged = Math.ceil(result.added / LIST_BLOCK) * LIST_POINTS;
    db.transaction(() => {
      db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(charged, user.id);
      db.prepare("INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'sales_list', ?)").run(
        crypto.randomUUID(), user.id, -charged, `営業リスト取得 ${result.added}社（${describeFilter(filter)}）`
      );
    })();
    return { ...result, charged };
  }
  return { ...result, charged: 0 };
}

// ─── テレアポスクリプト ───
const SCRIPT_SYSTEM = `あなたは${BRAND.name}の営業支援AI。日本のBtoBテレアポに精通したセールストレーナーとして、テレアポ用トークスクリプトを作る。
出力は必ず次の見出し構成（Markdown）:
# タイトル（商材 × ターゲット）
## 目的とゴール（何を取るか: アポ／資料送付／担当者名）
## 受付突破（30秒以内。会社名・要件を短く。「ご担当者様はいらっしゃいますか」型を避け、用件を先に）
## 担当者への切り出し（最初の15秒。相手のメリットを1文で）
## ヒアリング（質問3つ。Yes/Noで終わらせない）
## 提案（商材の説明は3文以内。数字・実績を入れる）
## クロージング（日時の二択で提示）
## 切り返し集（「今は必要ない」「忙しい」「資料だけ送って」「他社を使っている」「高い」への返し）
## NG・注意（景表法・特商法・断られたら深追いしない）
文体は話し言葉。1ブロック3〜5行。相手の業種・規模・地域に合わせて具体的に。ブランドプロファイルの確定情報（価格・実績）は改変しない。回答は日本語。`;

export function scriptSystem(brandContext: string, ngWords: string[]) {
  return SCRIPT_SYSTEM + brandContext + (ngWords.length ? `\n\nプラットフォーム共通NGワード（絶対に使わない）: ${ngWords.join("、")}` : "");
}

export async function generateSalesReply(system: string, history: ChatMessage[]): Promise<string> {
  return generateText(system, history, { task: "sales" });
}
