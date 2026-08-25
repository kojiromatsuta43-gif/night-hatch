import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { notifyStatusChange } from "@/lib/server/notifications";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { status } = await req.json();
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | { user_id: string; title: string; status: string }
    | undefined;
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  db.prepare("UPDATE projects SET status = ? WHERE id = ?").run(status, id);

  // 進行が動いたことを発注者に知らせる
  if (status !== project.status) {
    notifyStatusChange(project.user_id, { id, title: project.title }, status);
  }

  return NextResponse.json({ ok: true });
}
