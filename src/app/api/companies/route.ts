import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getStatus, searchCompanies } from "@/lib/server/companydb";
import { filterFrom } from "@/lib/server/company-filter";

/** 企業DBの検索（社内専用） */
export async function GET(req: Request) {
  const user = await requireUser();
  // 企業DBは会社の資産。いまは社内（管理者）だけが検索・追加できる。お客様には「営業リスト作成」メニューで納品する
  if (user.role !== "admin") return NextResponse.json({ error: "企業DBは社内専用です" }, { status: 403 });
  const status = getStatus();
  if (status.phase !== "ready") return NextResponse.json({ ready: false, phase: status.phase });
  try {
    const r = await searchCompanies(filterFrom(new URL(req.url)));
    return NextResponse.json({ ready: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "検索に失敗しました" }, { status: 500 });
  }
}
