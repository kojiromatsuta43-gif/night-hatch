import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(getDb().prepare("SELECT * FROM ng_words ORDER BY created_at DESC").all());
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { word } = await req.json();
  getDb().prepare("INSERT OR IGNORE INTO ng_words (id, word) VALUES (?, ?)").run(crypto.randomUUID(), word);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM ng_words WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
