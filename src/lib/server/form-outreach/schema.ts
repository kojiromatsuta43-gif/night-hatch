// フォーム営業（お問い合わせフォーム経由の営業文送信）のテーブルと型。
// 単体版 form-outreach/ を BRIDGE HATCH 本体に組み込んだもの。DBは本体の app.db を共用する。
import path from "path";
import fs from "fs";
import { DATA_DIR, getDb } from "../db";

export const SCREENSHOT_DIR = path.join(DATA_DIR, "form-shots");

/** クライアント課金: 送信 FORM_BLOCK_SIZE 通ごとに FORM_BLOCK_POINTS ハニー（管理者は無料）。単価は未決のため仮置き */
export const FORM_BLOCK_SIZE = 100;
export const FORM_BLOCK_POINTS = Number(process.env.FORM_BLOCK_POINTS ?? 3);

let ensured = false;
export function ensureFormTables() {
  if (ensured) return;
  ensured = true;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const db = getDb();
  db.exec(`
  CREATE TABLE IF NOT EXISTS form_senders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    label TEXT NOT NULL,
    company TEXT NOT NULL,
    industry TEXT NOT NULL DEFAULT '',
    person TEXT NOT NULL,
    person_kana TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    reply_email TEXT NOT NULL DEFAULT '',
    tel TEXT NOT NULL DEFAULT '',
    postal TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_form_senders_user ON form_senders (user_id);

  CREATE TABLE IF NOT EXISTS form_campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'hybrid',
    subject_text TEXT NOT NULL DEFAULT '',
    template_text TEXT NOT NULL DEFAULT '',
    ai_instruction TEXT NOT NULL DEFAULT '',
    daily_limit INTEGER NOT NULL DEFAULT 300,
    send_window_start INTEGER NOT NULL DEFAULT 9,
    send_window_end INTEGER NOT NULL DEFAULT 18,
    weekdays_only INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft',
    sent_count INTEGER NOT NULL DEFAULT 0,
    charged_points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_form_campaigns_user ON form_campaigns (user_id, status);

  CREATE TABLE IF NOT EXISTS form_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id TEXT NOT NULL,
    lead_id TEXT,
    company_name TEXT NOT NULL,
    form_url TEXT NOT NULL DEFAULT '',
    site_url TEXT NOT NULL DEFAULT '',
    industry TEXT NOT NULL DEFAULT '',
    sub_industry TEXT NOT NULL DEFAULT '',
    prefecture TEXT NOT NULL DEFAULT '',
    representative TEXT NOT NULL DEFAULT '',
    domain TEXT NOT NULL DEFAULT '',
    is_test INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'queued',
    message_used TEXT NOT NULL DEFAULT '',
    result_text TEXT NOT NULL DEFAULT '',
    screenshot_path TEXT NOT NULL DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_form_jobs_campaign ON form_jobs (campaign_id, status);
  CREATE INDEX IF NOT EXISTS idx_form_jobs_domain ON form_jobs (domain, status);

  CREATE TABLE IF NOT EXISTS form_suppressions (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS form_site_cache (
    domain TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
}

export type SenderProfile = {
  id: string;
  user_id: string;
  label: string;
  company: string;
  industry: string;
  person: string;
  person_kana: string;
  email: string;
  reply_email: string;
  tel: string;
  postal: string;
  address: string;
  url: string;
};

export type CampaignMode = "template" | "ai" | "hybrid";
export type CampaignStatus = "draft" | "running" | "paused" | "done";

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  sender_id: string;
  mode: CampaignMode;
  subject_text: string;
  template_text: string;
  ai_instruction: string;
  daily_limit: number;
  send_window_start: number;
  send_window_end: number;
  weekdays_only: number;
  status: CampaignStatus;
  sent_count: number;
  charged_points: number;
  created_at: string;
};

export type JobStatus =
  | "queued" | "sending" | "sent"
  | "skip_no_form" | "skip_refused" | "skip_captcha" | "skip_suppressed" | "skip_duplicate"
  | "failed";

export type Job = {
  id: number;
  campaign_id: string;
  lead_id: string | null;
  company_name: string;
  form_url: string;
  site_url: string;
  industry: string;
  sub_industry: string;
  prefecture: string;
  representative: string;
  domain: string;
  is_test: number;
  status: JobStatus;
  message_used: string;
  result_text: string;
  screenshot_path: string;
  attempts: number;
  sent_at: string | null;
  updated_at: string;
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  queued: "待機中",
  sending: "送信中",
  sent: "送信済み",
  skip_no_form: "フォーム無し",
  skip_refused: "営業お断り",
  skip_captcha: "CAPTCHA",
  skip_suppressed: "除外リスト",
  skip_duplicate: "90日以内に送信済",
  failed: "失敗",
};

export function domainOf(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** 官公庁・学校など既定で送らないドメイン */
export const EXCLUDED_DOMAIN_SUFFIXES = [".go.jp", ".lg.jp", ".ac.jp", ".ed.jp"];
export function isExcludedDomain(domain: string): boolean {
  return EXCLUDED_DOMAIN_SUFFIXES.some((s) => domain.endsWith(s));
}
