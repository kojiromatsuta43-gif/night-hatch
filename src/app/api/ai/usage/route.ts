import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { usageSummary, buyExtraPack } from "@/lib/server/ai-usage";

/** 自分のAI利用状況（残り回数） */
export async function GET() {
  const user = await requireUser();
  return NextResponse.json(usageSummary(user.id));
}

/** 追加パックをはちみつPで購入 */
export async function POST(req: Request) {
  const user = await requireUser();
  const b = await req.json().catch(() => ({}));
  if (!b?.buy) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    return NextResponse.json(buyExtraPack(user.id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "購入できませんでした" }, { status: 400 });
  }
}
