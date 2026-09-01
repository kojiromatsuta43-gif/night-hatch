import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { updateLead } from "@/lib/server/sales";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  try {
    const lead = updateLead(user, id, b);
    if (!lead) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "更新できませんでした" }, { status: 400 });
  }
}
