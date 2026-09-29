import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { importOsmBars, osmRunning, osmStatus } from "@/lib/server/osm";

/** 管理画面「サイト掲載」: OpenStreetMap から全国のバーを取り込む（社内リサーチ用）。数分かかるので開始だけして返す */
async function admin() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await admin();
  if (denied) return denied;
  return NextResponse.json(osmStatus());
}

export async function POST() {
  const denied = await admin();
  if (denied) return denied;
  if (osmRunning()) return NextResponse.json({ error: "取り込み中です" }, { status: 409 });
  importOsmBars().catch((e) => console.error("[osm]", e instanceof Error ? e.message : e));
  return NextResponse.json({ started: true });
}
