import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare("SELECT * FROM brand_profiles WHERE user_id = ? ORDER BY updated_at DESC")
    .all(user.id);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { name } = await req.json();
  const id = crypto.randomUUID();
  getDb()
    .prepare("INSERT INTO brand_profiles (id, user_id, name) VALUES (?, ?, ?)")
    .run(id, user.id, name || "新規プロファイル");
  return NextResponse.json({ id });
}
