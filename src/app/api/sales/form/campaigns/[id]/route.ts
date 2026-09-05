import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireFormUser, ownedCampaign, s, n } from "@/lib/server/form-outreach/access";
import { STATUS_LABEL, type Job, type SenderProfile } from "@/lib/server/form-outreach/schema";
import { isRunning, requestStop, runCampaign, inSendWindow, sentToday, workerEnabled } from "@/lib/server/form-outreach/worker";

type Ctx = { params: Promise<{ id: string }> };

/** キャンペーン詳細: 設定・件数・送信一覧 */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  const c = ownedCampaign(user, id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const db = getDb();
  const sender = db.prepare("SELECT * FROM form_senders WHERE id=?").get(c.sender_id) as SenderProfile | undefined;
  const counts: Record<string, number> = {};
  for (const r of db.prepare("SELECT status, COUNT(*) n FROM form_jobs WHERE campaign_id=? AND is_test=0 GROUP BY status").all(id) as { status: string; n: number }[]) counts[r.status] = r.n;
  const jobs = db
    .prepare("SELECT id, lead_id, company_name, form_url, domain, industry, is_test, status, result_text, sent_at, updated_at, attempts, channel, email FROM form_jobs WHERE campaign_id=? ORDER BY updated_at DESC, id DESC LIMIT 300")
    .all(id)
    .map((j) => ({ ...(j as Job), result_text: String((j as Job).result_text || "").split("\n")[0].slice(0, 120) }));
  return NextResponse.json({
    campaign: c,
    sender: sender ?? null,
    counts,
    jobs,
    running: isRunning(id),
    windowOk: inSendWindow(c),
    sentToday: sentToday(id, "form"),
    emailSentToday: sentToday(id, "email"),
    statusLabel: STATUS_LABEL,
    workerEnabled: workerEnabled(),
  });
}

/** 開始 / 一時停止 / 設定変更 */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  const c = ownedCampaign(user, id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const db = getDb();

  if (b.action === "start") {
    const queued = (db.prepare("SELECT COUNT(*) n FROM form_jobs WHERE campaign_id=? AND status='queued' AND is_test=0").get(id) as { n: number }).n;
    if (!queued) return NextResponse.json({ error: "待機中の会社がありません" }, { status: 400 });
    db.prepare("UPDATE form_campaigns SET status='running' WHERE id=?").run(id);
    if (!workerEnabled()) return NextResponse.json({ ok: true, note: "このサーバーでは送信ワーカーが無効です。ワーカー側で拾われます" });
    if (!isRunning(id)) void runCampaign(id, { ignoreWindow: Boolean(b.ignoreWindow) });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "pause") {
    requestStop(id);
    db.prepare("UPDATE form_campaigns SET status='paused' WHERE id=?").run(id);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "update") {
    if (isRunning(id)) return NextResponse.json({ error: "実行中は変更できません。一時停止してください" }, { status: 400 });
    const mode = ["template", "ai", "hybrid"].includes(b.mode) ? b.mode : c.mode;
    const channel = ["form", "email", "both"].includes(b.channel) ? b.channel : c.channel;
    db.prepare(
      `UPDATE form_campaigns SET name=?, mode=?, subject_text=?, template_text=?, ai_instruction=?, daily_limit=?, send_window_start=?, send_window_end=?, weekdays_only=?, sender_id=?, channel=?, email_daily_limit=? WHERE id=?`
    ).run(
      s(b.name, 80) || c.name, mode, s(b.subject_text, 120), s(b.template_text, 4000) || c.template_text, s(b.ai_instruction, 500),
      Math.min(2000, Math.max(1, n(b.daily_limit, c.daily_limit))), Math.min(23, Math.max(0, n(b.send_window_start, c.send_window_start))),
      Math.min(24, Math.max(1, n(b.send_window_end, c.send_window_end))), b.weekdays_only === false || b.weekdays_only === 0 ? 0 : 1,
      s(b.sender_id, 64) || c.sender_id, channel, Math.min(5000, Math.max(1, n(b.email_daily_limit, c.email_daily_limit))), id
    );
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  const c = ownedCampaign(user, id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (isRunning(id)) return NextResponse.json({ error: "実行中は削除できません" }, { status: 400 });
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM form_jobs WHERE campaign_id=?").run(id);
    db.prepare("DELETE FROM form_campaigns WHERE id=?").run(id);
  })();
  return NextResponse.json({ ok: true });
}
