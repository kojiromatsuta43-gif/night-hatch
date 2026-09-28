import { NextResponse } from "next/server";
import { readCachedExternalThumb, queueExternalThumb } from "@/lib/server/thumbs";
import { publicManualVideoUrl } from "@/lib/server/listings";

/** 公開サイト: お店が手入力した TikTok 動画のサムネイル（oEmbed で取って保存。ログイン不要） */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{5,25}$/.test(id)) return new NextResponse(null, { status: 404 });
  const url = publicManualVideoUrl(id);
  if (!url) return new NextResponse(null, { status: 404 });
  const cached = readCachedExternalThumb(id);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800" } });
  }
  void queueExternalThumb(id, url);
  return new NextResponse(null, { status: 404, headers: { "Retry-After": "3", "Cache-Control": "no-store" } });
}
