import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getThumbnail } from "@/lib/server/thumbs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const buf = await getThumbnail(id);
  if (!buf) return NextResponse.json({ error: "サムネイルを取得できませんでした" }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      // 一度取れたものはブラウザにも長めに持たせる
      "Cache-Control": "private, max-age=604800, immutable",
    },
  });
}
