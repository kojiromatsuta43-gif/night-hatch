import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

/** 連携を解除する（当社側の紐付けを消すだけ。Stripeのアカウント自体は残る） */
export async function POST() {
  const user = await requireUser();
  getDb()
    .prepare("UPDATE issuer_profiles SET stripe_account_id = NULL, stripe_account_name = '' WHERE user_id = ?")
    .run(user.id);
  return NextResponse.json({ ok: true });
}
