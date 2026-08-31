import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { readCachedIcon, queueIcon } from "@/lib/server/thumbs";

/** アカウントのアイコン（縮小してディスクに保存したもの）。無ければ裏で取りに行き 404 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const cached = readCachedIcon(id);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=2592000, immutable" },
    });
  }
  void queueIcon(id);
  return new NextResponse(null, { status: 404, headers: { "Retry-After": "3", "Cache-Control": "no-store" } });
}
