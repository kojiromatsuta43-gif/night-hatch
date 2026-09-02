import crypto from "crypto";
import type Database from "better-sqlite3";
import { getDb } from "./db";
import { notify } from "./notifications";
import { PLANS, planOf } from "@/lib/points";

/**
 * ハニーPの台帳。
 *
 * users.points は「いま使える残高」の合計で、画面や残高チェックはこれを見る。
 * その内訳を point_grants（付与の1件1件と残り数）で持ち、
 *   - 使うときは「失効が近い付与」から順に減らす（先入れ先出し）
 *   - 月が変わったら、契約中のプランに月次付与を1回だけ行う
 *   - 繰越期限（ライト3ヶ月・スタンダード6ヶ月・プレミアム12ヶ月）を過ぎた分は失効させる
 * すべての増減は point_transactions にも記録し、履歴で説明できるようにする。
 */

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}
/** 日本時間の今月 "YYYY-MM" */
export function jstMonth(): string {
  return jstNow().toISOString().slice(0, 7);
}
/** 月初の日付 "YYYY-MM-01" を n ヶ月後ろへずらす */
function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * ポイントを付与する（users.points の加算・履歴・台帳をまとめて行う）。
 * 必ず db.transaction の中から呼ぶこと。expiresAt が null の付与は失効しない。
 */
export function creditPoints(
  db: Database.Database,
  userId: string,
  amount: number,
  kind: string,
  memo: string,
  expiresAt: string | null
) {
  if (amount <= 0) return;
  db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(amount, userId);
  db.prepare(
    "INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?,?,?,?,?)"
  ).run(crypto.randomUUID(), userId, amount, kind, memo);
  db.prepare(
    "INSERT INTO point_grants (id, user_id, amount, remaining, kind, memo, expires_at) VALUES (?,?,?,?,?,?,?)"
  ).run(crypto.randomUUID(), userId, amount, amount, kind, memo, expiresAt);
}

/**
 * 台帳から消費する（失効が近い付与から順に）。
 * users.points の減算・履歴の記録は呼び出し元が今まで通り行う。
 * 台帳に残りが足りない場合（台帳導入前の残高など）は、あるだけ減らして終わる。
 * 必ず db.transaction の中から呼ぶこと。
 */
export function consumeFromGrants(db: Database.Database, userId: string, amount: number) {
  let left = amount;
  if (left <= 0) return;
  const rows = db
    .prepare(
      `SELECT id, remaining FROM point_grants
        WHERE user_id = ? AND remaining > 0
        ORDER BY (expires_at IS NULL), expires_at, created_at`
    )
    .all(userId) as { id: string; remaining: number }[];
  const dec = db.prepare("UPDATE point_grants SET remaining = remaining - ? WHERE id = ?");
  for (const g of rows) {
    if (left <= 0) break;
    const take = Math.min(g.remaining, left);
    dec.run(take, g.id);
    left -= take;
  }
}

/**
 * 月次付与。契約中（plan_active=1）のユーザーへ、今月まだなら付与する。
 * 失効日は「付与月＋繰越月数」の翌月1日（例: 9月付与・繰越3ヶ月 → 12月末まで使えて 1/1 に失効）。
 */
export function runMonthlyGrants(): number {
  const db = getDb();
  const month = jstMonth();
  const users = db
    .prepare("SELECT id, plan FROM users WHERE plan_active = 1")
    .all() as { id: string; plan: string }[];
  let granted = 0;
  const tx = db.transaction((u: { id: string; plan: string }) => {
    const plan = planOf(u.plan);
    if (!plan) return;
    const tag = `プラン付与 ${month}`;
    const exists = db
      .prepare("SELECT 1 FROM point_grants WHERE user_id = ? AND kind = 'plan_grant' AND memo = ?")
      .get(u.id, tag);
    if (exists) return;
    const expiresAt = addMonths(month, plan.carryMonths + 1);
    creditPoints(db, u.id, plan.points, "plan_grant", tag, expiresAt);
    notify(u.id, {
      id: `plan_grant:${u.id}:${month}`,
      kind: "points",
      title: `今月のハニーP ${plan.points}pt を付与しました`,
      body: `${plan.name}プランの月次付与です。繰越は${plan.carryMonths}ヶ月（${expiresAt} に失効）。`,
      link: "/points",
    });
    granted++;
  });
  for (const u of users) tx(u);
  return granted;
}

/** 期限を過ぎた付与を失効させる */
export function runExpiry(): number {
  const db = getDb();
  const today = jstNow().toISOString().slice(0, 10);
  const rows = db
    .prepare(
      `SELECT id, user_id, remaining, memo, expires_at FROM point_grants
        WHERE remaining > 0 AND expires_at IS NOT NULL AND expires_at <= ?`
    )
    .all(today) as { id: string; user_id: string; remaining: number; memo: string; expires_at: string }[];
  let expired = 0;
  const tx = db.transaction((g: (typeof rows)[number]) => {
    db.prepare("UPDATE point_grants SET remaining = 0 WHERE id = ?").run(g.id);
    // 残高は0未満にしない（手動調整で先に減っている場合に備える）
    const u = db.prepare("SELECT points FROM users WHERE id = ?").get(g.user_id) as { points: number };
    const cut = Math.min(g.remaining, Math.max(0, u.points));
    if (cut > 0) {
      db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(cut, g.user_id);
      db.prepare(
        "INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?,?,?,'expire',?)"
      ).run(crypto.randomUUID(), g.user_id, -cut, `繰越期限切れ（${g.memo}）`);
      notify(g.user_id, {
        id: `expire:${g.id}`,
        kind: "points",
        title: `ハニーP ${cut}pt が繰越期限で失効しました`,
        body: `${g.memo} の未使用分です。`,
        link: "/points",
      });
    }
    expired += cut;
  });
  for (const g of rows) tx(g);
  return expired;
}

/** 失効が近い付与（お知らせ・画面表示用） */
export function expiringSoon(userId: string, withinDays = 45) {
  const db = getDb();
  const limit = new Date(jstNow().getTime() + withinDays * 86400000).toISOString().slice(0, 10);
  const today = jstNow().toISOString().slice(0, 10);
  return db
    .prepare(
      `SELECT remaining, memo, expires_at FROM point_grants
        WHERE user_id = ? AND remaining > 0 AND expires_at IS NOT NULL
          AND expires_at > ? AND expires_at <= ?
        ORDER BY expires_at`
    )
    .all(userId, today, limit) as { remaining: number; memo: string; expires_at: string }[];
}

/**
 * プラン契約を開始・変更する（管理者操作と Stripe Webhook の両方から使う）。
 * 有効化した月の付与がまだなら、その場で付与する。
 */
export function activatePlan(userId: string, planId: string, active: boolean) {
  const db = getDb();
  const plan = planOf(planId) ?? PLANS[0];
  db.transaction(() => {
    db.prepare(
      "UPDATE users SET plan = ?, plan_active = ?, plan_since = COALESCE(plan_since, date('now')) WHERE id = ?"
    ).run(plan.id, active ? 1 : 0, userId);
    if (!active) db.prepare("UPDATE users SET plan_since = NULL WHERE id = ?").run(userId);
  })();
  if (active) runMonthlyGrants();
}
