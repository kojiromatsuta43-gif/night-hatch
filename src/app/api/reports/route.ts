import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { expiringSoon } from "@/lib/server/points-ledger";
import { planOf } from "@/lib/points";

/**
 * お客様向け月次レポート。
 * 「今月作った本数・使ったハニー・動画の伸び」を、その場で集計して返す。
 * 保存はしない（いつ見ても最新の数字が出るように）。
 */
export async function GET(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month") ?? "";
  const month = /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);

  // 管理者は ?user_id= で任意のお客様のレポートを見られる（サポート用）
  const targetId =
    user.role === "admin" && searchParams.get("user_id") ? String(searchParams.get("user_id")) : user.id;

  const db = getDb();
  const u = db
    .prepare("SELECT id, name, plan, plan_active, tiktok_handle, points FROM users WHERE id = ?")
    .get(targetId) as
    | { id: string; name: string; plan: string; plan_active: number; tiktok_handle: string; points: number }
    | undefined;
  if (!u) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });

  // ── 制作の実績 ──
  const ordered = (db
    .prepare("SELECT COUNT(*) AS c FROM projects WHERE user_id = ? AND substr(requested_on, 1, 7) = ?")
    .get(targetId, month) as { c: number }).c;
  const submissions = (db
    .prepare(
      `SELECT COUNT(*) AS c FROM deliverables d JOIN projects p ON p.id = d.project_id
        WHERE p.user_id = ? AND d.kind = '提出' AND substr(d.created_at, 1, 7) = ?`
    )
    .get(targetId, month) as { c: number }).c;
  const accepted = (db
    .prepare(
      `SELECT COUNT(*) AS c FROM deliverables d JOIN projects p ON p.id = d.project_id
        WHERE p.user_id = ? AND d.kind = '提出' AND d.status = '検収OK' AND substr(d.created_at, 1, 7) = ?`
    )
    .get(targetId, month) as { c: number }).c;
  const monthProjects = db
    .prepare(
      `SELECT id, title, category, points, status FROM projects
        WHERE user_id = ?
          AND (substr(requested_on, 1, 7) = ?
               OR id IN (SELECT project_id FROM deliverables WHERE substr(created_at, 1, 7) = ?))
        ORDER BY created_at DESC LIMIT 30`
    )
    .all(targetId, month, month) as { id: string; title: string; category: string; points: number; status: string }[];

  // ── ハニーPの動き ──
  const honey = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS granted,
         COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS spent
        FROM point_transactions WHERE user_id = ? AND substr(created_at, 1, 7) = ?`
    )
    .get(targetId, month) as { granted: number; spent: number };
  const spendDetail = db
    .prepare(
      `SELECT memo, amount, created_at FROM point_transactions
        WHERE user_id = ? AND amount < 0 AND substr(created_at, 1, 7) = ?
        ORDER BY created_at DESC LIMIT 30`
    )
    .all(targetId, month) as { memo: string; amount: number; created_at: string }[];

  // ── AIの利用 ──
  const ai = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN kind = 'chat' THEN 1 ELSE 0 END), 0) AS chat,
         COALESCE(SUM(CASE WHEN kind = 'gen' THEN 1 ELSE 0 END), 0) AS gen
        FROM ai_usage WHERE user_id = ? AND month = ?`
    )
    .get(targetId, month) as { chat: number; gen: number };

  // ── 動画の伸び（TikTokアカウントを紐付けている場合のみ） ──
  let videoGrowth: {
    handle: string;
    followers: number;
    monthViews: number;
    videos: { caption: string; url: string; views: number; growth: number; posted_at: string }[];
  } | null = null;
  if (u.tiktok_handle) {
    const account = db
      .prepare("SELECT id, handle, followers FROM ref_accounts WHERE handle = ?")
      .get(u.tiktok_handle) as { id: string; handle: string; followers: number } | undefined;
    if (account) {
      const vids = db
        .prepare(
          `SELECT v.caption, v.url, v.views, v.posted_at,
                  COALESCE((SELECT MAX(s.views) - MIN(s.views) FROM ref_video_stats s
                             WHERE s.video_id = v.id AND s.day LIKE ? || '%'), 0) AS growth
             FROM ref_videos v WHERE v.account_id = ?
             ORDER BY growth DESC, v.views DESC LIMIT 10`
        )
        .all(month, account.id) as { caption: string; url: string; views: number; growth: number; posted_at: string }[];
      videoGrowth = {
        handle: account.handle,
        followers: account.followers,
        monthViews: vids.reduce((a, v) => a + v.growth, 0),
        videos: vids,
      };
    }
  }

  const plan = planOf(u.plan);
  return NextResponse.json({
    month,
    user: { name: u.name, plan: plan?.name ?? u.plan, planActive: u.plan_active === 1, points: u.points },
    production: { ordered, submissions, accepted, projects: monthProjects },
    honey: { ...honey, balance: u.points, expiring: expiringSoon(targetId, 60), detail: spendDetail },
    ai,
    videoGrowth,
  });
}
