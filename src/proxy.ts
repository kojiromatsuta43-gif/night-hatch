import { NextResponse, type NextRequest } from "next/server";

/**
 * 公開サイト専用ドメイン（SITE_HOST）の振り分け。
 *
 * SITE_HOST（例: night-hatch.jp。カンマ区切りで複数可）で開かれたときだけ働く:
 *  - 「/」→「/site」、「/drink」→「/site/drink」のように中で書き換える（URL は変わらない）
 *  - 「/site/…」で来たら「/…」にリダイレクト（URL を1つにそろえる）
 *  - ツールの画面は /site の下に無いので、このドメインからは開けない（404）
 *  - API は公開サイト用（/api/site/…）だけ通す
 * SITE_HOST が無いとき・ほかのドメインでは何もしない（サイトは /site の下で動く）。
 */
const PASS = /^\/(?:_next\/|api\/site\/|robots\.txt$|favicon\.ico$|icon\.svg$|apple-icon\.png$|brand\/)/;

function siteHosts(): string[] {
  return (process.env.SITE_HOST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

export function proxy(req: NextRequest) {
  const hosts = siteHosts();
  if (hosts.length === 0) return NextResponse.next();
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  if (!hosts.includes(host)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PASS.test(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return new NextResponse("Not Found", { status: 404 });
  if (pathname === "/site" || pathname.startsWith("/site/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(5) || "/";
    return NextResponse.redirect(url, 308);
  }
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/site" : `/site${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
