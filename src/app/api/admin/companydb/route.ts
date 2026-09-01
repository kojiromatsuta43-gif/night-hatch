import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getStatus, startIngest, resetCompanyDb, diskUsage, overview } from "@/lib/server/companydb";

export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const status = getStatus();
  let summary = null;
  if (status.phase === "ready") {
    try {
      summary = await overview();
    } catch {
      summary = null;
    }
  }
  return NextResponse.json({ status, disk: diskUsage(), summary });
}

/** action: ingest（取り込み開始）/ reset（全部消す） */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  try {
    if (b?.action === "ingest") return NextResponse.json(startIngest());
    if (b?.action === "reset") {
      await resetCompanyDb();
      return NextResponse.json(getStatus());
    }
    return NextResponse.json({ error: "bad action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "失敗しました" }, { status: 400 });
  }
}
