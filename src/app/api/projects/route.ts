import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { notifyNewJob } from "@/lib/server/notifications";
import { pointsFor, catalogItem } from "@/lib/brand";

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
  if (!catalogItem(String(body.category ?? ""))) {
    return NextResponse.json({ error: "案件の種類を選んでください" }, { status: 400 });
  }
  const detail = (body.detail && typeof body.detail === "object" ? body.detail : {}) as Record<string, unknown>;
  // 消費ptは画面から送られた数字ではなく、メニュー表（件数メニューは件数×単価）から計算し直す
  const points = pointsFor(String(body.category), detail);
  if (user.points < points) {
    return NextResponse.json({ error: `はちみつPが足りません（必要 ${points} / 残高 ${user.points}）` }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO projects (id, user_id, title, category, description, points, deadline, status, detail, requested_on, assignee_id) VALUES (?, ?, ?, ?, ?, ?, ?, '募集中', ?, ?, ?)"
    ).run(id, user.id, body.title, body.category, body.description, points, body.deadline, JSON.stringify(detail), new Date().toISOString().slice(0, 10), body.assignee_id ?? null);
    db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(points, user.id);
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'spend', ?)").run(
      crypto.randomUUID(), user.id, -points, `案件登録: ${body.title}`
    );
  });
  tx();

  // 募集中で登録されるので、この時点でフリーランスに知らせる
  notifyNewJob({
    id,
    title: body.title,
    category: body.category,
    deadline: body.deadline,
    assignee_id: body.assignee_id ?? null,
  });

  return NextResponse.json({ id });
}
