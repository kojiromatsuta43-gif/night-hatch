import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { importLeads, listLeads, type LeadInput } from "@/lib/server/sales";
import { getDb } from "@/lib/server/db";
import { addLeadsToCampaign, formUrlFromLead, type LeadLike } from "@/lib/server/form-outreach/worker";
import { ensureFormTables } from "@/lib/server/form-outreach/schema";

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** 一覧（絞り込み・ページ送り） */
export async function GET(req: Request) {
  const user = await requireUser();
  const u = new URL(req.url);
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  return NextResponse.json(
    listLeads(user, {
      q: g("q")?.trim() || undefined,
      prefecture: g("pref") || undefined,
      industry: g("industry") || undefined,
      status: g("status") || undefined,
      projectId: g("project") || undefined,
      empMin: num(u.searchParams.get("empMin")),
      empMax: num(u.searchParams.get("empMax")),
      page: num(u.searchParams.get("page")),
      perPage: num(u.searchParams.get("perPage")),
    })
  );
}

/** CSV から取り込み（画面側で列を対応付けた行の配列を受け取る） */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role === "freelancer") return NextResponse.json({ error: "リストの取り込みは発注者アカウントで行ってください" }, { status: 403 });
  const b = await req.json().catch(() => null);
  const rows = Array.isArray(b?.rows) ? (b.rows as LeadInput[]) : [];
  if (rows.length === 0) return NextResponse.json({ error: "取り込む行がありません" }, { status: 400 });
  if (rows.length > 5000) return NextResponse.json({ error: "一度に取り込めるのは5,000件までです" }, { status: 400 });
  const result = importLeads(user.id, rows, String(b?.source ?? ""));
  // 取り込んだ会社をそのままフォーム営業のキャンペーンにも入れる（任意）
  const campaignId = typeof b?.campaignId === "string" ? b.campaignId : "";
  if (campaignId && result.ids.length) {
    ensureFormTables();
    const db = getDb();
    const c = db.prepare("SELECT id, user_id FROM form_campaigns WHERE id = ?").get(campaignId) as { id: string; user_id: string } | undefined;
    if (!c || (c.user_id !== user.id && user.role !== "admin")) return NextResponse.json({ error: "キャンペーンが見つかりません" }, { status: 404 });
    const leads = db
      .prepare(`SELECT id, company, form_url, website, industry, prefecture, contact_name, memo FROM sales_leads WHERE id IN (${result.ids.map(() => "?").join(",")})`)
      .all(...result.ids) as LeadLike[];
    const form = addLeadsToCampaign(campaignId, leads);
    return NextResponse.json({ ...result, ids: undefined, form: { ...form, withUrl: leads.filter((l) => formUrlFromLead(l) || l.website).length } });
  }
  return NextResponse.json({ ...result, ids: undefined });
}
