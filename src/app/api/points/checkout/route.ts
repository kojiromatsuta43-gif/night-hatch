import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { isValidPack, priceInclTax } from "@/lib/points";
import { publicUrl, stripeApi, stripeEnv } from "@/lib/server/stripe";

/**
 * はちみつPの追加購入。
 *
 * お金の流れは「クライアント企業 → 当社」なので、決済セッションは
 * この環境のStripe（＝当社のStripe）にそのまま作る。Connectは使わない。
 *
 * ポイントを増やすのはここではなく、支払いが確定してから Webhook 側で行う。
 * 画面を閉じられても、戻り先URLを直接叩かれても、付与されるのは実際に払われた分だけ。
 */
export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const points = Number(body?.points);

  if (!isValidPack(points)) {
    return NextResponse.json({ error: "購入できる単位ではありません" }, { status: 400 });
  }

  const env = stripeEnv();
  if (!env.secretKey) {
    return NextResponse.json(
      { error: "決済の準備が整っていません。管理者にお問い合わせください。" },
      { status: 503 }
    );
  }

  const amount = priceInclTax(points);
  const base = publicUrl(req);

  try {
    const session = await stripeApi("/v1/checkout/sessions", {
      method: "POST",
      body: {
        mode: "payment",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "jpy",
        "line_items[0][price_data][unit_amount]": String(amount),
        "line_items[0][price_data][product_data][name]": `はちみつP ${points}pt`,
        "line_items[0][price_data][product_data][description]": "BRIDGE HATCH の制作ポイント（税込）",
        success_url: `${base}/points?paid=1`,
        cancel_url: `${base}/points?canceled=1`,
        // Webhookで「誰に何ポイント足すか」を判断するための情報
        "metadata[kind]": "points",
        "metadata[user_id]": user.id,
        "metadata[points]": String(points),
        "payment_intent_data[metadata][kind]": "points",
        "payment_intent_data[metadata][user_id]": user.id,
        "payment_intent_data[metadata][points]": String(points),
        client_reference_id: user.id,
        customer_email: user.email,
      },
    });

    const url: string = session?.url ?? "";
    if (!url) throw new Error("Stripeから決済画面のURLを受け取れませんでした");
    return NextResponse.json({ url, amount, points });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "決済画面を作れませんでした" },
      { status: 502 }
    );
  }
}
