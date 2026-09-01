import crypto from "crypto";
import { getDb } from "./db";
import { getAiSettings, type PlanId, PLAN_LABELS } from "./ai-settings";

/**
 * AI利用の回数上限。
 * - 会話（chat）: 1日あたり
 * - 生成（gen）: 台本・動画分析・資料読み取り。1ヶ月あたり
 * 上限に達したら追加パック（ai_extra）を1回ずつ消費。無ければ LimitError。
 * 日付は日本時間で区切る。
 */

export type UsageKind = "chat" | "gen";

export class LimitError extends Error {
  code = "ai_limit" as const;
  constructor(message: string, public readonly detail: UsageSummary) {
    super(message);
  }
}

export type UsageSummary = {
  plan: PlanId;
  planLabel: string;
  unlimited: boolean;
  chat: { used: number; limit: number };
  gen: { used: number; limit: number };
  extra: number;
  extraUses: number;
  extraPoints: number;
};

function jstDayMonth(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const day = jst.toISOString().slice(0, 10);
  return { day, month: day.slice(0, 7) };
}

type UserRow = { id: string; role: string; plan: string; ai_extra: number; points: number };

function loadUser(userId: string): UserRow | undefined {
  return getDb().prepare("SELECT id, role, plan, ai_extra, points FROM users WHERE id = ?").get(userId) as UserRow | undefined;
}

function planOf(u: UserRow): PlanId {
  if (u.role === "admin") return "unlimited";
  const p = u.plan as PlanId;
  return p === "standard" || p === "premium" || p === "unlimited" ? p : "light";
}

export function usageSummary(userId: string): UsageSummary {
  const u = loadUser(userId);
  const settings = getAiSettings();
  const { day, month } = jstDayMonth();
  const db = getDb();
  const chatUsed = u
    ? (db.prepare("SELECT COUNT(*) AS n FROM ai_usage WHERE user_id = ? AND kind = 'chat' AND day = ?").get(u.id, day) as { n: number }).n
    : 0;
  const genUsed = u
    ? (db.prepare("SELECT COUNT(*) AS n FROM ai_usage WHERE user_id = ? AND kind = 'gen' AND month = ?").get(u.id, month) as { n: number }).n
    : 0;
  const plan = u ? planOf(u) : "light";
  const unlimited = plan === "unlimited";
  const lim = unlimited ? { chatPerDay: -1, genPerMonth: -1 } : settings.limits[plan];
  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    unlimited,
    chat: { used: chatUsed, limit: lim.chatPerDay },
    gen: { used: genUsed, limit: lim.genPerMonth },
    extra: u?.ai_extra ?? 0,
    extraUses: settings.extraUses,
    extraPoints: settings.extraPoints,
  };
}

/**
 * 1回分を消費する。上限内なら記録して終了、超えていれば追加パックを1回消費、
 * それも無ければ LimitError を投げる（呼び出し側で 429 にする）。
 */
export function consumeAi(userId: string, kind: UsageKind, task: string): UsageSummary {
  const db = getDb();
  const run = db.transaction(() => {
    const u = loadUser(userId);
    if (!u) throw new Error("ユーザーが見つかりません");
    const summary = usageSummary(userId);
    const { day, month } = jstDayMonth();
    const record = () =>
      db
        .prepare("INSERT INTO ai_usage (id, user_id, kind, task, day, month) VALUES (?, ?, ?, ?, ?, ?)")
        .run(crypto.randomUUID(), userId, kind, task, day, month);

    if (summary.unlimited) {
      record();
      return summary;
    }
    const used = kind === "chat" ? summary.chat.used : summary.gen.used;
    const limit = kind === "chat" ? summary.chat.limit : summary.gen.limit;
    if (used < limit) {
      record();
      return summary;
    }
    if (u.ai_extra > 0) {
      db.prepare("UPDATE users SET ai_extra = ai_extra - 1 WHERE id = ?").run(userId);
      record();
      return { ...summary, extra: u.ai_extra - 1 };
    }
    const what = kind === "chat" ? `今日の会話回数（${limit}回）` : `今月の生成回数（${limit}回）`;
    throw new LimitError(
      `${summary.planLabel}プランの${what}を使い切りました。追加パック（${summary.extraUses}回＝${summary.extraPoints}🍯）を購入するか、${kind === "chat" ? "明日" : "来月"}までお待ちください。`,
      summary
    );
  });
  return run();
}

/** 追加パックをハニーPで購入（Stripe は通さない。残高から引くだけ） */
export function buyExtraPack(userId: string): UsageSummary {
  const db = getDb();
  const settings = getAiSettings();
  db.transaction(() => {
    const u = loadUser(userId);
    if (!u) throw new Error("ユーザーが見つかりません");
    if (u.points < settings.extraPoints) {
      throw new Error(`残高が足りません（${settings.extraPoints}🍯 必要）。「ハニーP」からチャージしてください。`);
    }
    db.prepare("UPDATE users SET points = points - ?, ai_extra = ai_extra + ? WHERE id = ?").run(
      settings.extraPoints,
      settings.extraUses,
      userId
    );
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'ai_extra', ?)").run(
      crypto.randomUUID(),
      userId,
      -settings.extraPoints,
      `AI追加パック ${settings.extraUses}回`
    );
  })();
  return usageSummary(userId);
}

/** API ルート用: LimitError なら 429 のレスポンス本文を返す */
export function limitResponse(e: unknown): { status: 429; body: { error: string; code: "ai_limit"; usage: UsageSummary } } | null {
  if (e instanceof LimitError) return { status: 429, body: { error: e.message, code: e.code, usage: e.detail } };
  return null;
}
