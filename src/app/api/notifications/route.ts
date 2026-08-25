import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { NotificationRow, syncDeadlineNotices } from "@/lib/server/notifications";

/** 通知の一覧と未読件数。取得のたびに納期リマインドを作り直す（重複はしない）。 */
export async function GET() {
  const user = await requireUser();
  syncDeadlineNotices(user.id);

  const db = getDb();
  const items = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 50")
    .all(user.id) as NotificationRow[];
  const unread = (
    db.prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL").get(user.id) as {
      c: number;
    }
  ).c;

  return NextResponse.json({ items, unread });
}

/** 既読にする。{ all: true } で全件、{ id } で1件。 */
export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json().catch(() => ({}))) as { id?: string; all?: boolean };
  const db = getDb();

  if (body.all) {
    db.prepare(
      "UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL"
    ).run(user.id);
  } else if (body.id) {
    db.prepare(
      "UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ? AND read_at IS NULL"
    ).run(body.id, user.id);
  }

  return NextResponse.json({ ok: true });
}
