import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireFormUser, s } from "@/lib/server/form-outreach/access";
import { emailConfigured, registerDomain, verifyDomain, deleteDomain, type EmailDomain } from "@/lib/server/form-outreach/email";

/** 差出人ドメイン（自分のもの）。登録 → DNSレコードを入れてもらう → 確認 */
export async function GET() {
  const user = await requireFormUser();
  const rows = getDb().prepare("SELECT * FROM form_email_domains WHERE user_id=? ORDER BY created_at").all(user.id) as EmailDomain[];
  return NextResponse.json({ configured: emailConfigured(), items: rows.map((r) => ({ ...r, records: JSON.parse(r.records || "[]") })) });
}

export async function POST(req: Request) {
  const user = await requireFormUser();
  const b = await req.json().catch(() => ({}));
  try {
    const row = await registerDomain(user.id, s(b.domain, 120));
    return NextResponse.json({ ...row, records: JSON.parse(row.records || "[]") });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "登録できませんでした" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const user = await requireFormUser();
  const b = await req.json().catch(() => ({}));
  const row = getDb().prepare("SELECT * FROM form_email_domains WHERE id=? AND user_id=?").get(s(b.id, 64), user.id) as EmailDomain | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const r = await verifyDomain(row);
    return NextResponse.json({ ...r, records: JSON.parse(r.records || "[]") });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "確認できませんでした" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const user = await requireFormUser();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const row = getDb().prepare("SELECT * FROM form_email_domains WHERE id=? AND user_id=?").get(id, user.id) as EmailDomain | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  await deleteDomain(row);
  return NextResponse.json({ ok: true });
}
