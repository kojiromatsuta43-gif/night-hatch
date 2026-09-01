import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(
    getDb().prepare("SELECT id, email, name, role, points, plan, ai_extra, created_at FROM users ORDER BY created_at").all()
  );
}
