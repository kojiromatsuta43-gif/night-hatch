import { NextResponse } from "next/server";
import fs from "fs";
import { getDb } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { uploadPath, type UploadRow } from "@/lib/server/uploads";
import { canSeePhoto } from "@/lib/server/listings";

/**
 * 公開サイトの店舗写真。ツールのアップロード（/api/uploads）はログインした人にしか見せないので、
 * 公開中のお店の写真だけをここから配る。公開前はそのお店の人と管理者だけ（プレビュー用）。
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  let allowed = canSeePhoto(id, null);
  let isPrivate = false;
  if (!allowed) {
    const viewer = await currentUser();
    allowed = canSeePhoto(id, viewer);
    isPrivate = true;
  }
  if (!allowed) return new NextResponse(null, { status: 404 });
  const row = getDb().prepare("SELECT * FROM uploads WHERE id = ?").get(id) as UploadRow | undefined;
  if (!row || !row.mime.startsWith("image/")) return new NextResponse(null, { status: 404 });
  let buf: Buffer;
  try {
    buf = fs.readFileSync(uploadPath(id));
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": isPrivate ? "private, no-store" : "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
