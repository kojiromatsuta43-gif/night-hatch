import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { ensureFormTables } from "@/lib/server/form-outreach/schema";
import { optOut, verifyWebhook } from "@/lib/server/form-outreach/email";

/**
 * Resend の Webhook。不達（bounce）・苦情（complaint）のアドレスを配信停止に入れ、ジョブを「不達」にする。
 * Resend 側に登録するURL: https://<本番URL>/api/email/webhook 、署名シークレットを RESEND_WEBHOOK_SECRET に。
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers)) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const ev = JSON.parse(raw) as { type: string; data?: { email_id?: string; to?: string[] } };
  ensureFormTables();
  const db = getDb();
  const to = (ev.data?.to ?? []).map((e) => e.toLowerCase());
  const msgId = ev.data?.email_id ?? "";
  if (ev.type === "email.bounced" || ev.type === "email.complained") {
    for (const e of to) optOut(e, ev.type === "email.bounced" ? "不達（バウンス）" : "迷惑メール報告");
    if (msgId) db.prepare("UPDATE form_jobs SET status='bounced', result_text=?, updated_at=datetime('now') WHERE provider_message_id=?").run(ev.type === "email.bounced" ? "不達（バウンス）" : "迷惑メール報告", msgId);
  }
  return NextResponse.json({ ok: true });
}
