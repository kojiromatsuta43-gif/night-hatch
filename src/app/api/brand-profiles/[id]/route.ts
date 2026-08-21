import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const body = await req.json();
  getDb()
    .prepare(
      "UPDATE brand_profiles SET name = ?, facts = ?, stances = ?, ng_items = ?, notes = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
    )
    .run(
      body.name,
      JSON.stringify(body.facts ?? []),
      JSON.stringify(body.stances ?? []),
      JSON.stringify(body.ng_items ?? []),
      body.notes ?? "",
      id,
      user.id
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  getDb().prepare("DELETE FROM brand_profiles WHERE id = ? AND user_id = ?").run(id, user.id);
  return NextResponse.json({ ok: true });
}
