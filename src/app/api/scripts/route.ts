import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare("SELECT * FROM scripts WHERE user_id = ? ORDER BY created_at DESC")
    .all(user.id);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { title, content } = await req.json();
  const id = crypto.randomUUID();
  getDb()
    .prepare("INSERT INTO scripts (id, user_id, title, content) VALUES (?, ?, ?, ?)")
    .run(id, user.id, title, content);
  return NextResponse.json({ id });
}
