import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/**
 * 業種の更新（管理者のみ）
 *   { name }          … 名前を変える。参考アカウント側の業種名も一緒に付け替える
 *   { active }        … タブに出す / 出さない
 *   { move: "up"|"down" } … 並び順を1つ入れ替える
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const b = await req.json();
  const db = getDb();

  const cur = db.prepare("SELECT id, name, sort_order FROM industries WHERE id = ?").get(id) as
    | { id: string; name: string; sort_order: number }
    | undefined;
  if (!cur) return NextResponse.json({ error: "業種が見つかりません" }, { status: 404 });

  if (typeof b.name === "string") {
    const name = b.name.trim();
    if (!name) return NextResponse.json({ error: "業種名を入力してください" }, { status: 400 });
    const dup = db.prepare("SELECT id FROM industries WHERE name = ? AND id <> ?").get(name, id);
    if (dup) return NextResponse.json({ error: "同じ名前の業種がすでにあります" }, { status: 409 });
    db.transaction(() => {
      db.prepare("UPDATE industries SET name = ? WHERE id = ?").run(name, id);
      // 業種名で紐づけているので、参考アカウントとリクエストも一緒に付け替える
      db.prepare("UPDATE ref_accounts SET industry = ? WHERE industry = ?").run(name, cur.name);
      db.prepare("UPDATE industry_requests SET industry_name = ? WHERE industry_name = ?").run(name, cur.name);
    })();
  }

  if (typeof b.active === "boolean") {
    db.prepare("UPDATE industries SET active = ? WHERE id = ?").run(b.active ? 1 : 0, id);
  }

  if (b.move === "up" || b.move === "down") {
    const neighbour = db
      .prepare(
        b.move === "up"
          ? "SELECT id, sort_order FROM industries WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1"
          : "SELECT id, sort_order FROM industries WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1"
      )
      .get(cur.sort_order) as { id: string; sort_order: number } | undefined;
    if (neighbour) {
      db.transaction(() => {
        db.prepare("UPDATE industries SET sort_order = ? WHERE id = ?").run(neighbour.sort_order, cur.id);
        db.prepare("UPDATE industries SET sort_order = ? WHERE id = ?").run(cur.sort_order, neighbour.id);
      })();
    }
  }

  return NextResponse.json({ ok: true });
}

/** 業種の削除（管理者のみ）。使われている業種は消さずに非表示を促す。 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const cur = db.prepare("SELECT name FROM industries WHERE id = ?").get(id) as { name: string } | undefined;
  if (!cur) return NextResponse.json({ error: "業種が見つかりません" }, { status: 404 });

  const used = db.prepare("SELECT COUNT(*) AS c FROM ref_accounts WHERE industry = ?").get(cur.name) as { c: number };
  if (used.c > 0) {
    return NextResponse.json(
      { error: `この業種の参考アカウントが${used.c}件あります。削除ではなく「非表示」にしてください。` },
      { status: 409 }
    );
  }

  db.prepare("DELETE FROM industries WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
