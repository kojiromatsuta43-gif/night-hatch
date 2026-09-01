import { NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { uploadPath, UploadRow } from "@/lib/server/uploads";

/** アップロード済みファイルの配信。ログイン中のユーザーのみ。大きい動画でも全部メモリに載せず、Range（途中から再生）に対応。 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const row = getDb().prepare("SELECT * FROM uploads WHERE id = ?").get(id) as UploadRow | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const filePath = uploadPath(id);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const size = fs.statSync(filePath).size;

  const baseHeaders: Record<string, string> = {
    "Content-Type": row.mime || "application/octet-stream",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
  };

  const range = req.headers.get("range");
  let start = 0;
  let end = size - 1;
  let status = 200;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      if (m[1]) start = Number(m[1]);
      if (m[2]) end = Math.min(size - 1, Number(m[2]));
      else if (!m[1]) start = 0;
      if (start > end || start >= size) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      status = 206;
      baseHeaders["Content-Range"] = `bytes ${start}-${end}/${size}`;
    }
  }
  baseHeaders["Content-Length"] = String(end - start + 1);
  const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end })) as ReadableStream;
  return new Response(stream, { status, headers: baseHeaders });
}

/** アップロードの取り消し。自分がアップロードしたものだけ削除できる。 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM uploads WHERE id = ?").get(id) as UploadRow | undefined;
  if (!row) return NextResponse.json({ ok: true });
  if (row.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    fs.unlinkSync(uploadPath(id));
  } catch {
    // 実体が無くても台帳は消す
  }
  db.prepare("DELETE FROM uploads WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
