import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export type IndustryRow = {
  id: string;
  name: string;
  sort_order: number;
  active: number;
  account_count: number;
  requested: number;
};

/** 業種タブの一覧。参考アカウントの件数と、リクエスト数を一緒に返す。 */
export async function GET(req: Request) {
  const user = await requireUser();
  const includeHidden = new URL(req.url).searchParams.get("all") === "1" && user.role === "admin";

  const rows = getDb()
    .prepare(
      `SELECT i.id, i.name, i.sort_order, i.active,
              (SELECT COUNT(*) FROM ref_accounts a WHERE a.industry = i.name) AS account_count,
              (SELECT COUNT(*) FROM industry_requests r WHERE r.industry_name = i.name AND r.handled = 0) AS requested
         FROM industries i
        ${includeHidden ? "" : "WHERE i.active = 1"}
        ORDER BY i.sort_order, i.name`
    )
    .all() as IndustryRow[];

  return NextResponse.json(rows);
}

/** 業種の追加（管理者のみ） */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const name = String((await req.json()).name ?? "").trim();
  if (!name) return NextResponse.json({ error: "業種名を入力してください" }, { status: 400 });

  const db = getDb();
  const dup = db.prepare("SELECT id, active FROM industries WHERE name = ?").get(name) as
    | { id: string; active: number }
    | undefined;
  if (dup) {
    // 非表示にしてあっただけなら、消さずに戻す
    if (!dup.active) {
      db.prepare("UPDATE industries SET active = 1 WHERE id = ?").run(dup.id);
      return NextResponse.json({ id: dup.id, restored: true });
    }
    return NextResponse.json({ error: "同じ名前の業種がすでにあります" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO industries (id, name, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM industries))"
  ).run(id, name);
  return NextResponse.json({ id });
}
