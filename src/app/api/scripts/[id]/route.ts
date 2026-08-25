import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const row = getDb()
    .prepare("SELECT id, title, content, favorite, created_at FROM scripts WHERE id = ? AND user_id = ?")
    .get(id, user.id);
  if (!row) return NextResponse.json({ error: "台本が見つかりません" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { favorite } = await req.json();
  getDb()
    .prepare("UPDATE scripts SET favorite = ? WHERE id = ? AND user_id = ?")
    .run(favorite ? 1 : 0, id, user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  getDb().prepare("DELETE FROM scripts WHERE id = ? AND user_id = ?").run(id, user.id);
  return NextResponse.json({ ok: true });
}
