import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  const user = await requireUser();
  const db = getDb();
  const rows =
    user.role === "admin"
      ? db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all()
      : user.role === "freelancer"
        ? // フリーランスは自分が担当する案件だけ見える
          db.prepare("SELECT * FROM projects WHERE assignee_id = ? ORDER BY created_at DESC").all(user.id)
        : db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC").all(user.id);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const db = getDb();
  if (user.points < body.points) {
    return NextResponse.json({ error: "はちみつPが足りません" }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO projects (id, user_id, title, category, description, points, deadline, status, detail, requested_on, assignee_id) VALUES (?, ?, ?, ?, ?, ?, ?, '募集中', ?, ?, ?)"
    ).run(id, user.id, body.title, body.category, body.description, body.points, body.deadline, JSON.stringify(body.detail ?? {}), new Date().toISOString().slice(0, 10), body.assignee_id ?? null);
    db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(body.points, user.id);
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'spend', ?)").run(
      crypto.randomUUID(), user.id, -body.points, `案件登録: ${body.title}`
    );
  });
  tx();
  return NextResponse.json({ id });
}
