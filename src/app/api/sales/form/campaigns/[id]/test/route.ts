import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireFormUser, ownedCampaign, s } from "@/lib/server/form-outreach/access";
import { domainOf } from "@/lib/server/form-outreach/schema";
import { launchBrowser } from "@/lib/server/form-outreach/engine";
import { processJob } from "@/lib/server/form-outreach/worker";

/** テスト送信: 自社のフォームURLに「入力だけ（dry）」または「実際に送信」 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  if (!ownedCampaign(user, id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const url = s(b.url, 500);
  if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: "テスト先のフォームURLを入れてください" }, { status: 400 });
  const company = s(b.company, 80) || "テスト株式会社";
  const dry = Boolean(b.dry);
  const r = getDb()
    .prepare("INSERT INTO form_jobs (campaign_id, company_name, form_url, site_url, industry, domain, is_test) VALUES (?,?,?,?,?,?,1)")
    .run(id, company, url, url, "テスト業種", domainOf(url));
  const jobId = Number(r.lastInsertRowid);
  const browser = await launchBrowser();
  try {
    const j = await processJob(browser, jobId, { dryRun: dry });
    return NextResponse.json({ jobId: j.id, status: j.status, detail: j.result_text.split("\n")[0] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "テストに失敗しました" }, { status: 400 });
  } finally {
    await browser.close().catch(() => {});
  }
}
