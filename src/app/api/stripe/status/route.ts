import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { isStripeReady, stripeApi, stripeEnv, stripeMode } from "@/lib/server/stripe";

/**
 * 設定の進み具合を返す。
 * 鍵そのものは絶対に返さない。「入っているかどうか」だけを返す。
 */
export async function GET() {
  const user = await requireUser();
  const env = stripeEnv();

  let apiReachable = false;
  let apiError = "";
  if (env.secretKey) {
    try {
      await stripeApi("/v1/balance");
      apiReachable = true;
    } catch (e) {
      apiError = e instanceof Error ? e.message : "接続できませんでした";
    }
  }

  const profile = getDb()
    .prepare("SELECT stripe_account_id, stripe_account_name FROM issuer_profiles WHERE user_id = ?")
    .get(user.id) as { stripe_account_id: string | null; stripe_account_name: string | null } | undefined;

  return NextResponse.json({
    keys: {
      publishableKey: Boolean(env.publishableKey),
      secretKey: Boolean(env.secretKey),
      clientId: Boolean(env.clientId),
      webhookSecret: Boolean(env.webhookSecret),
    },
    mode: stripeMode(env.secretKey),
    ready: isStripeReady(env),
    apiReachable,
    apiError,
    connected: Boolean(profile?.stripe_account_id),
    accountName: profile?.stripe_account_name ?? "",
    // 画面で案内するための値（秘密ではない）
    redirectUri: "/api/stripe/connect/callback",
  });
}
