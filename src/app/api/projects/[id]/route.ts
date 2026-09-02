import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { projectCallStats } from "@/lib/server/sales";
import { notifyStatusChange } from "@/lib/server/notifications";

type ProjectRow = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  assignee_id: string | null;
};

/** 発注者本人・担当者・管理者だけが見られる */
function canView(p: ProjectRow, user: { id: string; role: string }) {
  return p.user_id === user.id || p.assignee_id === user.id || user.role === "admin";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const db = getDb();

  const project = db
    .prepare(
      `SELECT p.*, u.name AS owner_name, a.name AS assignee_name
       FROM projects p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN users a ON a.id = p.assignee_id
       WHERE p.id = ?`
    )
    .get(id) as (ProjectRow & Record<string, unknown>) | undefined;

  if (!project) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  if (!canView(project, user)) return NextResponse.json({ error: "閲覧権限がありません" }, { status: 403 });

  const deliverables = db
    .prepare(
      `SELECT d.*, u.name AS author_name, up.filename AS upload_name, up.mime AS upload_mime
       FROM deliverables d
       LEFT JOIN users u ON u.id = d.user_id
       LEFT JOIN uploads up ON up.id = d.upload_id
       WHERE d.project_id = ?
       ORDER BY d.created_at`
    )
    .all(id);

  // 提出物ごとの修正指示コメント（動画の再生位置つき）
  const comments = db
    .prepare(
      `SELECT c.id, c.deliverable_id, c.user_id, c.at_seconds, c.body, c.created_at, u.name AS author_name
       FROM deliverable_comments c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.project_id = ? ORDER BY c.created_at`
    )
    .all(id);

  // 担当者に指定できる人（フリーランス）
  const assignees = db
    .prepare("SELECT id, name FROM users WHERE role = 'freelancer' ORDER BY name")
    .all();

  // 架電案件なら、紐付いた営業リストの集計も一緒に返す
  const leadStats = /架電|テレアポ/.test(String(project.category)) ? projectCallStats(id) : null;

  return NextResponse.json({ ...project, deliverables, comments, assignees, leadStats });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as ProjectRow | undefined;
  if (!project) return NextResponse.json({ error: "案件が見つかりません" }, { status: 404 });
  if (!canView(project, user)) return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  if (typeof body.status === "string" && body.status !== project.status) {
    db.prepare("UPDATE projects SET status = ? WHERE id = ?").run(body.status, id);
    notifyStatusChange(project.user_id, { id, title: project.title }, body.status);
    // 担当者にも同じ知らせを出す
    if (project.assignee_id && project.assignee_id !== project.user_id) {
      notifyStatusChange(project.assignee_id, { id, title: project.title }, body.status);
    }
  }

  if ("assignee_id" in body) {
    const next: string | null = body.assignee_id || null;
    db.prepare("UPDATE projects SET assignee_id = ? WHERE id = ?").run(next, id);
  }

  if (typeof body.deadline === "string" && body.deadline) {
    db.prepare("UPDATE projects SET deadline = ? WHERE id = ?").run(body.deadline, id);
  }

  return NextResponse.json({ ok: true });
}
