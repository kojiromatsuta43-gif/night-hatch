import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(
    getDb().prepare("SELECT * FROM partners WHERE user_id = ? ORDER BY created_at DESC").all(user.id)
  );
}

export async function POST(req: Request) {
  const user = await requireUser();
  const b = await req.json();
  const id = crypto.randomUUID();
  getDb()
    .prepare("INSERT INTO partners (id, user_id, name, contact, email, address) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, user.id, b.name, b.contact ?? "", b.email ?? "", b.address ?? "");
  return NextResponse.json({ id });
}
