import { NextResponse } from "next/server";
import { recordClick } from "@/lib/server/listings";

/**
 * 公開サイトの「公式LINE」ボタンが押された回数を数える（ログイン不要）。
 * 記録するのは お店・種類（drink / work）・日時だけ。IPアドレスや端末の情報は保存しない。
 * 画面からは navigator.sendBeacon で送る（text/plain の JSON）。
 */
export async function POST(req: Request) {
  let body: { slug?: unknown; kind?: unknown } = {};
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug.slice(0, 60) : "";
  const kind = body.kind === "drink" || body.kind === "work" ? body.kind : null;
  if (!slug || !kind) return NextResponse.json({ ok: false }, { status: 400 });
  const ok = recordClick(slug, kind);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
