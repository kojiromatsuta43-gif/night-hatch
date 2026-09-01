import fs from "fs";
import path from "path";
import { DATA_DIR, getDb } from "./db";
import { importLeads, type LeadInput } from "./sales";

/**
 * 企業データベース（775万社）。
 *
 * お客様のMacにある DuckDB から書き出した Parquet を管理画面からアップロードし、
 * サーバー側の DuckDB（DATA_DIR/companydb/companies.duckdb）に取り込む。
 * 検索は DuckDB に任せ、条件で絞った会社を営業リスト（sales_leads）に追加する。
 *
 * @duckdb/node-api は動的に読み込む（型は自前の最小定義。開発機に無くても他の機能は動く）。
 */

export const COMPANYDB_DIR = path.join(DATA_DIR, "companydb");
const PARQUET = path.join(COMPANYDB_DIR, "companies.parquet");
const DBFILE = path.join(COMPANYDB_DIR, "companies.duckdb");
const UPLOAD_PART = path.join(COMPANYDB_DIR, "upload.part");
const STATUS_KEY = "companydb_status";

export type Phase = "empty" | "uploading" | "uploaded" | "ingesting" | "ready" | "error";
export type Status = {
  phase: Phase;
  total: number;
  message: string;
  updatedAt: string;
  columns: string[];
  uploadedBytes: number;
  fileSize: number;
};

// ─── DuckDB の最小型（パッケージの型に依存しない） ───
type Row = Record<string, unknown>;
type Reader = { getRowObjects(): Row[] };
type Connection = {
  run(sql: string, values?: unknown[]): Promise<unknown>;
  runAndReadAll(sql: string, values?: unknown[]): Promise<Reader>;
  closeSync(): void;
};
type Instance = { connect(): Promise<Connection>; closeSync(): void };
type DuckModule = { DuckDBInstance: { create(path: string, options?: Record<string, string>): Promise<Instance> } };

let instancePromise: Promise<Instance> | null = null;

async function loadModule(): Promise<DuckModule> {
  try {
    return (await import("@duckdb/node-api")) as unknown as DuckModule;
  } catch {
    throw new Error("企業DBの部品（@duckdb/node-api）が入っていません。npm install 後に再起動してください。");
  }
}

async function instance(): Promise<Instance> {
  if (!instancePromise) {
    fs.mkdirSync(COMPANYDB_DIR, { recursive: true });
    instancePromise = loadModule().then((m) =>
      m.DuckDBInstance.create(DBFILE, {
        memory_limit: process.env.COMPANYDB_MEMORY ?? "1GB",
        threads: process.env.COMPANYDB_THREADS ?? "2",
        temp_directory: path.join(COMPANYDB_DIR, "tmp"),
      })
    );
    instancePromise.catch(() => {
      instancePromise = null;
    });
  }
  return instancePromise;
}

async function withConn<T>(fn: (c: Connection) => Promise<T>): Promise<T> {
  const c = await (await instance()).connect();
  try {
    return await fn(c);
  } finally {
    c.closeSync();
  }
}

const num = (v: unknown): number => (typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0));

// ─── 状態 ───
export function getStatus(): Status {
  const row = getDb().prepare("SELECT value FROM app_meta WHERE key = ?").get(STATUS_KEY) as { value: string } | undefined;
  const base: Status = { phase: "empty", total: 0, message: "", updatedAt: "", columns: [], uploadedBytes: 0, fileSize: 0 };
  if (!row) return base;
  try {
    return { ...base, ...(JSON.parse(row.value) as Partial<Status>) };
  } catch {
    return base;
  }
}

function setStatus(patch: Partial<Status>) {
  const next = { ...getStatus(), ...patch, updatedAt: new Date().toISOString() };
  getDb().prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)").run(STATUS_KEY, JSON.stringify(next));
  return next;
}

