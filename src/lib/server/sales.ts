import crypto from "crypto";
import { getDb } from "./db";

/**
 * 営業リスト。
 * リストはアカウント（発注者）ごとに持つ。架電案件に紐付けると、その案件の担当フリーランスも
 * 閲覧・架電記録ができる。実データはお客様が自分で CSV から取り込む。ここでは何も投入しない。
 */

export const LEAD_STATUSES = ["未着手", "不通", "再架電", "資料送付", "アポ", "成約", "断り", "対象外"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CALL_RESULTS = ["不通", "受付止まり", "担当者と話せた", "資料送付", "アポ獲得", "断られた"] as const;
export type CallResult = (typeof CALL_RESULTS)[number];

/** 架電結果 → リストの状態 */
const RESULT_TO_STATUS: Record<CallResult, LeadStatus> = {
  不通: "不通",
  受付止まり: "再架電",
  担当者と話せた: "再架電",
  資料送付: "資料送付",
  アポ獲得: "アポ",
  断られた: "断り",
};

export type Lead = {
  id: string;
  user_id: string;
  company: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  prefecture: string;
  industry: string;
  employees: number | null;
  website: string;
  form_url: string;
  memo: string;
  status: LeadStatus;
  project_id: string | null;
  source: string;
  call_count: number;
  last_called_at: string | null;
  last_result: string;
  created_at: string;
  updated_at: string;
};

export type LeadInput = Partial<Pick<Lead, "company" | "contact_name" | "phone" | "email" | "address" | "prefecture" | "industry" | "website" | "form_url" | "memo">> & {
  employees?: number | string | null;
};

const PREFS = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

export function ensureSalesTables() {
  const db = getDb();
  db.exec(`
  CREATE TABLE IF NOT EXISTS sales_leads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company TEXT NOT NULL,
    contact_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    prefecture TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    employees INTEGER,
    website TEXT NOT NULL DEFAULT '',
    memo TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '未着手',
    project_id TEXT,
    source TEXT NOT NULL DEFAULT '',
    call_count INTEGER NOT NULL DEFAULT 0,
    last_called_at TEXT,
    last_result TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sales_leads_user ON sales_leads (user_id, status);
  CREATE INDEX IF NOT EXISTS idx_sales_leads_project ON sales_leads (project_id);
  CREATE TABLE IF NOT EXISTS sales_calls (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    result TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    called_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sales_calls_lead ON sales_calls (lead_id, called_at);
  `);
  // 問い合わせフォームURL（フォーム営業用）。古いDBには無いので後から足す
  const cols = (db.prepare("PRAGMA table_info(sales_leads)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("form_url")) db.exec("ALTER TABLE sales_leads ADD COLUMN form_url TEXT NOT NULL DEFAULT ''");
}

/** 住所から都道府県を推定 */
export function prefectureOf(address: string, explicit?: string): string {
  const e = (explicit ?? "").trim();
  if (e) {
    const hit = PREFS.find((p) => e.startsWith(p.replace(/[都道府県]$/, "")));
    return hit ?? e;
  }
  const a = address.trim();
  const hit = PREFS.find((p) => a.startsWith(p) || a.startsWith(p.replace(/[都道府県]$/, "")));
  return hit ?? "";
}

/** 表示用: 全角→半角、余計な記号を落としてハイフンは残す */
export function normalizePhone(v: string): string {
  return v
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[−ー―‐–—]/g, "-")
    .replace(/[^\d+\-]/g, "");
}

/** 比較用: 数字だけ */
export function phoneKey(v: string): string {
  return normalizePhone(v).replace(/[^\d]/g, "");
}

function toEmployees(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/** CSV から取り込み。同じ電話番号（または電話が無ければ社名）が既にあれば重複として飛ばす */
export function importLeads(userId: string, rows: LeadInput[], source: string): { added: number; skipped: number; ids: string[] } {
  ensureSalesTables();
  const db = getDb();
  const existing = db.prepare("SELECT phone, company FROM sales_leads WHERE user_id = ?").all(userId) as { phone: string; company: string }[];
  const seenPhone = new Set(existing.map((r) => phoneKey(r.phone)).filter(Boolean));
  const seenCompany = new Set(existing.map((r) => r.company));
  const ins = db.prepare(
    `INSERT INTO sales_leads (id, user_id, company, contact_name, phone, email, address, prefecture, industry, employees, website, memo, source, form_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  let added = 0;
  let skipped = 0;
  const ids: string[] = [];
  db.transaction(() => {
    for (const r of rows.slice(0, 5000)) {
      const company = s(r.company, 120);
      if (!company) {
        skipped++;
        continue;
      }
      const phone = normalizePhone(s(r.phone, 40));
      const key = phoneKey(phone);
      const dup = key ? seenPhone.has(key) : seenCompany.has(company);
      if (dup) {
        skipped++;
        continue;
      }
      const address = s(r.address, 200);
      const id = crypto.randomUUID();
      ids.push(id);
      ins.run(
        id,
        userId,
        company,
        s(r.contact_name, 60),
        phone,
        s(r.email, 120),
        address,
        prefectureOf(address, s(r.prefecture, 10)),
        s(r.industry, 60),
        toEmployees(r.employees),
        s(r.website, 200),
        s(r.memo, 1000),
        s(source, 80),
        s(r.form_url, 300)
      );
      if (key) seenPhone.add(key);
      seenCompany.add(company);
      added++;
    }
  })();
  return { added, skipped, ids };
}

export type LeadFilter = {
  q?: string;
  prefecture?: string;
  industry?: string;
  status?: string;
  projectId?: string; // "none" で未紐付け
  empMin?: number;
  empMax?: number;
  page?: number;
  perPage?: number;
};

/** 閲覧できるリードの条件: 自分のもの ＋ 自分が担当する架電案件に紐付いたもの。管理者は全部 */
function scopeSql(user: { id: string; role: string }): { where: string; params: unknown[] } {
  if (user.role === "admin") return { where: "1=1", params: [] };
  return {
    where: "(l.user_id = ? OR l.project_id IN (SELECT id FROM projects WHERE assignee_id = ?))",
    params: [user.id, user.id],
  };
}

export function listLeads(user: { id: string; role: string }, f: LeadFilter) {
  ensureSalesTables();
  const db = getDb();
  const scope = scopeSql(user);
  const where: string[] = [scope.where];
  const params: unknown[] = [...scope.params];
  if (f.q) {
    where.push("(l.company LIKE ? OR l.contact_name LIKE ? OR REPLACE(l.phone, '-', '') LIKE ? OR l.memo LIKE ? OR l.address LIKE ?)");
    const like = `%${f.q}%`;
    const digits = phoneKey(f.q);
    params.push(like, like, digits ? `%${digits}%` : like, like, like);
  }
  if (f.prefecture) {
    where.push("l.prefecture = ?");
    params.push(f.prefecture);
  }
  if (f.industry) {
    where.push("l.industry = ?");
    params.push(f.industry);
  }
  if (f.status) {
    where.push("l.status = ?");
    params.push(f.status);
  }
  if (f.projectId === "none") where.push("l.project_id IS NULL");
  else if (f.projectId) {
    where.push("l.project_id = ?");
    params.push(f.projectId);
  }
  if (f.empMin !== undefined) {
    where.push("l.employees >= ?");
    params.push(f.empMin);
  }
  if (f.empMax !== undefined) {
    where.push("l.employees <= ?");
    params.push(f.empMax);
  }
  const w = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM sales_leads l WHERE ${w}`).get(...params) as { n: number }).n;
  const perPage = Math.min(5000, Math.max(10, f.perPage ?? 50));
  const page = Math.max(1, f.page ?? 1);
  const items = db
    .prepare(
      `SELECT l.*, p.title AS project_title FROM sales_leads l LEFT JOIN projects p ON p.id = l.project_id
       WHERE ${w} ORDER BY l.updated_at DESC, l.company LIMIT ? OFFSET ?`
    )
    .all(...params, perPage, (page - 1) * perPage) as (Lead & { project_title: string | null })[];

  // 絞り込み用の選択肢（閲覧範囲の中で）
  const facet = (col: string) =>
    (db.prepare(`SELECT ${col} AS v, COUNT(*) AS n FROM sales_leads l WHERE ${scope.where} AND ${col} != '' GROUP BY ${col} ORDER BY n DESC LIMIT 60`).all(...scope.params) as { v: string; n: number }[]);
  const statusCounts = db
    .prepare(`SELECT status AS v, COUNT(*) AS n FROM sales_leads l WHERE ${scope.where} GROUP BY status`)
    .all(...scope.params) as { v: string; n: number }[];
  return {
    items,
    total,
    page,
    perPage,
    facets: { prefectures: facet("prefecture"), industries: facet("industry"), statuses: statusCounts },
  };
}

export function canAccessLead(user: { id: string; role: string }, leadId: string): Lead | null {
  ensureSalesTables();
  const scope = scopeSql(user);
  return (
    (getDb().prepare(`SELECT l.* FROM sales_leads l WHERE l.id = ? AND ${scope.where}`).get(leadId, ...scope.params) as Lead | undefined) ?? null
  );
}

export function updateLead(user: { id: string; role: string }, leadId: string, patch: Partial<LeadInput> & { status?: string; project_id?: string | null }) {
  const lead = canAccessLead(user, leadId);
  if (!lead) return null;
  const db = getDb();
  const sets: string[] = [];
  const params: unknown[] = [];
  const fields: (keyof LeadInput)[] = ["company", "contact_name", "phone", "email", "address", "industry", "website", "memo"];
  for (const k of fields) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = ?`);
      params.push(k === "phone" ? normalizePhone(s(patch[k], 40)) : s(patch[k], k === "memo" ? 1000 : 200));
    }
  }
  if (patch.address !== undefined || patch.prefecture !== undefined) {
    sets.push("prefecture = ?");
    params.push(prefectureOf(s(patch.address ?? lead.address, 200), s(patch.prefecture, 10)));
  }
  if (patch.employees !== undefined) {
    sets.push("employees = ?");
    params.push(toEmployees(patch.employees));
  }
  if (patch.status !== undefined) {
    if (!(LEAD_STATUSES as readonly string[]).includes(patch.status)) throw new Error("状態が不正です");
    sets.push("status = ?");
    params.push(patch.status);
  }
  if (patch.project_id !== undefined) {
    // リストの持ち主か管理者だけが案件に紐付けできる
    if (lead.user_id !== user.id && user.role !== "admin") throw new Error("案件への紐付けはリストの持ち主だけができます");
    sets.push("project_id = ?");
    params.push(patch.project_id || null);
  }
  if (sets.length === 0) return lead;
  sets.push("updated_at = datetime('now')");
  db.prepare(`UPDATE sales_leads SET ${sets.join(", ")} WHERE id = ?`).run(...params, leadId);
  return db.prepare("SELECT * FROM sales_leads WHERE id = ?").get(leadId) as Lead;
}

/** 架電結果を記録。状態・回数・最終架電日時をまとめて更新 */
export function recordCall(user: { id: string; role: string }, leadId: string, result: string, note: string) {
  const lead = canAccessLead(user, leadId);
  if (!lead) return null;
  if (!(CALL_RESULTS as readonly string[]).includes(result)) throw new Error("結果が不正です");
  const db = getDb();
  db.transaction(() => {
    db.prepare("INSERT INTO sales_calls (id, lead_id, user_id, result, note) VALUES (?, ?, ?, ?, ?)").run(
      crypto.randomUUID(),
      leadId,
      user.id,
      result,
      s(note, 1000)
    );
    db.prepare(
      `UPDATE sales_leads SET status = CASE WHEN status IN ('成約') THEN status ELSE ? END,
         call_count = call_count + 1, last_called_at = datetime('now'), last_result = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(RESULT_TO_STATUS[result as CallResult], result, leadId);
  })();
  return db.prepare("SELECT * FROM sales_leads WHERE id = ?").get(leadId) as Lead;
}

