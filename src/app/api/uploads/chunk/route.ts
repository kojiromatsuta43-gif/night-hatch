import { NextResponse } from "next/server";
import fs from "fs";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { ensureUploadDir, uploadPath, partPath, checkRoom, cleanupStaleParts, UPLOAD_CHUNK_BYTES } from "@/lib/server/uploads";

/**
 * 大きいファイルの分割アップロード。画面側が 8MB ずつ順番に送る。
 * ヘッダ: x-upload-id（画面側で作ったUUID）/ x-chunk-index / x-chunk-total / x-file-size / x-file-name（URLエンコード）/ x-file-mime
 * 最後のかけらを受け取ったら台帳に登録し、通常のアップロードと同じ形で返す。
 */
export async function POST(req: Request) {
  const user = await requireUser();
  const h = (k: string) => req.headers.get(k) ?? "";
  const uploadId = h("x-upload-id");
  const index = Number(h("x-chunk-index"));
  const total = Number(h("x-chunk-total"));
  const fileSize = Number(h("x-file-size"));
  const name = decodeURIComponent(h("x-file-name")).slice(0, 255) || "file";
  const mime = h("x-file-mime").slice(0, 100) || "application/octet-stream";
  if (!/^[0-9a-f-]{36}$/.test(uploadId) || !Number.isInteger(index) || !Number.isInteger(total) || index < 0 || index >= total || !Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: "アップロードの情報が不正です" }, { status: 400 });
  }
  const room = checkRoom(fileSize);
  if (room) return NextResponse.json({ error: room }, { status: 400 });

  ensureUploadDir();
  if (index === 0) cleanupStaleParts();
  const part = partPath(user.id, uploadId);
  const chunk = Buffer.from(await req.arrayBuffer());
  if (chunk.length === 0) return NextResponse.json({ error: "中身が空です" }, { status: 400 });

  // 順番どおりに届いているか（途中で欠けたら最初から）
  const current = index === 0 ? 0 : fs.existsSync(part) ? fs.statSync(part).size : -1;
  if (current !== index * UPLOAD_CHUNK_BYTES) {
    try {
      fs.unlinkSync(part);
    } catch {
      /* 無視 */
    }
    return NextResponse.json({ error: "アップロードの続きが一致しません。もう一度やり直してください" }, { status: 409 });
  }
  if (index === 0) fs.writeFileSync(part, chunk);
  else fs.appendFileSync(part, chunk);

  if (index < total - 1) return NextResponse.json({ ok: true, received: current + chunk.length });

  // 最後のかけら: サイズを確かめて本置き場へ
  const size = fs.statSync(part).size;
  if (size !== fileSize) {
    fs.unlinkSync(part);
    return NextResponse.json({ error: `サイズが合いません（受信 ${size} / 申告 ${fileSize}）。もう一度やり直してください` }, { status: 400 });
  }
  fs.renameSync(part, uploadPath(uploadId));
  getDb().prepare("INSERT INTO uploads (id, user_id, filename, mime, size) VALUES (?, ?, ?, ?, ?)").run(uploadId, user.id, name, mime, size);
  return NextResponse.json({ files: [{ id: uploadId, name, size, mime, url: `/api/uploads/${uploadId}` }] });
}