// ─── アップロード（分割） ───
export function uploadChunk(uploadId: string, index: number, total: number, fileSize: number, chunk: Buffer): Status {
  fs.mkdirSync(COMPANYDB_DIR, { recursive: true });
  const st = getStatus();
  if (st.phase === "ingesting") throw new Error("取り込み中です。終わるまでお待ちください");
  let uploadedBytes: number;
  if (index === 0) {
    fs.writeFileSync(UPLOAD_PART, chunk);
    uploadedBytes = chunk.length;
    setStatus({ phase: "uploading", message: uploadId, uploadedBytes, fileSize, total: st.phase === "ready" ? st.total : 0 });
  } else {
    if (st.phase !== "uploading" || st.message !== uploadId) throw new Error("アップロードの続きが一致しません。最初からやり直してください");
    fs.appendFileSync(UPLOAD_PART, chunk);
    uploadedBytes = st.uploadedBytes + chunk.length;
  }
  if (index === total - 1) {
    fs.renameSync(UPLOAD_PART, PARQUET);
    return setStatus({ phase: "uploaded", message: "", uploadedBytes, fileSize });
  }
  return setStatus({ uploadedBytes });
}

// ─── 取り込み（Parquet → companies テーブル） ───
const ALIASES: Record<string, string[]> = {
  source: ["出典"],
  corp_no: ["法人番号", "JCコード"],
  name: ["企業名", "会社名", "商号"],
  phone: ["電話番号", "代表電話番号", "TEL"],
  email: ["メールアドレス", "代表メールアドレス"],
  form_url: ["お問い合わせフォーム", "問い合わせフォーム", "問合せフォームURL", "問合せフォーム"],
  website: ["企業URL", "企業HP", "URL", "ホームページ"],
  industry_l: ["大業界"],
  industry_m: ["中業界", "中業界メイン"],
  industry_s: ["小業界"],
  employees_raw: ["従業員数"],
  prefecture: ["都道府県"],
  city: ["市区町村"],
  address: ["住所", "本社所在地", "所在地"],
  ceo: ["代表者名", "代表者氏名", "代表者"],
  capital: ["資本金"],
  revenue: ["売上高"],
};

const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`;

let ingesting = false;

/** 取り込みを裏で開始する（進み具合は getStatus で見る） */
export function startIngest(): Status {
  const st = getStatus();
  if (ingesting || st.phase === "ingesting") return st;
  if (!fs.existsSync(PARQUET)) throw new Error("先に Parquet ファイルをアップロードしてください");
  ingesting = true;
  setStatus({ phase: "ingesting", message: "取り込み中…（数分かかります）" });
  ingest()
    .then((r) => setStatus({ phase: "ready", total: r.total, columns: r.columns, message: "" }))
    .catch((e) => setStatus({ phase: "error", message: e instanceof Error ? e.message : String(e) }))
    .finally(() => {
      ingesting = false;
    });
  return getStatus();
}

async function ingest(): Promise<{ total: number; columns: string[] }> {
  return withConn(async (c) => {
    const desc = await c.runAndReadAll(`DESCRIBE SELECT * FROM read_parquet(${sqlStr(PARQUET)})`);
    const columns = desc.getRowObjects().map((r) => String(r.column_name));
    const pick = (key: string) => {
      const found = ALIASES[key].filter((a) => columns.includes(a)).map(q);
      if (found.length === 0) return "NULL";
      return found.length === 1 ? found[0] : `COALESCE(${found.join(", ")})`;
    };
    if (pick("name") === "NULL") throw new Error(`企業名の列が見つかりません（列: ${columns.slice(0, 20).join(", ")}）`);

    const selects = Object.keys(ALIASES)
      .map((k) => `NULLIF(TRIM(CAST(${pick(k)} AS VARCHAR)), '') AS ${k}`)
      .join(",\n        ");
    // 出典の優先順（充足率の高いものを残す）
    const rank = `CASE ${pick("source")} WHEN 'ライブラリ2' THEN 0 WHEN 'ライブラリ1' THEN 1 ELSE 2 END`;

    await c.run("DROP TABLE IF EXISTS companies");
    await c.run(`
      CREATE TABLE companies AS
      WITH src AS (
        SELECT ${selects}, ${rank} AS src_rank
        FROM read_parquet(${sqlStr(PARQUET)})
      ),
      dedup AS (
        SELECT * FROM src
        WHERE name IS NOT NULL
        QUALIFY row_number() OVER (
          PARTITION BY COALESCE(corp_no, name || '|' || COALESCE(prefecture, ''))
          ORDER BY src_rank
        ) = 1
      )
      SELECT row_number() OVER (ORDER BY prefecture, industry_l, name) AS id,
             source, corp_no, name, phone, email, form_url, website,
             industry_l, industry_m, industry_s,
             TRY_CAST(regexp_replace(employees_raw, '[^0-9]', '', 'g') AS INTEGER) AS employees,
             prefecture, city, address, ceo, capital, revenue,
             regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') AS phone_key
      FROM dedup
      ORDER BY prefecture, industry_l, name
    `);
    const cnt = await c.runAndReadAll("SELECT count(*) AS n FROM companies");
    await c.run("CHECKPOINT");
    // 取り込んだら Parquet は不要（容量節約）
    try {
      fs.unlinkSync(PARQUET);
    } catch {
      /* 無視 */
    }
    return { total: num(cnt.getRowObjects()[0]?.n), columns };
  });
}

function sqlStr(v: string) {
  return `'${v.replace(/'/g, "''")}'`;
}

