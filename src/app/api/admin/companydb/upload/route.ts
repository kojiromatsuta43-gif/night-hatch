import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { uploadChunk } from "@/lib/server/companydb";

/**
 * Parquet の分割アップロード。画面側が 8MB ずつ順番に送る。
 * ヘッダ: x-upload-id / x-chunk-index / x-chunk-total / x-file-size
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.headers.get("x-upload-id") ?? "";
  const index = Number(req.headers.get("x-chunk-index"));
  const total = Number(req.headers.get("x-chunk-total"));
  const fileSize = Number(req.headers.get("x-file-size") ?? 0);
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id) || !Number.isInteger(index) || !Number.isInteger(total) || index < 0 || index >= total) {
    return NextResponse.json({ error: "ヘッダが不正です" }, { status: 400 });
  }
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: "中身が空です" }, { status: 400 });
  try {
    return NextResponse.json(uploadChunk(id, index, total, fileSize, buf));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "アップロードに失敗しました" }, { status: 400 });
  }
}
