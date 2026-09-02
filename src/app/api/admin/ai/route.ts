import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getAiSettings, saveAiSettings, describeRouting, TASK_LABELS, PLAN_LABELS } from "@/lib/server/ai-settings";
import { getDb } from "@/lib/server/db";

/** 今月・今日の利用状況（ユーザー別、多い順） */
function usageByUser() {
  const db = getDb();
  const month = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return db
    .prepare(
      `SELECT u.id, u.name, u.plan, u.role, u.ai_extra,
              SUM(CASE WHEN a.kind = 'chat' AND a.day = ? THEN 1 ELSE 0 END) AS chat_today,
              SUM(CASE WHEN a.kind = 'chat' AND a.month = ? THEN 1 ELSE 0 END) AS chat_month,
              SUM(CASE WHEN a.kind = 'gen' AND a.month = ? THEN 1 ELSE 0 END) AS gen_month
         FROM users u JOIN ai_usage a ON a.user_id = u.id
        GROUP BY u.id ORDER BY chat_month + gen_month DESC LIMIT 30`
    )
    .all(day, month, month);
}

function payload() {
  return {
    settings: getAiSettings(),
    routing: describeRouting(),
    keys: { anthropic: !!process.env.ANTHROPIC_API_KEY, gemini: !!process.env.GEMINI_API_KEY },
    taskLabels: TASK_LABELS,
    planLabels: PLAN_LABELS,
    usage: usageByUser(),
  };
}

export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(payload());
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  saveAiSettings(body);
  return NextResponse.json(payload());
}
