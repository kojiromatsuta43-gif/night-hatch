import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { readCachedThumbnail, queueThumbnail } from "@/lib/server/thumbs";

/**
 * サムネイル。ディスクにあれば即返す。
 * 無ければ裏で取りに行き、いったん 404 を返す（画面側が少し待って取り直す）。
 * こうすると、一覧を開いた瞬間に何十枚ぶんもTikTokへ取りに行って固まる、が起きない。
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const cached = readCachedThumbnail(id);
  if (cached) return image(cached);
  void queueThumbnail(id);
  return new NextResponse(null, { status: 404, headers: { "Retry-After": "3", "Cache-Control": "no-store" } });
}

function image(buf: Buffer) {
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      // 一度取れたものはブラウザにも長めに持たせる
      "Cache-Control": "private, max-age=2592000, immutable",
    },
  });
}
