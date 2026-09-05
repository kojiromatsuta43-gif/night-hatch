import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireFormUser, s, n } from "@/lib/server/form-outreach/access";
import { DEFAULT_TEMPLATE } from "@/lib/server/form-outreach/message";
import { FORM_BLOCK_POINTS, FORM_BLOCK_SIZE } from "@/lib/server/form-outreach/schema";
import { isRunning, workerEnabled } from "@/lib/server/form-outreach/worker";
import { activeProvider } from "@/lib/server/llm";
import { emailConfigured } from "@/lib/server/form-outreach/email";

/** キャンペーン一覧（管理者は全員分） */
export async function GET() {
  const user = await requireFormUser();
  const db = getDb();
  const where = user.role === "admin" ? "" : "WHERE c.user_id = ?";
  const rows = db
    .prepare(
      `SELECT c.*, u.name AS owner_name, sn.label AS sender_label,
        (SELECT COUNT(*) FROM form_jobs j WHERE j.campaign_id=c.id AND j.is_test=0) AS total,
        (SELECT COUNT(*) FROM form_jobs j WHERE j.campaign_id=c.id AND j.is_test=0 AND j.status='sent') AS sent,
        (SELECT COUNT(*) FROM form_jobs j WHERE j.campaign_id=c.id AND j.is_test=0 AND j.status='queued') AS queued
       FROM form_campaigns c JOIN users u ON u.id=c.user_id LEFT JOIN form_senders sn ON sn.id=c.sender_id ${where} ORDER BY c.created_at DESC`
    )
    .all(...(where ? [user.id] : []))
    .map((r) => ({ ...(r as object), running: isRunning((r as { id: string }).id) }));
  return NextResponse.json({
    items: rows,
    defaults: { template_text: DEFAULT_TEMPLATE, subject_text: "ショート動画制作サービスのご案内" },
    ai: activeProvider(),
    workerEnabled: workerEnabled(),
    emailConfigured: emailConfigured(),
    pricing: user.role === "admin" ? null : { block: FORM_BLOCK_SIZE, points: FORM_BLOCK_POINTS },
  });
}

export async function POST(req: Request) {
  const user = await requireFormUser();
  const b = await req.json().catch(() => ({}));
  const db = getDb();
  const sender = db.prepare("SELECT id FROM form_senders WHERE id=? AND user_id=?").get(s(b.sender_id, 64), user.id);
  if (!sender) return NextResponse.json({ error: "送信者を選んでください" }, { status: 400 });
  const name = s(b.name, 80);
  if (!name) return NextResponse.json({ error: "キャンペーン名を入れてください" }, { status: 400 });
  const mode = ["template", "ai", "hybrid"].includes(b.mode) ? b.mode : "hybrid";
  const id = crypto.randomUUID();
  const channel = ["form", "email", "both"].includes(b.channel) ? b.channel : "form";
  db.prepare(
    `INSERT INTO form_campaigns (id, user_id, name, sender_id, mode, subject_text, template_text, ai_instruction, daily_limit, send_window_start, send_window_end, weekdays_only, channel, email_daily_limit)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, user.id, name, s(b.sender_id, 64), mode, s(b.subject_text, 120), s(b.template_text, 4000) || DEFAULT_TEMPLATE, s(b.ai_instruction, 500),
    Math.min(2000, Math.max(1, n(b.daily_limit, 300))), Math.min(23, Math.max(0, n(b.send_window_start, 9))), Math.min(24, Math.max(1, n(b.send_window_end, 18))), b.weekdays_only === false || b.weekdays_only === 0 ? 0 : 1,
    channel, Math.min(5000, Math.max(1, n(b.email_daily_limit, 100)))
  );
  return NextResponse.json({ id });
}
