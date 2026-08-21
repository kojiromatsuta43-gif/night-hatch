import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

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
