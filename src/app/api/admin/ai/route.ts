import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getAiSettings, saveAiSettings, describeRouting, TASK_LABELS, PLAN_LABELS } from "@/lib/server/ai-settings";

function payload() {
  return {
    settings: getAiSettings(),
    routing: describeRouting(),
    keys: { anthropic: !!process.env.ANTHROPIC_API_KEY, gemini: !!process.env.GEMINI_API_KEY },
    taskLabels: TASK_LABELS,
    planLabels: PLAN_LABELS,
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
