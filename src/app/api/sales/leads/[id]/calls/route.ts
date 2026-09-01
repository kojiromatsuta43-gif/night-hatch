import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { listCalls, recordCall } from "@/lib/server/sales";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const calls = listCalls(user, id);
  if (!calls) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json(calls);
}

/** 架電結果を1件記録 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  try {
    const lead = recordCall(user, id, String(b?.result ?? ""), String(b?.note ?? ""));
    if (!lead) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "記録できませんでした" }, { status: 400 });
  }
}
