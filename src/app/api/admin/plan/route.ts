import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { planOf, PLANS } from "@/lib/points";
import { activatePlan, expiringSoon } from "@/lib/server/points-ledger";
import { notify } from "@/lib/server/notifications";

/**
 * プラン契約の管理（管理者のみ）。
 * 銀行振込など Stripe を通らない契約は、ここで有効にする。
 * 有効にした瞬間に今月分のハニーPが付与される（付与済みなら二重にはならない）。
 */
export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, email, points, plan, plan_active, plan_since, tiktok_handle,
              (stripe_subscription_id IS NOT NULL) AS via_stripe
         FROM users WHERE role = 'client' ORDER BY plan_active DESC, name`
    )
    .all() as Record<string, unknown>[];
  const withExpiry = rows.map((r) => ({
    ...r,
    expiring: expiringSoon(String(r.id), 60),
  }));
  return NextResponse.json({ plans: PLANS, users: withExpiry });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const targetId = String(b?.user_id ?? "");
  const db = getDb();
  const target = db.prepare("SELECT id, plan, plan_active FROM users WHERE id = ?").get(targetId) as
    | { id: string; plan: string; plan_active: number }
    | undefined;
  if (!target) return NextResponse.json({ error: "対象のユーザーが見つかりません" }, { status: 404 });

  // TikTokアカウントの紐付け（月次レポートの「動画の伸び」に使う）
  if (typeof b?.tiktok_handle === "string") {
    const h = b.tiktok_handle.trim();
    const normalized = h && !h.startsWith("@") ? `@${h}` : h;
    db.prepare("UPDATE users SET tiktok_handle = ? WHERE id = ?").run(normalized, targetId);
  }

  if (typeof b?.plan === "string" || typeof b?.active === "boolean") {
    const planId = typeof b?.plan === "string" && planOf(b.plan) ? b.plan : target.plan;
    const active = typeof b?.active === "boolean" ? b.active : target.plan_active === 1;
    activatePlan(targetId, planId, active);
    if (active && target.plan_active !== 1) {
      const plan = planOf(planId);
      notify(targetId, {
        kind: "points",
        title: `${plan?.name ?? ""}プランの契約が始まりました`,
        body: `毎月${plan?.points ?? 0}ハニーPが自動で付与されます（繰越${plan?.carryMonths ?? 0}ヶ月）。`,
        link: "/points",
      });
    }
  }
  return NextResponse.json({ ok: true });
}
