import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireFormUser, s } from "@/lib/server/form-outreach/access";

const COLS = ["label", "company", "industry", "person", "person_kana", "email", "reply_email", "tel", "postal", "address", "url", "from_email", "email_method", "smtp_host", "smtp_user", "smtp_pass"] as const;

/** 送信者プロフィール（フォームに入力する差出人）。自分のものだけ */
export async function GET() {
  const user = await requireFormUser();
  const rows = getDb().prepare("SELECT * FROM form_senders WHERE user_id=? ORDER BY created_at").all(user.id) as Record<string, unknown>[];
  // アプリパスワードは画面に返さない（設定済みかどうかだけ）
  return NextResponse.json(rows.map((r) => ({ ...r, smtp_pass: "", smtp_pass_set: Boolean(r.smtp_pass) })));
}

function normalize(b: Record<string, unknown>) {
  b.email_method = b.email_method === "service" ? "service" : "smtp";
  b.smtp_host = s(b.smtp_host, 120) || "smtp.gmail.com";
  b.smtp_user = s(b.smtp_user, 200).toLowerCase();
  return b;
}

export async function POST(req: Request) {
  const user = await requireFormUser();
  const b = normalize(await req.json().catch(() => ({})));
  const vals = COLS.map((k) => s(b[k], 200));
  if (!s(b.company) || !s(b.person) || !s(b.email)) return NextResponse.json({ error: "会社名・担当者名・メールは必須です" }, { status: 400 });
  const id = crypto.randomUUID();
  getDb().prepare(`INSERT INTO form_senders (id, user_id, ${COLS.join(",")}, smtp_port) VALUES (?, ?, ${COLS.map(() => "?").join(",")}, ?)`).run(id, user.id, ...vals, Number(b.smtp_port) || 465);
  return NextResponse.json({ id });
}

export async function PUT(req: Request) {
  const user = await requireFormUser();
  const b = normalize(await req.json().catch(() => ({})));
  const id = s(b.id, 64);
  // パスワード欄が空なら今の値を保持
  const cols = COLS.filter((c) => c !== "smtp_pass" || s(b.smtp_pass, 200) !== "");
  const vals = cols.map((k) => s(b[k], 200));
  const r = getDb().prepare(`UPDATE form_senders SET ${cols.map((c) => `${c}=?`).join(",")}, smtp_port=? WHERE id=? AND user_id=?`).run(...vals, Number(b.smtp_port) || 465, id, user.id);
  if (!r.changes) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireFormUser();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const used = getDb().prepare("SELECT 1 FROM form_campaigns WHERE sender_id=? LIMIT 1").get(id);
  if (used) return NextResponse.json({ error: "キャンペーンで使用中のため削除できません" }, { status: 400 });
  getDb().prepare("DELETE FROM form_senders WHERE id=? AND user_id=?").run(id, user.id);
  return NextResponse.json({ ok: true });
}
