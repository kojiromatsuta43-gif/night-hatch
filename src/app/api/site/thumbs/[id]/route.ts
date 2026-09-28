import { NextResponse } from "next/server";
import { readCachedThumbnail, queueThumbnail } from "@/lib/server/thumbs";
import { isPublicRefVideo } from "@/lib/server/listings";
import { demoVisible } from "@/lib/server/site";

/** 公開サイト: 掲載中のお店の、取り込み済み TikTok 動画のサムネイル（ログイン不要） */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = !isPublicRefVideo(id) && (await demoVisible());
  if (!isPublicRefVideo(id, demo)) return new NextResponse(null, { status: 404 });
  const cached = readCachedThumbnail(id);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), { headers: { "Content-Type": "image/jpeg", "Cache-Control": demo ? "private, max-age=86400" : "public, max-age=604800" } });
  }
  void queueThumbnail(id);
  return new NextResponse(null, { status: 404, headers: { "Retry-After": "3", "Cache-Control": "no-store" } });
}
