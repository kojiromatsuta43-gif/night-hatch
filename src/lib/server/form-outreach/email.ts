// メール送信（Resend）。SDKは使わずHTTPで叩く。
// RESEND_API_KEY が無ければ「未設定」として送らない。差出人はクライアント自身の認証済みドメインのアドレスに限る。
import crypto from "crypto";
import nodemailer from "nodemailer";
import { getDb } from "../db";
import { APP_URL, type SenderProfile } from "./schema";

const API = "https://api.resend.com";
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export type DnsRecord = { type: string; name: string; value: string; status?: string; priority?: number };
export type EmailDomain = { id: string; user_id: string; domain: string; provider_id: string; status: string; records: string; created_at: string };

/** ドメインをResendに登録し、DNSに入れてもらうレコードを保存 */
export async function registerDomain(userId: string, domain: string): Promise<EmailDomain> {
  const db = getDb();
  const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) throw new Error("ドメインの形式が正しくありません（例: example.co.jp）");
  const existing = db.prepare("SELECT * FROM form_email_domains WHERE user_id=? AND domain=?").get(userId, d) as EmailDomain | undefined;
  if (existing) return existing;
  if (!emailConfigured()) throw new Error("メール送信サービス（RESEND_API_KEY）が設定されていません");
  const r = await call<{ id: string; records: DnsRecord[] }>("/domains", { method: "POST", body: JSON.stringify({ name: d, region: "ap-northeast-1" }) });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO form_email_domains (id, user_id, domain, provider_id, status, records) VALUES (?,?,?,?,?,?)").run(id, userId, d, r.id, "pending", JSON.stringify(r.records ?? []));
  return db.prepare("SELECT * FROM form_email_domains WHERE id=?").get(id) as EmailDomain;
}

/** DNS設定の確認（Resendに検証を頼み、最新状態を取る） */
export async function verifyDomain(row: EmailDomain): Promise<EmailDomain> {
  if (!emailConfigured()) throw new Error("メール送信サービス（RESEND_API_KEY）が設定されていません");
  await call(`/domains/${row.provider_id}/verify`, { method: "POST" }).catch(() => {});
  const r = await call<{ status: string; records: DnsRecord[] }>(`/domains/${row.provider_id}`);
  const status = r.status === "verified" ? "verified" : r.status === "failed" ? "failed" : "pending";
  getDb().prepare("UPDATE form_email_domains SET status=?, records=? WHERE id=?").run(status, JSON.stringify(r.records ?? []), row.id);
  return { ...row, status, records: JSON.stringify(r.records ?? []) };
}

export async function deleteDomain(row: EmailDomain) {
  if (emailConfigured() && row.provider_id) await call(`/domains/${row.provider_id}`, { method: "DELETE" }).catch(() => {});
  getDb().prepare("DELETE FROM form_email_domains WHERE id=?").run(row.id);
}

/** この送信者でメールが送れるか（SMTP: アカウント設定があるか／サービス: 認証済みドメインか） */
export function senderEmailOk(userId: string, sender: SenderProfile): { ok: boolean; reason?: string; from: string } {
  if (sender.email_method === "smtp") {
    if (!sender.smtp_user || !sender.smtp_pass) return { ok: false, reason: "送信用メールアカウント（ユーザー名・アプリパスワード）が未設定です", from: "" };
    const from = (sender.from_email || sender.smtp_user).trim().toLowerCase();
    return { ok: true, from };
  }
  const fromEmail = (sender.from_email || "").trim().toLowerCase();
  const m = fromEmail.match(/^[^@\s]+@([a-z0-9.-]+\.[a-z]{2,})$/);
  if (!m) return { ok: false, reason: "差出人メールの形式が正しくありません", from: "" };
  if (!emailConfigured()) return { ok: false, reason: "送信サービス（RESEND_API_KEY）が未設定です。送り方を「自分のメールアカウント」にしてください", from: "" };
  const domain = m[1];
  const row = getDb().prepare("SELECT status FROM form_email_domains WHERE user_id=? AND domain=?").get(userId, domain) as { status: string } | undefined;
  if (!row) return { ok: false, reason: `差出人ドメイン ${domain} が登録されていません（送信者タブで登録・DNS認証）`, from: "" };
  if (row.status !== "verified") return { ok: false, reason: `差出人ドメイン ${domain} のDNS認証が完了していません`, from: "" };
  return { ok: true, from: fromEmail };
}

