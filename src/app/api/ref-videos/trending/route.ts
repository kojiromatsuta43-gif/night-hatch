import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { viewGrowth7d } from "@/lib/server/tiktok";

/**
 * いま伸びている動画。sort=growth（今週の伸び）| views（再生数）| new（新着）。
 * 再生数が入っている動画（自動取り込み分）だけが対象。
 */
export async function GET(req: Request) {
  await requireUser();
  const url = new URL(req.url);
  const industry = (url.searchParams.get("industry") ?? "").trim();
  const sort = url.searchParams.get("sort") ?? "growth";
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") ?? 12)));
  const db = getDb();

  const where = ["v.views > 0"];
  const params: unknown[] = [];
  if (industry && industry !== "すべて") {
    where.push("a.industry = ?");
    params.push(industry);
  }
  // 伸び順は候補を多めに取ってから履歴で並べ替える
  const order = sort === "new" ? "v.posted_at DESC, v.views DESC" : "v.views DESC";
  const rows = db
    .prepare(
      `SELECT v.id, v.caption, v.url, v.hue, v.views, v.likes, v.posted_at,
              a.id AS account_id, a.name AS accountName, a.handle, a.followers, a.industry, a.icon_url
         FROM ref_videos v JOIN ref_accounts a ON a.id = v.account_id
        WHERE ${where.join(" AND ")}
        ORDER BY ${order}
        LIMIT ?`
    )
    .all(...params, sort === "growth" ? limit * 6 : limit) as {
    id: string; caption: string; url: string; hue: number; views: number; likes: number; posted_at: string;
    account_id: string; accountName: string; handle: string; followers: number; industry: string; icon_url: string;
  }[];

  const growth = viewGrowth7d(rows.map((r) => r.id));
  let items = rows.map((r) => ({ ...r, growth: growth.get(r.id) ?? 0, spread: r.followers > 0 ? Math.round((r.views / r.followers) * 10) / 10 : 0 }));
  if (sort === "growth") {
    items = items.sort((a, b) => b.growth - a.growth || b.views - a.views).slice(0, limit);
  }
  return NextResponse.json(items);
}
