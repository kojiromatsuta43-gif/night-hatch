import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { status } = await req.json();
  getDb().prepare("UPDATE invoices SET status = ? WHERE id = ? AND user_id = ?").run(status, id, user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  getDb().prepare("DELETE FROM invoices WHERE id = ? AND user_id = ?").run(id, user.id);
  return NextResponse.json({ ok: true });
}
