import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireFormUser, ownedCampaign } from "@/lib/server/form-outreach/access";
import { addLeadsToCampaign, type LeadLike } from "@/lib/server/form-outreach/worker";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 営業リストの会社をキャンペーンに追加。
 * { leadIds: string[] } で選んだ会社、または { all: true, industry?, prefecture?, status? } で自分のリストから条件に合う会社を。
 * フォームURLか企業URLのある会社だけが対象（企業DBから追加した会社は問合せフォームURL付き）。
 */
export async function POST(req: Request, ctx: Ctx) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  const c = ownedCampaign(user, id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const db = getDb();
  const ownerId = c.user_id;
  let rows: LeadLike[] = [];
  if (Array.isArray(b.leadIds) && b.leadIds.length) {
    const ids = (b.leadIds as unknown[]).map(String).slice(0, 5000);
    rows = db.prepare(`SELECT id, company, form_url, website, industry, prefecture, contact_name, memo FROM sales_leads WHERE user_id=? AND id IN (${ids.map(() => "?").join(",")})`).all(ownerId, ...ids) as LeadLike[];
  } else if (b.all) {
    const conds = ["user_id = ?", "(form_url != '' OR website != '' OR memo LIKE '%問合せフォーム:%')"];
    const params: unknown[] = [ownerId];
    if (b.industry) { conds.push("industry = ?"); params.push(String(b.industry)); }
    if (b.prefecture) { conds.push("prefecture = ?"); params.push(String(b.prefecture)); }
    if (b.status) { conds.push("status = ?"); params.push(String(b.status)); }
    const limit = Math.min(5000, Math.max(1, Number(b.limit) || 5000));
    rows = db.prepare(`SELECT id, company, form_url, website, industry, prefecture, contact_name, memo FROM sales_leads WHERE ${conds.join(" AND ")} ORDER BY created_at LIMIT ${limit}`).all(...params) as LeadLike[];
  } else {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const summary = addLeadsToCampaign(id, rows);
  return NextResponse.json({ ...summary, picked: rows.length });
}