export function listCalls(user: { id: string; role: string }, leadId: string) {
  if (!canAccessLead(user, leadId)) return null;
  return getDb()
    .prepare("SELECT c.*, u.name AS caller FROM sales_calls c LEFT JOIN users u ON u.id = c.user_id WHERE c.lead_id = ? ORDER BY c.called_at DESC LIMIT 100")
    .all(leadId) as { id: string; result: string; note: string; called_at: string; caller: string | null }[];
}

/** まとめて操作（持ち主 or 管理者のみ） */
export function bulkLeads(
  user: { id: string; role: string },
  ids: string[],
  action: { type: "assign"; projectId: string | null } | { type: "status"; status: string } | { type: "delete" }
): number {
  ensureSalesTables();
  const db = getDb();
  const own = user.role === "admin" ? "1=1" : "user_id = ?";
  const ownParams = user.role === "admin" ? [] : [user.id];
  const list = ids.slice(0, 2000);
  if (list.length === 0) return 0;
  const marks = list.map(() => "?").join(",");
  if (action.type === "assign") {
    if (action.projectId) {
      const p = db.prepare("SELECT id FROM projects WHERE id = ? AND (user_id = ? OR ? = 'admin')").get(action.projectId, user.id, user.role);
      if (!p) throw new Error("案件が見つかりません");
    }
    return db.prepare(`UPDATE sales_leads SET project_id = ?, updated_at = datetime('now') WHERE ${own} AND id IN (${marks})`).run(action.projectId, ...ownParams, ...list).changes;
  }
  if (action.type === "status") {
    if (!(LEAD_STATUSES as readonly string[]).includes(action.status)) throw new Error("状態が不正です");
    return db.prepare(`UPDATE sales_leads SET status = ?, updated_at = datetime('now') WHERE ${own} AND id IN (${marks})`).run(action.status, ...ownParams, ...list).changes;
  }
  return db.transaction(() => {
    db.prepare(`DELETE FROM sales_calls WHERE lead_id IN (SELECT id FROM sales_leads WHERE ${own} AND id IN (${marks}))`).run(...ownParams, ...list);
    return db.prepare(`DELETE FROM sales_leads WHERE ${own} AND id IN (${marks})`).run(...ownParams, ...list).changes;
  })();
}

