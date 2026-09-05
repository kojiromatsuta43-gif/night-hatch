import { NextResponse } from "next/server";
import { requireFormUser, ownedCampaign } from "@/lib/server/form-outreach/access";
import { previewMessage } from "@/lib/server/form-outreach/worker";

/** 先頭（または指定）の会社向けの文面を作って返す。送信はしない */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  if (!ownedCampaign(user, id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  try {
    const r = await previewMessage(id, b.jobId ? Number(b.jobId) : undefined);
    return NextResponse.json({ company: r.job.company_name, industry: r.job.sub_industry || r.job.industry, subject: r.subject, message: r.message, aiUsed: r.aiUsed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "プレビューを作れませんでした" }, { status: 400 });
  }
}