/** SMTP（Gmail等）の接続テスト */
export async function testSmtp(sender: SenderProfile): Promise<void> {
  const t = nodemailer.createTransport({ host: sender.smtp_host || "smtp.gmail.com", port: sender.smtp_port || 465, secure: (sender.smtp_port || 465) === 465, auth: { user: sender.smtp_user, pass: sender.smtp_pass } });
  await t.verify();
}

export function isOptedOut(email: string): boolean {
  return Boolean(getDb().prepare("SELECT 1 FROM form_email_optouts WHERE email=?").get(email.trim().toLowerCase()));
}
export function optOut(email: string, reason: string) {
  const e = email.trim().toLowerCase();
  if (!e) return;
  getDb().prepare("INSERT OR IGNORE INTO form_email_optouts (email, reason) VALUES (?,?)").run(e, reason);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** 本文（プレーンテキスト）に法定の署名・配信停止を付けてHTML/テキストの両方を作る */
export function buildEmailBody(message: string, sender: SenderProfile, unsubUrl: string): { text: string; html: string } {
  const footerLines = [
    "──────────",
    `${sender.company}${sender.person ? ` ${sender.person}` : ""}`,
    sender.address && `${sender.postal ? `〒${sender.postal} ` : ""}${sender.address}`,
    sender.tel && `TEL: ${sender.tel}`,
    `メール: ${sender.reply_email || sender.email}`,
    sender.url,
    "",
    "今後このご案内が不要な場合は、下記より配信停止いただけます（ワンクリック）。",
    unsubUrl,
  ].filter((l): l is string => typeof l === "string");
  const text = `${message.trim()}\n\n${footerLines.join("\n")}`;
  const paras = message.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 1em;line-height:1.7">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const html = `<div style="font-family:-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif;font-size:14px;color:#1C1710;max-width:640px">${paras}
<hr style="border:0;border-top:1px solid #ddd;margin:20px 0">
<p style="font-size:12px;color:#555;line-height:1.7;margin:0">${footerLines.slice(1, -3).map(esc).join("<br>")}</p>
<p style="font-size:12px;color:#555;margin:12px 0 0">今後このご案内が不要な場合は <a href="${unsubUrl}">こちらから配信停止</a>（ワンクリック）できます。</p></div>`;
  return { text, html };
}

/** 1通送る。戻り値はメッセージID */
export async function sendEmail(sender: SenderProfile, input: { from: string; to: string; subject: string; text: string; html: string; unsubUrl: string }): Promise<string> {
  const headers = { "List-Unsubscribe": `<${input.unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  const replyTo = sender.reply_email || sender.email;
  if (sender.email_method === "smtp") {
    const port = sender.smtp_port || 465;
    const t = nodemailer.createTransport({ host: sender.smtp_host || "smtp.gmail.com", port, secure: port === 465, auth: { user: sender.smtp_user, pass: sender.smtp_pass } });
    const r = await t.sendMail({ from: { name: sender.company, address: input.from }, to: input.to, replyTo, subject: input.subject, text: input.text, html: input.html, headers });
    return r.messageId ?? "";
  }
  if (!emailConfigured()) throw new Error("メール送信サービス（RESEND_API_KEY）が設定されていません");
  const r = await call<{ id: string }>("/emails", {
    method: "POST",
    body: JSON.stringify({ from: `${sender.company} <${input.from}>`, to: [input.to], reply_to: replyTo, subject: input.subject, text: input.text, html: input.html, headers }),
  });
  return r.id;
}

export function unsubUrlFor(token: string) {
  return `${APP_URL}/api/unsubscribe/${token}`;
}

/** Resend の Webhook（svix）署名を検証 */
export function verifyWebhook(rawBody: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = headers.get("svix-id") ?? "";
  const ts = headers.get("svix-timestamp") ?? "";
  const sigs = headers.get("svix-signature") ?? "";
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64");
  return sigs.split(" ").some((s) => {
    const v = s.split(",")[1] ?? "";
    return v.length === expected.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(expected));
  });
}
