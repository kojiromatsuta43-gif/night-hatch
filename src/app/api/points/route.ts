import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare("SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(user.id);
  return NextResponse.json({ points: user.points, transactions: rows });
}

// モック決済: Stripe導入時はここでCheckout Sessionを作成してwebhookで付与する
export async function POST(req: Request) {
  const user = await requireUser();
  const { amount } = await req.json();
  if (![50, 100, 300].includes(amount)) {
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });
  }
  const db = getDb();
  db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(amount, user.id);
  db.prepare("INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'purchase', ?)").run(
    crypto.randomUUID(), user.id, amount, `はちみつP購入 ${amount}🍯（モック決済）`
  );
  return NextResponse.json({ ok: true });
}
