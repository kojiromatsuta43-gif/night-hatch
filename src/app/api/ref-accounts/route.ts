import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

export async function GET() {
  await requireUser();
  const db = getDb();
  const accounts = db.prepare("SELECT * FROM ref_accounts ORDER BY followers DESC").all() as {
    id: string;
  }[];
  const videos = db.prepare("SELECT * FROM ref_videos ORDER BY created_at ASC").all() as {
    account_id: string;
  }[];
  return NextResponse.json(
    accounts.map((a) => ({ ...a, videos: videos.filter((v) => v.account_id === a.id) }))
  );
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await req.json();
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO ref_accounts (id, name, handle, industry, followers, bio) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, b.name, b.handle ?? "", b.industry ?? "その他", b.followers ?? 0, b.bio ?? "");
  const insertVideo = db.prepare(
    "INSERT INTO ref_videos (id, account_id, caption, url, hue) VALUES (?, ?, ?, ?, ?)"
  );
  for (const line of (b.videos ?? "").split("\n").map((s: string) => s.trim()).filter(Boolean)) {
    const [caption, url] = line.split("|").map((s: string) => s.trim());
    insertVideo.run(crypto.randomUUID(), id, caption, url ?? "", Math.floor(Math.random() * 360));
  }
  return NextResponse.json({ id });
}
