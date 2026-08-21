import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(
    getDb().prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC").all(user.id)
  );
}

export async function POST(req: Request) {
  const user = await requireUser();
  const b = await req.json();
  const id = crypto.randomUUID();
  getDb()
    .prepare(
      "INSERT INTO invoices (id, user_id, partner_id, title, amount, status, issued_on) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, user.id, b.partner_id ?? null, b.title, b.amount ?? 0, b.status ?? "下書き", b.issued_on);
  return NextResponse.json({ id });
}
