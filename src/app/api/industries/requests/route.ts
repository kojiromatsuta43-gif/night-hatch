import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/** 「この業種のお手本を追加してほしい」リクエストの一覧（管理者のみ） */
export async function GET() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = getDb()
    .prepare(
      `SELECT r.industry_name, COUNT(*) AS count, MAX(r.created_at) AS last_at,
              GROUP_CONCAT(u.name, '、') AS names
         FROM industry_requests r
         LEFT JOIN users u ON u.id = r.user_id
        WHERE r.handled = 0
        GROUP BY r.industry_name
        ORDER BY count DESC, last_at DESC`
    )
    .all();
  return NextResponse.json(rows);
}

/** リクエストを送る（ログイン中の全ユーザー） */
export async function POST(req: Request) {
  const user = await requireUser();
  const b = await req.json();
  const name = String(b.industry_name ?? "").trim();
  if (!name) return NextResponse.json({ error: "業種が指定されていません" }, { status: 400 });

  const db = getDb();
  const exists = db.prepare("SELECT id FROM industries WHERE name = ?").get(name);
  if (!exists) return NextResponse.json({ error: "業種が見つかりません" }, { status: 404 });

  try {
    db.prepare(
      "INSERT INTO industry_requests (id, industry_name, user_id, note) VALUES (?,?,?,?)"
    ).run(crypto.randomUUID(), name, user.id, String(b.note ?? "").slice(0, 200));
  } catch {
    // 同じ人が同じ業種を2回押した場合。すでに届いているので成功扱いにする。
    return NextResponse.json({ ok: true, already: true });
  }
  return NextResponse.json({ ok: true });
}

/** リクエストを対応済みにする（管理者のみ） */
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const name = String((await req.json()).industry_name ?? "").trim();
  if (!name) return NextResponse.json({ error: "業種が指定されていません" }, { status: 400 });
  const db = getDb();
  db.transaction(() => {
    // 同じ人の「対応済み」がすでにある場合は、今回の分を残すと重複になるので先に消す
    db.prepare(
      `DELETE FROM industry_requests
        WHERE industry_name = ? AND handled = 0
          AND EXISTS (
            SELECT 1 FROM industry_requests r2
             WHERE r2.industry_name = industry_requests.industry_name
               AND r2.user_id = industry_requests.user_id
               AND r2.handled = 1)`
    ).run(name);
    db.prepare("UPDATE industry_requests SET handled = 1 WHERE industry_name = ? AND handled = 0").run(name);
  })();
  return NextResponse.json({ ok: true });
}
