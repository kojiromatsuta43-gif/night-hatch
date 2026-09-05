import { NextResponse } from "next/server";
import fs from "fs";
import { getDb } from "@/lib/server/db";
import { requireFormUser, ownedCampaign } from "@/lib/server/form-outreach/access";
import type { Job } from "@/lib/server/form-outreach/schema";

/** 送信時のスクリーンショット（PNG） */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireFormUser();
  const { id } = await ctx.params;
  const j = getDb().prepare("SELECT * FROM form_jobs WHERE id=?").get(Number(id)) as Job | undefined;
  if (!j || !ownedCampaign(user, j.campaign_id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!j.screenshot_path || !fs.existsSync(j.screenshot_path)) return NextResponse.json({ error: "no screenshot" }, { status: 404 });
  const buf = fs.readFileSync(j.screenshot_path);
  return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=600" } });
}
