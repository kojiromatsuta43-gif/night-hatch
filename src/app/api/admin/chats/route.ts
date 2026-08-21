import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.*, uf.name AS from_name, ut.name AS to_name
       FROM chat_messages m
       JOIN users uf ON uf.id = m.from_id
       JOIN users ut ON ut.id = m.to_id
       ORDER BY m.created_at DESC LIMIT 200`
    )
    .all();
  const ngWords = (db.prepare("SELECT word FROM ng_words").all() as { word: string }[]).map((r) => r.word);
  return NextResponse.json({ messages: rows, ngWords });
}
