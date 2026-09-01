import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { importLeads, listLeads, type LeadInput } from "@/lib/server/sales";

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** 一覧（絞り込み・ページ送り） */
export async function GET(req: Request) {
  const user = await requireUser();
  const u = new URL(req.url);
  const g = (k: string) => u.searchParams.get(k) ?? undefined;
  return NextResponse.json(
    listLeads(user, {
      q: g("q")?.trim() || undefined,
      prefecture: g("pref") || undefined,
      industry: g("industry") || undefined,
      status: g("status") || undefined,
      projectId: g("project") || undefined,
      empMin: num(u.searchParams.get("empMin")),
      empMax: num(u.searchParams.get("empMax")),
      page: num(u.searchParams.get("page")),
      perPage: num(u.searchParams.get("perPage")),
    })
  );
}

/** CSV から取り込み（画面側で列を対応付けた行の配列を受け取る） */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role === "freelancer") return NextResponse.json({ error: "リストの取り込みは発注者アカウントで行ってください" }, { status: 403 });
  const b = await req.json().catch(() => null);
  const rows = Array.isArray(b?.rows) ? (b.rows as LeadInput[]) : [];
  if (rows.length === 0) return NextResponse.json({ error: "取り込む行がありません" }, { status: 400 });
  if (rows.length > 5000) return NextResponse.json({ error: "一度に取り込めるのは5,000件までです" }, { status: 400 });
  const result = importLeads(user.id, rows, String(b?.source ?? ""));
  return NextResponse.json(result);
}
