/**
 * Stripe連携。
 *
 * 方針: 当社は代金を預からない。お客様が自分のStripeアカウントを繋ぎ、
 * 請求書の決済リンクから「お客様の取引先 → お客様」へ直接入金される形にする。
 * こうすることで資金移動業の論点を避けられる（SODATSUと同じ座組）。
 *
 * 鍵はすべて環境変数から読む。値をログや画面に出さないこと。
 */

export type StripeEnv = {
  publishableKey: string;
  secretKey: string;
  clientId: string;
  webhookSecret: string;
};

export function stripeEnv(): StripeEnv {
  return {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    clientId: process.env.STRIPE_CONNECT_CLIENT_ID ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  };
}

/** テスト環境か本番かをキーの接頭辞から判定する */
export function stripeMode(secretKey: string): "test" | "live" | null {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return null;
}

/** この画面の機能を使える状態か */
export function isStripeReady(env: StripeEnv) {
  return Boolean(env.secretKey && env.clientId);
}

/** 公開URL（リダイレクト先の組み立てに使う） */
export function publicUrl(req: Request): string {
  const fromEnv = process.env.APP_PUBLIC_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/** Stripe REST API を叩く（SDKは使わず fetch で完結させる） */
export async function stripeApi(
  path: string,
  init: { method?: string; body?: Record<string, string>; accountId?: string } = {}
) {
  const { secretKey } = stripeEnv();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY が設定されていません");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  // 連携先アカウントとして操作する場合
  if (init.accountId) headers["Stripe-Account"] = init.accountId;

  const res = await fetch(`https://api.stripe.com${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body ? new URLSearchParams(init.body).toString() : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Stripe APIエラー (${res.status})`);
  }
  return data;
}
