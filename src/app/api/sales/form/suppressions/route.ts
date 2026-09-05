import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireFormUser, s } from "@/lib/server/form-outreach/access";
import { domainOf } from "@/lib/server/form-outreach/schema";

/** 除外リスト（全キャンペーン横断・全ユーザー共通）。閲覧と追加は誰でも、削除は管理者だけ */
export async function GET() {
  await requireFormUser();
  return NextResponse.json(getDb().prepare("SELECT * FROM form_suppressions ORDER BY created_at DESC LIMIT 1000").all());
}

export async function POST(req: Request) {
  const user = await requireFormUser();
  const b = await req.json().catch(() => ({}));
  const raw = s(b.domain, 200);
  const domain = domainOf(raw) || raw.toLowerCase();
  if (!domain) return NextResponse.json({ error: "ドメインを入れてください" }, { status: 400 });
  getDb().prepare("INSERT OR IGNORE INTO form_suppressions (id, domain, reason) VALUES (?,?,?)").run(crypto.randomUUID(), domain, s(b.reason, 200) || `手動（${user.name}）`);
  return NextResponse.json({ ok: true, domain });
}

export async function DELETE(req: Request) {
  const user = await requireFormUser();
  if (user.role !== "admin") return NextResponse.json({ error: "管理者のみ" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  getDb().prepare("DELETE FROM form_suppressions WHERE id=?").run(id);
  return NextResponse.json({ ok: true });
}