/** 架電案件ごとの集計（案件詳細で使う） */
export function projectCallStats(projectId: string) {
  ensureSalesTables();
  const db = getDb();
  const leads = (db.prepare("SELECT COUNT(*) AS n FROM sales_leads WHERE project_id = ?").get(projectId) as { n: number }).n;
  const r = db
    .prepare(
      `SELECT COUNT(*) AS calls,
              SUM(CASE WHEN c.result IN ('担当者と話せた','資料送付','アポ獲得','断られた') THEN 1 ELSE 0 END) AS connected,
              SUM(CASE WHEN c.result = 'アポ獲得' THEN 1 ELSE 0 END) AS appts
         FROM sales_calls c JOIN sales_leads l ON l.id = c.lead_id WHERE l.project_id = ?`
    )
    .get(projectId) as { calls: number; connected: number | null; appts: number | null };
  return { leads, calls: r.calls, connected: r.connected ?? 0, appts: r.appts ?? 0 };
}

/** CSV 書き出し（Excel で開けるよう BOM 付き） */
export function leadsToCsv(items: Lead[]): string {
  const head = ["会社名", "担当者", "電話", "メール", "住所", "都道府県", "業種", "従業員数", "URL", "状態", "架電回数", "最終架電", "最終結果", "メモ"];
  const esc = (v: unknown) => {
    const t = String(v ?? "");
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = items.map((l) =>
    [l.company, l.contact_name, l.phone, l.email, l.address, l.prefecture, l.industry, l.employees ?? "", l.website, l.status, l.call_count, l.last_called_at ?? "", l.last_result, l.memo].map(esc).join(",")
  );
  return "\uFEFF" + [head.join(","), ...lines].join("\n");
}
