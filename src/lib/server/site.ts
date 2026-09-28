/**
 * 公開サイト（Night HATCH）の URL の組み立て。
 *
 * 通常はツールと同じドメインの /site の下で動く。
 * 環境変数 SITE_HOST（例: night-hatch.jp。カンマ区切りで複数可）を入れ、そのドメインで開かれたときは
 * src/proxy.ts が「/」→「/site」、「/drink」→「/site/drink」…と中で書き換える。
 * そのときの画面内リンクは /site を付けない形にする（base = ""）。
 */
import { headers } from "next/headers";
import { currentUser } from "./auth";
import { siteDemoOn } from "./listings";

export function siteHosts(): string[] {
  return (process.env.SITE_HOST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

export type SiteCtx = {
  /** 画面内リンクの頭（"/site" か ""） */
  base: string;
  /** いま開かれているオリジン（https://…） */
  origin: string;
  /** 正規URL（canonical・OG・サイトマップ）用: SITE_HOST があればそのドメイン、無ければ今のオリジン＋/site */
  canonicalBase: string;
  /** ツール側（ログインして使う画面）の URL の頭。サイト専用ドメインで開かれているときは APP_PUBLIC_URL（無ければ null＝リンクを出さない） */
  appBase: string | null;
  onSiteHost: boolean;
};

export async function siteContext(): Promise<SiteCtx> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim().toLowerCase();
  const hostname = host.replace(/:\d+$/, "");
  const hosts = siteHosts();
  const onSiteHost = hosts.includes(hostname);
  const local = hostname === "localhost" || hostname.startsWith("127.") || hostname.startsWith("192.168.");
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() || (local ? "http" : "https");
  const origin = `${proto}://${host}`;
  const canonicalBase = hosts.length > 0 ? `https://${hosts[0]}` : `${origin}/site`;
  const app = (process.env.APP_PUBLIC_URL ?? "").replace(/\/$/, "");
  return {
    base: onSiteHost ? "" : "/site",
    origin,
    canonicalBase,
    appBase: onSiteHost ? app || null : "",
    onSiteHost,
  };
}

/** ページごとの title / description / canonical / OG をそろえる */
export function pageMeta(
  ctx: SiteCtx,
  p: { path: string; title?: string; description: string; image?: string | null; type?: "website" | "article" }
): import("next").Metadata {
  const url = `${ctx.canonicalBase}${p.path === "/" ? "" : p.path}` || ctx.canonicalBase;
  const image = p.image ? (p.image.startsWith("http") ? p.image : `${ctx.origin}${p.image}`) : null;
  return {
    ...(p.title ? { title: p.title } : {}),
    description: p.description,
    alternates: { canonical: url },
    openGraph: {
      ...(p.title ? { title: p.title } : {}),
      description: p.description,
      url,
      type: p.type ?? "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

/** 社内確認用のデモ表示を出すか（管理画面で ON ＋ ログインしている人だけ） */
export async function demoVisible(): Promise<boolean> {
  if (!siteDemoOn()) return false;
  const u = await currentUser().catch(() => null);
  return Boolean(u);
}
