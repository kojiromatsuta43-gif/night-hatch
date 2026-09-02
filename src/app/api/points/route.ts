import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { creditPoints, consumeFromGrants, expiringSoon } from "@/lib/server/points-ledger";

export async function GET() {
  const user = await requireUser();
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(user.id);
  const planActive = (db.prepare("SELECT plan_active FROM users WHERE id = ?").get(user.id) as { plan_active: number }).plan_active === 1;
  return NextResponse.json({ points: user.points, planActive, expiring: expiringSoon(user.id, 60), transactions: rows });
}

/**
 * ポイントの手動付与（管理者のみ）。
 *
 * お客様の追加購入は /api/points/checkout → Stripe → Webhook の経路を通る。
 * こちらはサポート対応（お詫び・キャンペーン・返金の振り替えなど）専用で、
 * 一般ユーザーからは呼べない。以前はモック決済としてログイン中の
 * 誰でも無料でポイントを増やせたため、実決済の導入にあわせて閉じた。
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "ポイントの購入は「ハニーP」画面からお願いします" },
      { status: 403 }
    );
  }

  const b = await req.json().catch(() => ({}));
  const amount = Number(b?.amount);
  const targetId = String(b?.user_id ?? "").trim() || user.id;
  const memo = String(b?.memo ?? "").trim() || "管理者による付与";

  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 10000) {
    return NextResponse.json({ error: "付与するポイント数が不正です" }, { status: 400 });
  }

  const db = getDb();
  const target = db.prepare("SELECT id, points FROM users WHERE id = ?").get(targetId) as
    | { id: string; points: number }
    | undefined;
  if (!target) return NextResponse.json({ error: "対象のユーザーが見つかりません" }, { status: 404 });
  if (target.points + amount < 0) {
    return NextResponse.json({ error: "残高がマイナスになります" }, { status: 400 });
  }

  db.transaction(() => {
    if (amount > 0) {
      creditPoints(db, targetId, amount, "adjust", memo, null);
    } else {
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(amount, targetId);
      db.prepare(
        "INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'adjust', ?)"
      ).run(crypto.randomUUID(), targetId, amount, memo);
      consumeFromGrants(db, targetId, -amount);
    }
  })();

  return NextResponse.json({ ok: true });
}
