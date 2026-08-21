import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

// 移行元CMSから参考動画を取り込む（管理者が管理画面から実行）。
// SOURCE_CMS_BASE を .env.local で切り替え可能。
const SOURCE = process.env.SOURCE_CMS_BASE ?? "https://demo.sodatsu-work.jp/api/microcms";

type SourceVideo = { videoUrl?: string; description?: string; thumbnailUrl?: string };
type SourceAccount = { id: string; userId: string };

export async function POST() {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = getDb();
  const accounts = db.prepare("SELECT id, handle, name FROM ref_accounts").all() as {
    id: string; handle: string; name: string;
  }[];

  let list: { contents: SourceAccount[] };
  try {
    const res = await fetch(`${SOURCE}/accounts`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    list = await res.json();
  } catch (e) {
    return NextResponse.json(
      { error: `移行元に接続できませんでした: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 502 }
    );
  }

  const cmsIdByUser = new Map(list.contents.map((c) => [c.userId, c.id]));
  const insert = db.prepare(
    "INSERT INTO ref_videos (id, account_id, caption, url, thumbnail, hue) VALUES (?,?,?,?,?,?)"
  );
  const clear = db.prepare("DELETE FROM ref_videos WHERE account_id = ?");

  let importedAccounts = 0;
  let importedVideos = 0;
  const skipped: string[] = [];

  for (const acc of accounts) {
    const cmsId = cmsIdByUser.get(acc.handle.replace(/^@/, ""));
    if (!cmsId) { skipped.push(acc.name); continue; }
    try {
      const res = await fetch(`${SOURCE}/accounts/${cmsId}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) { skipped.push(acc.name); continue; }
      const detail = (await res.json()) as { videos?: SourceVideo[] };
      const videos = (detail.videos ?? []).filter((v) => v.videoUrl);
      if (!videos.length) { skipped.push(acc.name); continue; }
      db.transaction(() => {
        clear.run(acc.id);
        for (const v of videos) {
          insert.run(
            crypto.randomUUID(),
            acc.id,
            (v.description ?? "").slice(0, 300) || "参考動画",
            v.videoUrl ?? "",
            v.thumbnailUrl ?? "",
            Math.floor(Math.random() * 360)
          );
        }
      })();
      importedAccounts++;
      importedVideos += videos.length;
    } catch {
      skipped.push(acc.name);
    }
  }

  return NextResponse.json({ importedAccounts, importedVideos, skipped: skipped.slice(0, 20), skippedCount: skipped.length });
}
