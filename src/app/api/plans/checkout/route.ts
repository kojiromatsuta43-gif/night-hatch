import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";
import { requireUser } from "@/lib/server/auth";
import { planOf, POINT_TAX_RATE } from "@/lib/points";
import { publicUrl, stripeApi, stripeEnv } from "@/lib/server/stripe";

/** 税込金額（円） */
function inclTax(v: number) {
  return v + Math.floor((v * POINT_TAX_RATE) / 100);
}

/**
 * 月額プランの申込み。
 *
 * Stripe の定期課金（サブスクリプション）で「初回 = 初期費用＋月額、以降 = 月額」を作る。
 * プランの有効化とハニーPの付与はここではなく、支払い完了後の Webhook 側で行う。
 * テスト鍵のうちは本物のお金は動かない。本番鍵に差し替えるだけで実課金に切り替わる。
 */
export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const plan = planOf(String(body?.plan ?? ""));
  if (!plan) return NextResponse.json({ error: "プランを選んでください" }, { status: 400 });
  if (user.role !== "client") {
    return NextResponse.json({ error: "プランの申込みはクライアントアカウントから行ってください" }, { status: 400 });
  }

  const env = stripeEnv();
  if (!env.secretKey) {
    return NextResponse.json(
      { error: "決済の準備が整っていません。管理者にお問い合わせください。" },
      { status: 503 }
    );
  }

  const base = publicUrl(req);
  const stripeBody: Record<string, string> = {
    mode: "subscription",
    // 毎月の分（税込）
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "jpy",
    "line_items[0][price_data][unit_amount]": String(inclTax(plan.monthly)),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `${BRAND.name} ${plan.name}プラン（月額）`,
    "line_items[0][price_data][product_data][description]": `毎月 ${plan.points}ハニーP付与・繰越${plan.carryMonths}ヶ月（税込）`,
    success_url: `${base}/points?plan_paid=1`,
    cancel_url: `${base}/points?canceled=1`,
    "metadata[kind]": "plan",
    "metadata[user_id]": user.id,
    "metadata[plan_id]": plan.id,
    "subscription_data[metadata][kind]": "plan",
    "subscription_data[metadata][user_id]": user.id,
    "subscription_data[metadata][plan_id]": plan.id,
    client_reference_id: user.id,
    customer_email: user.email,
  };
  // 初期費用（初回だけ・税込）
  if (plan.initial > 0) {
    stripeBody["line_items[1][quantity]"] = "1";
    stripeBody["line_items[1][price_data][currency]"] = "jpy";
    stripeBody["line_items[1][price_data][unit_amount]"] = String(inclTax(plan.initial));
    stripeBody["line_items[1][price_data][product_data][name]"] = `${BRAND.name} 初期費用（初回のみ）`;
  }

  try {
    const session = await stripeApi("/v1/checkout/sessions", { method: "POST", body: stripeBody });
    const url: string = session?.url ?? "";
    if (!url) throw new Error("Stripeから決済画面のURLを受け取れませんでした");
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "決済画面を作れませんでした" },
      { status: 502 }
    );
  }
}
