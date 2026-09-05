import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

type Ctx = { params: Promise<{ id: string }> };

/** 会話の名前変更・ピン留め */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  const db = getDb();
  const row = db.prepare("SELECT id FROM agent_sessions WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!row) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  if (typeof b.title === "string") {
    const title = b.title.trim().slice(0, 60);
    if (!title) return NextResponse.json({ error: "名前を入れてください" }, { status: 400 });
    db.prepare("UPDATE agent_sessions SET title = ? WHERE id = ?").run(title, id);
  }
  if (typeof b.pinned === "boolean") db.prepare("UPDATE agent_sessions SET pinned = ? WHERE id = ?").run(b.pinned ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}

/** 会話の削除 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  const { id } = await ctx.params;
  const r = getDb().prepare("DELETE FROM agent_sessions WHERE id = ? AND user_id = ?").run(id, user.id);
  if (!r.changes) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
