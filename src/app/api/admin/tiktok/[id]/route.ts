import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await req.json();
  const db = getDb();
  if (typeof b.active === "boolean") db.prepare("UPDATE tiktok_queries SET active = ? WHERE id = ?").run(b.active ? 1 : 0, id);
  if (typeof b.industry === "string" && b.industry.trim()) db.prepare("UPDATE tiktok_queries SET industry = ? WHERE id = ?").run(b.industry.trim(), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  getDb().prepare("DELETE FROM tiktok_queries WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
