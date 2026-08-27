import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireUser } from "@/lib/server/auth";
import { publicUrl, stripeEnv } from "@/lib/server/stripe";

/** 「ご自身のStripeを連携する」を押したときの入口。Stripeの許可画面へ送る。 */
export async function GET(req: Request) {
  await requireUser();
  const env = stripeEnv();
  if (!env.clientId) {
    return NextResponse.json(
      { error: "STRIPE_CONNECT_CLIENT_ID が未設定です。Railwayの環境変数を確認してください。" },
      { status: 503 }
    );
  }

  // なりすまし防止のための合言葉。cookieに置いて戻ってきたときに突き合わせる
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.clientId,
    scope: "read_write",
    redirect_uri: `${publicUrl(req)}/api/stripe/connect/callback`,
    state,
  });

  const res = NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params}`);
  res.cookies.set("stripe_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: !publicUrl(req).startsWith("http://"),
    maxAge: 600,
    path: "/",
  });
  return res;
}
