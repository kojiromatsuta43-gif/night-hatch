import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireFormUser, ownedCampaign } from "@/lib/server/form-outreach/access";
import type { Job } from "@/lib/server/form-outreach/schema";
import { launchBrowser } from "@/lib/server/form-outreach/engine";
import { processJob } from "@/lib/server/form-outreach/worker";

type Ctx = { params: Promise<{ id: string }> };

function load(id: string) {
  return getDb().prepare("SELECT * FROM form_jobs WHERE id=?").get(Number(id)) as Job | undefined;
}

/** 1社分の詳細（ログ・送った文面） */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  const j = load(id);
  if (!j || !ownedCampaign(user, j.campaign_id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ...j, hasShot: Boolean(j.screenshot_path) });
}

/** 再試行 */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  const j = load(id);
  if (!j || !ownedCampaign(user, j.campaign_id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (j.status === "sending") return NextResponse.json({ error: "送信中です" }, { status: 400 });
  const browser = await launchBrowser();
  try {
    const r = await processJob(browser, j.id);
    return NextResponse.json({ status: r.status, detail: r.result_text.split("\n")[0] });
  } finally {
    await browser.close().catch(() => {});
  }
}
