import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { adminUpdateListing, listAllListings, setSiteDemo, siteDemoOn } from "@/lib/server/listings";
import { listingStatus } from "@/lib/listing";

/** 管理画面「サイト掲載」: 全店の掲載状態・今月のクリック数、公開／非公開の切り替え、URL名（slug）の変更 */
async function admin() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  return null;
}

export async function GET() {
  const denied = await admin();
  if (denied) return denied;
  const rows = listAllListings().map((l) => ({ ...l, status: listingStatus(l) }));
  return NextResponse.json({ rows, demo: siteDemoOn() });
}

export async function PATCH(req: Request) {
  const denied = await admin();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { id?: string; admin_published?: boolean; slug?: string; demo?: boolean };
  if (typeof body.demo === "boolean") {
    setSiteDemo(body.demo);
    return NextResponse.json({ demo: siteDemoOn() });
  }
  if (!body.id) return NextResponse.json({ error: "id がありません" }, { status: 400 });
  try {
    const l = adminUpdateListing(body.id, { admin_published: body.admin_published, slug: body.slug });
    return NextResponse.json({ ...l, status: listingStatus(l) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "変更できませんでした" }, { status: 400 });
  }
}
