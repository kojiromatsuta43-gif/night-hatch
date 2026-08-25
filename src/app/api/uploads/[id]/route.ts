import { NextResponse } from "next/server";
import fs from "fs";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { uploadPath, UploadRow } from "@/lib/server/uploads";

/** アップロード済みファイルの配信。ログイン中のユーザーのみ取得できる。 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const row = getDb().prepare("SELECT * FROM uploads WHERE id = ?").get(id) as UploadRow | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const filePath = uploadPath(id);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const buffer = fs.readFileSync(filePath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": row.mime || "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
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
