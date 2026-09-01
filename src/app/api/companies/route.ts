import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getStatus, searchCompanies } from "@/lib/server/companydb";
import { filterFrom } from "@/lib/server/company-filter";

/** 企業DBの検索（発注者・管理者のみ。フリーランスには見せない） */
export async function GET(req: Request) {
  const user = await requireUser();
  if (user.role === "freelancer") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const status = getStatus();
  if (status.phase !== "ready") return NextResponse.json({ ready: false, phase: status.phase });
  try {
    const r = await searchCompanies(filterFrom(new URL(req.url)));
    return NextResponse.json({ ready: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "検索に失敗しました" }, { status: 500 });
  }
}
