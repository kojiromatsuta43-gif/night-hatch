import { NextResponse } from "next/server";
import { demoVisible } from "@/lib/server/site";
import { osmBarsIn } from "@/lib/server/osm";

/** 地図の「全国のバー」で、エリアのバー一覧（社内確認用のデモ表示のときだけ） */
export async function GET(req: Request) {
  if (!(await demoVisible())) return NextResponse.json({ error: "not found" }, { status: 404 });
  const sp = new URL(req.url).searchParams;
  const area = sp.get("area") ?? "";
  if (!area) return NextResponse.json([]);
  return NextResponse.json(osmBarsIn(area.slice(0, 40), (sp.get("genre") ?? "").slice(0, 20)), { headers: { "Cache-Control": "private, max-age=300" } });
}
