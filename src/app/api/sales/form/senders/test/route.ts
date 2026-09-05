import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireFormUser, s } from "@/lib/server/form-outreach/access";
import type { SenderProfile } from "@/lib/server/form-outreach/schema";
import { senderEmailOk, testSmtp } from "@/lib/server/form-outreach/email";

/** 送信者のメール設定をテスト（SMTPなら接続確認、サービスならドメイン認証の確認） */
export async function POST(req: Request) {
  const user = await requireFormUser();
  const b = await req.json().catch(() => ({}));
  const sender = getDb().prepare("SELECT * FROM form_senders WHERE id=? AND user_id=?").get(s(b.id, 64), user.id) as SenderProfile | undefined;
  if (!sender) return NextResponse.json({ error: "not found" }, { status: 404 });
  const chk = senderEmailOk(user.id, sender);
  if (!chk.ok) return NextResponse.json({ error: chk.reason }, { status: 400 });
  try {
    if (sender.email_method === "smtp") await testSmtp(sender);
    return NextResponse.json({ ok: true, from: chk.from });
  } catch (e) {
    return NextResponse.json({ error: `接続できませんでした: ${String((e as Error).message ?? e).slice(0, 200)}` }, { status: 400 });
  }
}