// ─── 検索 ───
export type CompanyFilter = {
  q?: string;
  prefectures?: string[];
  industryL?: string[];
  industryS?: string;
  empMin?: number;
  empMax?: number;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasForm?: boolean;
  source?: string;
  page?: number;
  perPage?: number;
};

export type Company = {
  id: number;
  source: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  form_url: string | null;
  website: string | null;
  industry_l: string | null;
  industry_s: string | null;
  employees: number | null;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  ceo: string | null;
  capital: string | null;
  revenue: string | null;
};

function whereOf(f: CompanyFilter): { where: string; params: unknown[] } {
  const w: string[] = [];
  const p: unknown[] = [];
  const add = (sql: string, ...vals: unknown[]) => {
    w.push(sql);
    p.push(...vals);
  };
  if (f.q) add("(name ILIKE ? OR ceo ILIKE ? OR address ILIKE ? OR industry_s ILIKE ?)", `%${f.q}%`, `%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  if (f.prefectures?.length) add(`prefecture IN (${f.prefectures.map(() => "?").join(",")})`, ...f.prefectures);
  if (f.industryL?.length) add(`industry_l IN (${f.industryL.map(() => "?").join(",")})`, ...f.industryL);
  if (f.industryS) add("industry_s ILIKE ?", `%${f.industryS}%`);
  if (f.empMin !== undefined) add("employees >= ?", f.empMin);
  if (f.empMax !== undefined) add("employees <= ?", f.empMax);
  if (f.hasPhone) add("phone IS NOT NULL");
  if (f.hasEmail) add("email IS NOT NULL");
  if (f.hasForm) add("form_url IS NOT NULL");
  if (f.source) add("source = ?", f.source);
  return { where: w.length ? w.join(" AND ") : "1=1", params: p };
}

const COLS = "id, source, name, phone, email, form_url, website, industry_l, industry_s, employees, prefecture, city, address, ceo, capital, revenue";

function toCompany(r: Row): Company {
  return {
    id: num(r.id),
    source: (r.source as string) ?? null,
    name: String(r.name ?? ""),
    phone: (r.phone as string) ?? null,
    email: (r.email as string) ?? null,
    form_url: (r.form_url as string) ?? null,
    website: (r.website as string) ?? null,
    industry_l: (r.industry_l as string) ?? null,
    industry_s: (r.industry_s as string) ?? null,
    employees: r.employees === null || r.employees === undefined ? null : num(r.employees),
    prefecture: (r.prefecture as string) ?? null,
    city: (r.city as string) ?? null,
    address: (r.address as string) ?? null,
    ceo: (r.ceo as string) ?? null,
    capital: (r.capital as string) ?? null,
    revenue: (r.revenue as string) ?? null,
  };
}

export async function searchCompanies(f: CompanyFilter) {
  const st = getStatus();
  if (st.phase !== "ready") throw new Error("企業DBはまだ準備できていません（管理画面「企業DB」から取り込んでください）");
  const { where, params } = whereOf(f);
  const perPage = Math.min(200, Math.max(10, f.perPage ?? 50));
  const page = Math.max(1, f.page ?? 1);
  return withConn(async (c) => {
    // 件数と電話/メール/フォームの内訳は1回の走査で
    const agg = (await c.runAndReadAll(
      `SELECT count(*) AS n, count(phone) AS phone, count(email) AS email, count(form_url) AS form FROM companies WHERE ${where}`,
      params
    )).getRowObjects()[0] ?? {};
    const total = num(agg.n);
    const items = (await c.runAndReadAll(`SELECT ${COLS} FROM companies WHERE ${where} ORDER BY id LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`, params))
      .getRowObjects()
      .map(toCompany);
    const facet = async (col: string, limit: number) =>
      (await c.runAndReadAll(`SELECT ${col} AS v, count(*) AS n FROM companies WHERE ${where} AND ${col} IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT ${limit}`, params))
        .getRowObjects()
        .map((r) => ({ v: String(r.v), n: num(r.n) }));
    // 内訳（選択肢）は1ページ目のときだけ集計する（775万件を何度も走査しない）
    const withFacets = page === 1;
    return {
      items,
      total,
      page,
      perPage,
      facets: {
        prefectures: withFacets ? await facet("prefecture", 47) : [],
        industries: withFacets ? await facet("industry_l", 40) : [],
        sources: withFacets ? await facet("source", 5) : [],
        withPhone: num(agg.phone),
        withEmail: num(agg.email),
        withForm: num(agg.form),
      },
    };
  });
}

/** 全体の内訳（絞り込みなし）。管理画面と検索画面の初期表示に使う */
export async function overview() {
  return searchCompanies({ perPage: 10 });
}

function toLead(r: Company): LeadInput {
  const memoParts: string[] = [];
  if (r.form_url) memoParts.push(`問合せフォーム: ${r.form_url}`);
  if (r.capital) memoParts.push(`資本金 ${r.capital}`);
  if (r.revenue) memoParts.push(`売上高 ${r.revenue}`);
  return {
    company: r.name,
    contact_name: r.ceo ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    address: r.address ?? [r.prefecture, r.city].filter(Boolean).join(""),
    prefecture: r.prefecture ?? "",
    industry: r.industry_s ?? r.industry_l ?? "",
    employees: r.employees,
    website: r.website ?? "",
    memo: memoParts.join(" / "),
  };
}

/** 条件に合う会社を先頭から limit 件、営業リストに追加（電話番号で重複除外） */
export async function addByFilter(userId: string, f: CompanyFilter, limit: number) {
  const { where, params } = whereOf(f);
  const n = Math.min(5000, Math.max(1, limit));
  const rows = await withConn(async (c) =>
    (await c.runAndReadAll(`SELECT ${COLS} FROM companies WHERE ${where} ORDER BY id LIMIT ${n}`, params)).getRowObjects().map(toCompany)
  );
  return importLeads(userId, rows.map(toLead), "企業DB");
}

/** 選んだ会社を営業リストに追加 */
export async function addByIds(userId: string, ids: number[]) {
  const list = ids.filter((v) => Number.isInteger(v) && v > 0).slice(0, 5000);
  if (list.length === 0) return { added: 0, skipped: 0 };
  const rows = await withConn(async (c) =>
    (await c.runAndReadAll(`SELECT ${COLS} FROM companies WHERE id IN (${list.map(() => "?").join(",")})`, list)).getRowObjects().map(toCompany)
  );
  return importLeads(userId, rows.map(toLead), "企業DB");
}

/** 全部消す（やり直し用） */
export async function resetCompanyDb() {
  if (instancePromise) {
    try {
      (await instancePromise).closeSync();
    } catch {
      /* 無視 */
    }
    instancePromise = null;
  }
  for (const f of [PARQUET, DBFILE, UPLOAD_PART, `${DBFILE}.wal`]) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* 無視 */
    }
  }
  setStatus({ phase: "empty", total: 0, message: "", columns: [], uploadedBytes: 0, fileSize: 0 });
}

/** 容量の目安 */
export function diskUsage(): { parquet: number; db: number; part: number } {
  const size = (p: string) => {
    try {
      return fs.statSync(p).size;
    } catch {
      return 0;
    }
  };
  return { parquet: size(PARQUET), db: size(DBFILE), part: size(UPLOAD_PART) };
}
