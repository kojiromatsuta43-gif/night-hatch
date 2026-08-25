import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { ensureUploadDir, uploadPath, MAX_UPLOAD_BYTES, formatBytes } from "@/lib/server/uploads";

/** 素材ファイルのアップロード。multipart/form-data の "file" を1つ以上受け取る。 */
export async function POST(req: Request) {
  const user = await requireUser();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "ファイルの読み取りに失敗しました" }, { status: 400 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `「${file.name}」は${formatBytes(MAX_UPLOAD_BYTES)}を超えています。大きい素材はギガファイル便などのURLでご共有ください。` },
        { status: 400 }
      );
    }
  }

  ensureUploadDir();
  const db = getDb();
  const insert = db.prepare(
    "INSERT INTO uploads (id, user_id, filename, mime, size) VALUES (?, ?, ?, ?, ?)"
  );

  const saved = [];
  for (const file of files) {
    const id = crypto.randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(uploadPath(id), buffer);
    insert.run(id, user.id, file.name, file.type || "application/octet-stream", file.size);
    saved.push({
      id,
      name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      url: `/api/uploads/${id}`,
    });
  }

  return NextResponse.json({ files: saved });
}
