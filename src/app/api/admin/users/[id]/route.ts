import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

const PLANS = ["light", "standard", "premium", "unlimited"];

/** 管理者がユーザーのプランを変更する */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  const plan = String(b?.plan ?? "");
  if (!PLANS.includes(plan)) return NextResponse.json({ error: "プランが不正です" }, { status: 400 });
  const r = getDb().prepare("UPDATE users SET plan = ? WHERE id = ?").run(plan, id);
  if (r.changes === 0) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
