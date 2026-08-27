import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { stripeEnv } from "@/lib/server/stripe";
import { INVOICE_PAID } from "@/lib/invoice";

/**
 * Stripe からの通知の受け口。
 *
 * ここはログイン不要（Stripeのサーバーが直接叩くため）。
 * そのかわり「本当にStripeから来たのか」を署名で必ず確認する。
 * 署名が合わないリクエストは中身を一切見ずに捨てる。
 *
 * Stripe側に登録するURL: https://<本番URL>/api/stripe/webhook
 * 受け取るイベント:
 *   checkout.session.completed  … 決済リンクでの支払い完了
 *   payment_intent.succeeded    … 入金確定
 */

export const runtime = "nodejs";
// 署名検証には「生のリクエストボディ」が必要なのでキャッシュさせない
export const dynamic = "force-dynamic";

/** Stripe-Signature ヘッダを検証する（SDKを使わず自前で） */
function verifySignature(payload: string, header: string, secret: string, toleranceSec = 300) {
  const parts = Object.fromEntries(
    header
      .split(",")
      .map((kv) => kv.split("=", 2))
      .filter((kv): kv is [string, string] => kv.length === 2)
      .map(([k, v]) => [k.trim(), v.trim()])
  );
  const timestamp = Number(parts["t"]);
  const signature = parts["v1"];
  if (!timestamp || !signature) return { ok: false, reason: "署名ヘッダの形式が不正です" };

  // 古い通知の使い回し（リプレイ）を防ぐ
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSec > toleranceSec) return { ok: false, reason: "署名の時刻が古すぎます" };

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return { ok: false, reason: "署名が一致しません" };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: "署名が一致しません" };
  return { ok: true, reason: "" };
}

/** 請求書を「入金済」にする。すでに入金済なら何もしない（同じ通知が二重に来ても安全） */
function markPaid(invoiceId: string, sessionId: string | null) {
  const db = getDb();
  const row = db.prepare("SELECT id, status FROM invoices WHERE id = ?").get(invoiceId) as
    | { id: string; status: string }
    | undefined;
  if (!row) return "not_found";
  if (row.status === INVOICE_PAID) return "already_paid";
  db.prepare(
    "UPDATE invoices SET status = ?, paid_at = datetime('now'), stripe_session_id = COALESCE(?, stripe_session_id) WHERE id = ?"
  ).run(INVOICE_PAID, sessionId, invoiceId);
  return "updated";
}

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

export async function POST(req: Request) {
  const { webhookSecret } = stripeEnv();
  if (!webhookSecret) {
    // 鍵がまだ入っていない段階。Stripe側で延々と再送されないよう200で受け流す。
    return NextResponse.json({ received: true, note: "webhook secret not configured" });
  }

  const raw = await req.text();
  const header = req.headers.get("stripe-signature") ?? "";
  const verified = verifySignature(raw, header, webhookSecret);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.reason }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした" }, { status: 400 });
  }

  const object = (event.data?.object ?? {}) as Record<string, unknown>;
  const metadata = (object.metadata ?? {}) as Record<string, string>;
  const invoiceId = metadata.invoice_id ?? "";
  let result = "ignored";

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        if (object.payment_status === "paid" || event.type === "checkout.session.completed") {
          if (invoiceId) result = markPaid(invoiceId, String(object.id ?? "") || null);
        }
        break;
      }
      case "payment_intent.succeeded": {
        if (invoiceId) result = markPaid(invoiceId, null);
        break;
      }
      default:
        result = "ignored";
    }
  } catch {
    // 処理に失敗しても500は返さない。500だとStripeが延々と再送してくる。
    return NextResponse.json({ received: true, result: "error" });
  }

  return NextResponse.json({ received: true, type: event.type ?? "", result });
}

/** ブラウザで開いたときの確認用。設定できているかだけを返す（鍵は返さない）。 */
export async function GET() {
  const { webhookSecret } = stripeEnv();
  return NextResponse.json({
    endpoint: "/api/stripe/webhook",
    method: "POST",
    signingSecretConfigured: Boolean(webhookSecret),
  });
}
