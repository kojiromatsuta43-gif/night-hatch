import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  await requireUser();
  const db = getDb();
  // 一覧では動画本体を返さず件数のみ（ペイロード削減）
  const accounts = db
    .prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM ref_videos v WHERE v.account_id = a.id) AS loaded_videos
       FROM ref_accounts a ORDER BY a.followers DESC`
    )
    .all();
  return NextResponse.json(accounts);
}

async function fetchOembed(url: string): Promise<{ title: string; thumbnail: string }> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { title: "", thumbnail: "" };
    const data = await res.json();
    return { title: data.title ?? "", thumbnail: data.thumbnail_url ?? "" };
  } catch {
    return { title: "", thumbnail: "" };
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await req.json();
  const db = getDb();

  // 既存アカウントへの動画追加（accountId指定時）または新規アカウント作成
  let accountId = b.accountId as string | undefined;
  if (!accountId) {
    accountId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO ref_accounts (id, name, handle, industry, followers, bio) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(accountId, b.name, b.handle ?? "", b.industry ?? "その他", b.followers ?? 0, b.bio ?? "");
  }

  const insertVideo = db.prepare(
    "INSERT INTO ref_videos (id, account_id, caption, url, thumbnail, hue) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const lines = ((b.videos ?? "") as string).split("\n").map((s) => s.trim()).filter(Boolean);
  let added = 0;
  for (const line of lines) {
    let caption = "";
    let url = "";
    if (line.startsWith("http")) {
      url = line;
    } else {
      const [c, u] = line.split("|").map((s) => s.trim());
      caption = c ?? "";
      url = u ?? "";
    }
    let thumbnail = "";
    if (url.includes("tiktok.com")) {
      const meta = await fetchOembed(url);
      if (!caption) caption = meta.title.slice(0, 80) || "参考動画";
      thumbnail = meta.thumbnail;
    }
    insertVideo.run(crypto.randomUUID(), accountId, caption || "参考動画", url, thumbnail, Math.floor(Math.random() * 360));
    added++;
  }
  return NextResponse.json({ id: accountId, added });
}
