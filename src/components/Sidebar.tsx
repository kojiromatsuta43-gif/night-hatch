"use client";

/**
 * ナビゲーション。
 *  - デスクトップ: 左のレール。よく使う5つを大きく、残りは「もっと」の下に小さく。
 *  - スマホ: 画面下のタブバー（ホーム／メニュー／オーダー／ハッチ／もっと）。「もっと」で全部のメニューが出る。
 * 言葉は「夜のお店の言葉」。画面のパス（href）は変えていない。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { Mascot } from "./MascotProvider";
import { useMe } from "./AppShell";
import NavIcon, { type NavIconName } from "./NavIcon";
import { api } from "@/lib/client";

type Item = { href: string; label: string; icon: NavIconName; sub?: string };

// デモ運用が終わったら Railway に NEXT_PUBLIC_SHOW_GUIDE=off を入れると「デモの歩き方」が消える
const SHOW_GUIDE = process.env.NEXT_PUBLIC_SHOW_GUIDE !== "off";

function menusFor(role: string | undefined, hasSales: boolean): { primary: Item[]; more: Item[] } {
  if (role === "freelancer") {
    const more: Item[] = [
      { href: "/order/reference", label: "伸びてるお店の動画", icon: "video" },
      { href: "/chat", label: "お店とのやりとり", icon: "chat" },
    ];
    if (hasSales) more.push({ href: "/sales", label: "営業リスト", icon: "list" });
    return {
      primary: [
        { href: "/", label: "ホーム", icon: "month", sub: "今月のようす" },
        { href: "/jobs", label: "お仕事をさがす", icon: "search", sub: "受けられる仕事" },
        { href: "/projects", label: "担当している仕事", icon: "tray", sub: "進み具合と修正" },
      ],
      more,
    };
  }
  const more: Item[] = [
    { href: "/order/reference", label: "伸びてるお店の動画をまねる", icon: "video" },
    { href: "/scripts", label: "台本ノート", icon: "note" },
    { href: "/brand-profile", label: "うちの店のこと", icon: "shop" },
    { href: "/listing", label: "HPの掲載（Night HATCH）", icon: "shop" },
    { href: "/video-analysis", label: "動画を診てもらう", icon: "diagnose" },
    { href: "/chat", label: "担当とのやりとり", icon: "chat" },
    { href: "/reports", label: "ふりかえり", icon: "report" },
    { href: "/issue", label: "お会計（発注書・請求書）", icon: "bill" },
  ];
  if (hasSales) more.push({ href: "/sales", label: "営業リスト", icon: "list" }, { href: "/sales/form", label: "メール＆フォーム営業", icon: "mail" });
  if (SHOW_GUIDE) more.push({ href: "/guide", label: "デモの歩き方", icon: "guide" });
  if (role === "admin") more.push({ href: "/admin", label: "管理", icon: "admin" });
  return {
    primary: [
      { href: "/", label: "ホーム", icon: "month", sub: "今夜のカウンター" },
      { href: "/order", label: "メニュー", icon: "order", sub: "困りごとから頼む" },
      { href: "/projects", label: "オーダー", icon: "tray", sub: "進み具合" },
      { href: "/agent", label: "ハッチに相談", icon: "hatch", sub: "話しかけるだけ" },
      { href: "/points", label: "ハニーのボトル", icon: "jar", sub: "残高と購入" },
    ],
    more,
  };
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/order") return pathname === "/order" || pathname.startsWith("/order/create") || pathname.startsWith("/order/menu");
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { me } = useMe();
  const { primary, more } = menusFor(role, Boolean(me?.hasSales));

  // いま「もっと」の中の画面にいるなら、最初から開いておく
  useEffect(() => {
    if (more.some((m) => isActive(pathname, m.href))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowMore(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // 画面遷移したらモバイルのシートを閉じる
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/sign-in";
  };

  const primaryNav = (big: boolean) => (
    <div className="space-y-1">
      {primary.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
              active ? "relative bg-night-500 text-white shadow-sm before:absolute before:inset-y-2 before:-left-3 before:w-[3px] before:rounded-full before:bg-gold-500" : "text-hive-900 hover:bg-night-100"
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${active ? "bg-white/15" : "border border-gold-200 bg-ink-700"}`}>
              <NavIcon name={item.icon} className={`h-5 w-5 ${active ? "text-white" : "text-gold-500"}`} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold leading-tight">{item.label}</span>
              {big && item.sub && <span className={`block text-[11px] ${active ? "text-white/80" : "text-hive-500"}`}>{item.sub}</span>}
            </span>
          </Link>
        );
      })}
    </div>
  );

  const moreNav = (
    <div className="space-y-0.5">
      {more.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors ${
              active ? "bg-night-100 text-night-800" : "text-hive-700 hover:bg-cream-200 hover:text-hive-900"
            }`}
          >
            <NavIcon name={item.icon} className={`h-4 w-4 shrink-0 ${active ? "text-gold-500" : "text-hive-500"}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* デスクトップ: 左のレール */}
      <aside className="hidden w-64 shrink-0 border-r border-gold-200/60 bg-ink-900 px-3 py-5 md:block">
        {primaryNav(true)}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="mt-5 flex w-full items-center gap-2 px-3 text-[11px] font-black tracking-widest text-gold-400 hover:text-gold-600"
          aria-expanded={showMore}
        >
          <span className="h-px flex-1 bg-gold-200" aria-hidden="true" />
          {showMore ? "とじる" : "もっと"}
          <span className="h-px flex-1 bg-gold-200" aria-hidden="true" />
        </button>
        {showMore && <div className="mt-2">{moreNav}</div>}
      </aside>

      {/* スマホ: 下のタブバー */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gold-200 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="メニュー">
        {primary.slice(0, 4).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${active ? "text-gold-500" : "text-hive-500"}`}>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-night-500 text-white" : ""}`}>
                <NavIcon name={item.icon} className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button onClick={() => setOpen(true)} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${open ? "text-gold-500" : "text-hive-500"}`} aria-label="もっと見る">
          <span className="flex h-7 w-12 items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </span>
          もっと
        </button>
      </nav>

      {/* スマホ: 「もっと」のシート */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-gold-300 bg-ink-800 px-4 pb-8 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gold-300" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between px-1">
              <span className="flex items-center gap-2">
                <Mascot className="h-8 w-8" />
                <span className="font-latin text-lg text-gold-600">{BRAND.name}</span>
              </span>
              <button onClick={() => setOpen(false)} aria-label="閉じる" className="rounded-full px-2 py-1 text-hive-500 hover:text-hive-900">✕</button>
            </div>
            {primaryNav(false)}
            <div className="my-4 h-px bg-gold-200" />
            {moreNav}
            <button onClick={logout} className="mt-6 w-full rounded-full border border-night-200 py-2.5 text-xs font-bold text-hive-500 hover:bg-night-50">
              ログアウト
            </button>
          </div>
        </div>
      )}
    </>
  );
}
