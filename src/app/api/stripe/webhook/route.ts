import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { notify } from "@/lib/server/notifications";
import { stripeEnv } from "@/lib/server/stripe";
import { creditPoints, activatePlan } from "@/lib/server/points-ledger";
import { INVOICE_PAID } from "@/lib/invoice";
import { isValidPack, priceInclTax, planOf } from "@/lib/points";

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

/**
 * ハニーPを付与する。
 * session_id を主キーにした表へ先に入れることで、同じ通知が二度届いても
 * 二重に付与されない（2回目は INSERT が弾かれて何もしない）。
 */
function grantPoints(sessionId: string, meta: Record<string, string>) {
  const userId = meta.user_id ?? "";
  const points = Number(meta.points);
  if (!userId || !isValidPack(points)) return "bad_metadata";
  if (!sessionId) return "no_session";

  const db = getDb();
  const user = db.prepare("SELECT id, name FROM users WHERE id = ?").get(userId) as
    | { id: string; name: string }
    | undefined;
  if (!user) return "user_not_found";

  let result = "already_granted";
  db.transaction(() => {
    const ins = db
      .prepare(
        "INSERT OR IGNORE INTO point_purchases (session_id, user_id, points, amount_jpy) VALUES (?,?,?,?)"
      )
      .run(sessionId, userId, points, priceInclTax(points));
    if (ins.changes === 0) return; // すでに付与済み

    // 追加購入分は失効しない
    creditPoints(db, userId, points, "purchase", `ハニーP購入 ${points}pt（¥${priceInclTax(points).toLocaleString()} 税込）`, null);
    notify(userId, {
      id: `points:${sessionId}`,
      kind: "points",
      title: `ハニーPを${points}pt追加しました`,
      body: `お支払いを確認しました。残高に反映されています。`,
      link: "/points",
    });
    result = "granted";
  })();

  return result;
}

/**
 * プラン申込みの確定。
 * session_id を主キーにした表で二重処理を防ぎ、プランを有効化して今月分を付与する。
 */
function startPlan(sessionId: string, meta: Record<string, string>, object: Record<string, unknown>) {
  const userId = meta.user_id ?? "";
  const plan = planOf(meta.plan_id ?? "");
  if (!userId || !plan || !sessionId) return "bad_metadata";
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | undefined;
  if (!user) return "user_not_found";

  const ins = db
    .prepare("INSERT OR IGNORE INTO point_purchases (session_id, user_id, points, amount_jpy) VALUES (?,?,?,?)")
    .run(sessionId, userId, plan.points, Number(object.amount_total ?? 0));
  if (ins.changes === 0) return "already_started";

  db.prepare(
    "UPDATE users SET stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?"
  ).run(String(object.customer ?? "") || null, String(object.subscription ?? "") || null, userId);
  activatePlan(userId, plan.id, true); // 今月分のハニーPもここで付与される
  notify(userId, {
    id: `plan_start:${sessionId}`,
    kind: "points",
    title: `${plan.name}プランの契約が始まりました`,
    body: `お支払いを確認しました。毎月${plan.points}ハニーPが自動で付与されます（繰越${plan.carryMonths}ヶ月）。`,
    link: "/points",
  });
  return "started";
}

/** 定期課金の解約 → プランを停止する */
function stopPlanBySubscription(subscriptionId: string) {
  if (!subscriptionId) return "no_subscription";
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE stripe_subscription_id = ?").get(subscriptionId) as
    | { id: string }
    | undefined;
  if (!user) return "user_not_found";
  db.prepare("UPDATE users SET plan_active = 0, stripe_subscription_id = NULL WHERE id = ?").run(user.id);
  notify(user.id, {
    id: `plan_stop:${subscriptionId}`,
    kind: "points",
    title: "プランの定期課金が終了しました",
    body: "付与済みのハニーPは繰越期限まで使えます。",
    link: "/points",
  });
  return "stopped";
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
        const paid = object.payment_status === "paid" || event.type === "checkout.session.completed";
        if (!paid) break;
        if (metadata.kind === "points") {
          // ポイントの追加購入
          result = grantPoints(String(object.id ?? ""), metadata);
        } else if (metadata.kind === "plan") {
          // プラン申込み
          result = startPlan(String(object.id ?? ""), metadata, object);
        } else if (invoiceId) {
          // 請求書のお支払い
          result = markPaid(invoiceId, String(object.id ?? "") || null);
        }
        break;
      }
      case "payment_intent.succeeded": {
        // ポイント購入は checkout.session.completed 側で確定させる。
        // ここで二重に処理しないよう、請求書だけを見る。
        if (metadata.kind !== "points" && invoiceId) result = markPaid(invoiceId, null);
        break;
      }
      case "customer.subscription.deleted": {
        result = stopPlanBySubscription(String(object.id ?? ""));
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
