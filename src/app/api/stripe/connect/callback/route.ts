import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { publicUrl, stripeEnv } from "@/lib/server/stripe";

/** Stripeで許可した後に戻ってくる場所。ここで連携アカウントIDを受け取って保存する。 */
export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const base = publicUrl(req);
  const back = (msg: string) => NextResponse.redirect(`${base}/issue/payment?msg=${encodeURIComponent(msg)}`);

  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (error) return back(`連携をキャンセルしました（${error}）`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = req.headers.get("cookie")?.match(/stripe_oauth_state=([^;]+)/)?.[1];
  if (!code) return back("Stripeからの応答が不正でした");
  if (!state || state !== expected) return back("画面の有効期限が切れました。もう一度お試しください");

  const env = stripeEnv();
  if (!env.secretKey) return back("STRIPE_SECRET_KEY が未設定です");

  try {
    const res = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_secret: env.secretKey,
      }).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (!res.ok || !data.stripe_user_id) {
      return back(data?.error_description ?? "Stripeとの連携に失敗しました");
    }

    // 連携先の表示名を取っておく（画面に「〇〇と連携済み」と出すため）
    let name = "";
    try {
      const acc = await fetch(`https://api.stripe.com/v1/accounts/${data.stripe_user_id}`, {
        headers: { Authorization: `Bearer ${env.secretKey}` },
        signal: AbortSignal.timeout(10000),
      }).then((r) => r.json());
      name = acc?.business_profile?.name ?? acc?.settings?.dashboard?.display_name ?? acc?.email ?? "";
    } catch {
      // 名前が取れなくても連携自体は成立している
    }

    const db = getDb();
    db.prepare(
      `INSERT INTO issuer_profiles (user_id, stripe_account_id, stripe_account_name, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         stripe_account_id = excluded.stripe_account_id,
         stripe_account_name = excluded.stripe_account_name,
         updated_at = datetime('now')`
    ).run(user.id, data.stripe_user_id, name);

    const done = back("Stripeとの連携が完了しました");
    done.cookies.delete("stripe_oauth_state");
    return done;
  } catch (e) {
    return back(e instanceof Error ? e.message : "連携中にエラーが発生しました");
  }
}
