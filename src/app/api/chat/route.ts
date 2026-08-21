import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  const db = getDb();
  const users = db
    .prepare("SELECT id, name, role FROM users WHERE id != ? AND role != 'admin'")
    .all(user.id) as { id: string; name: string; role: string }[];
  const messages = db
    .prepare("SELECT * FROM chat_messages WHERE from_id = ? OR to_id = ? ORDER BY created_at ASC")
    .all(user.id, user.id);
  return NextResponse.json({ users, messages, me: user.id });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { to, body } = await req.json();
  const id = crypto.randomUUID();
  getDb()
    .prepare("INSERT INTO chat_messages (id, from_id, to_id, body) VALUES (?, ?, ?, ?)")
    .run(id, user.id, to, body);
  return NextResponse.json({ id });
}
