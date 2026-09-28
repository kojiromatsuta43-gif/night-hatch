import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { clicksThisMonth, getOrCreateListingForUser, saveListingFromStore, videosForListing, type ListingInput } from "@/lib/server/listings";
import { listingStatus } from "@/lib/listing";

/**
 * お店の「HPの掲載情報」（公開サイト Night HATCH に載る内容）。
 * GET: 自分のお店の掲載情報・状態・今月のクリック数（無ければ下書きを作る）
 * PUT: 保存（同意のチェックもここで）
 */
async function me() {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (user.role === "freelancer") return { error: NextResponse.json({ error: "お店のアカウントで開いてください" }, { status: 403 }) };
  return { user };
}

function payload(userId: string) {
  const l = getOrCreateListingForUser(userId);
  return {
    listing: l,
    status: listingStatus(l),
    clicks: clicksThisMonth(l.id),
    videos: videosForListing(l).length,
  };
}

export async function GET() {
  const r = await me();
  if (r.error) return r.error;
  return NextResponse.json(payload(r.user.id));
}

export async function PUT(req: Request) {
  const r = await me();
  if (r.error) return r.error;
  let body: ListingInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "内容を読み取れませんでした" }, { status: 400 });
  }
  try {
    saveListingFromStore(r.user.id, body);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "保存できませんでした" }, { status: 400 });
  }
  return NextResponse.json(payload(r.user.id));
}
