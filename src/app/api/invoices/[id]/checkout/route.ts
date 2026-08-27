import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { INVOICE_PAID, InvoiceItem, Rounding, summarize } from "@/lib/invoice";
import { publicUrl, stripeApi, stripeEnv } from "@/lib/server/stripe";

/**
 * 請求書のお支払いリンクを作る。
 *
 * 大事な点: 決済セッションは「お客様のStripeアカウント」の上に作る。
 * つまり代金は お客様の取引先 → お客様 へ直接入る。当社は預からない。
 * （stripeApi の accountId がその指定）
 *
 * 日本円は「最小単位＝1円」なので、金額はそのまま渡してよい。
 */

type InvoiceRow = {
  id: string;
  user_id: string;
  invoice_no: string;
  title: string;
  status: string;
  partner_name: string;
  amount: number;
  payment_url: string | null;
  stripe_session_id: string | null;
};

/** Stripeが受け付ける日本円の下限 */
const MIN_JPY = 50;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const db = getDb();

  const env = stripeEnv();
  if (!env.secretKey) {
    return NextResponse.json({ error: "Stripeの鍵が未設定です。決済の設定をご確認ください。" }, { status: 503 });
  }

  const invoice = db
    .prepare("SELECT * FROM invoices WHERE id = ? AND user_id = ?")
    .get(id, user.id) as InvoiceRow | undefined;
  if (!invoice) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
  if (invoice.status === INVOICE_PAID) {
    return NextResponse.json({ error: "この請求書はすでに入金済みです" }, { status: 409 });
  }

  const profile = db
    .prepare("SELECT stripe_account_id, company_name, rounding FROM issuer_profiles WHERE user_id = ?")
    .get(user.id) as { stripe_account_id: string | null; company_name: string; rounding: Rounding } | undefined;

  if (!profile?.stripe_account_id) {
    return NextResponse.json(
      { error: "ご自身のStripeアカウントが未連携です。「決済の設定」から連携してください。" },
      { status: 400 }
    );
  }

  const items = db
    .prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order")
    .all(id) as InvoiceItem[];
  const { total } = summarize(items, profile.rounding ?? "切り捨て");

  if (total < MIN_JPY) {
    return NextResponse.json(
      { error: `決済できる下限は${MIN_JPY}円です。明細をご確認ください。` },
      { status: 400 }
    );
  }

  // 支払う人はログインしていないので、戻り先は誰でも見られるページにする
  const base = publicUrl(_req);
  const label = [invoice.invoice_no, invoice.title].filter(Boolean).join(" ") || "ご請求";

  try {
    const session = await stripeApi("/v1/checkout/sessions", {
      method: "POST",
      accountId: profile.stripe_account_id,
      body: {
        mode: "payment",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "jpy",
        "line_items[0][price_data][unit_amount]": String(total),
        "line_items[0][price_data][product_data][name]": label.slice(0, 250),
        "line_items[0][price_data][product_data][description]":
          (profile.company_name ? `${profile.company_name} からのご請求` : "ご請求").slice(0, 250),
        success_url: `${base}/pay/thanks?invoice=${id}`,
        cancel_url: `${base}/pay/canceled`,
        // Webhookで請求書を特定するための目印。両方に付けておく
        "metadata[invoice_id]": id,
        "payment_intent_data[metadata][invoice_id]": id,
        client_reference_id: id,
      },
    });

    const url: string = session?.url ?? "";
    if (!url) throw new Error("Stripeから支払いリンクを受け取れませんでした");

    db.prepare("UPDATE invoices SET payment_url = ?, stripe_session_id = ? WHERE id = ? AND user_id = ?")
      .run(url, String(session.id ?? ""), id, user.id);

    return NextResponse.json({ url, amount: total });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "支払いリンクの作成に失敗しました" },
      { status: 502 }
    );
  }
}

/** 作成済みのリンクを取り消す（作り直したいとき） */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  getDb()
    .prepare("UPDATE invoices SET payment_url = '', stripe_session_id = NULL WHERE id = ? AND user_id = ?")
    .run(id, user.id);
  return NextResponse.json({ ok: true });
}
