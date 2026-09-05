"use client";

/**
 * 左サイドバー。業務ツールとしての基本の並び（12項目）は動かさず、
 * 見た目は食堂の世界観（クリーム地・テラコッタ・選択中は六角形）に合わせる。
 * 項目は「つくる／すすめる／みる」の3つの見出しでまとめる。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { Mascot, useMascot } from "./MascotProvider";
import { useMe } from "./AppShell";
import NavIcon, { type NavIconName } from "./NavIcon";
import { api } from "@/lib/client";

type Item = { href: string; label: string; icon: NavIconName; sub?: string };
type Group = { heading: string; items: Item[] };

// デモ運用が終わったら Railway に NEXT_PUBLIC_SHOW_GUIDE=off を入れると「デモの歩き方」が消える
const SHOW_GUIDE = process.env.NEXT_PUBLIC_SHOW_GUIDE !== "off";

/**
 * メニューの言葉は「お店の人の言葉」で。業務用語（発注・案件・請求）は使わない。
 * 画面のパス（href）は変えていないので、ブックマークや通知のリンクはそのまま動く。
 */
function groupsFor(role: string | undefined, pointName: string, hasSales: boolean): Group[] {
  if (role === "freelancer") {
    const go: Item[] = [{ href: "/projects", label: "担当している仕事", icon: "tray" }];
    if (hasSales) go.push({ href: "/sales", label: "営業リスト", icon: "list" });
    go.push({ href: "/chat", label: "お店とのやりとり", icon: "chat" });
    return [
      { heading: "さがす", items: [{ href: "/jobs", label: "お仕事をさがす", icon: "search" }] },
      { heading: "すすめる", items: go },
      { heading: "みる", items: [{ href: "/", label: "今月のようす", icon: "month" }, { href: "/order/reference", label: "伸びてる店の動画", icon: "video" }] },
    ];
  }
  const see: Item[] = [
    { href: "/", label: "今月のようす", icon: "month" },
    { href: "/reports", label: "ふりかえり", icon: "report" },
    { href: "/issue", label: "お会計", icon: "bill" },
    { href: "/points", label: "ハニーの壺", icon: "jar" },
  ];
  if (SHOW_GUIDE) see.push({ href: "/guide", label: "デモの歩き方", icon: "guide" });
  if (role === "admin") see.push({ href: "/admin", label: "管理", icon: "admin" });
  const go: Item[] = [{ href: "/projects", label: "頼んだもの", icon: "tray" }];
  if (hasSales) go.push({ href: "/sales", label: "営業リスト", icon: "list" }, { href: "/sales/form", label: "メール＆フォーム営業", icon: "mail" });
  go.push({ href: "/chat", label: "担当とのやりとり", icon: "chat" });
  return [
    {
      heading: "頼む",
      items: [
        { href: "/order", label: "お品書きから頼む", icon: "order" },
        { href: "/order/reference", label: "伸びてる店の動画をまねる", icon: "video" },
        { href: "/agent", label: "ハッチに相談", icon: "hatch" },
        { href: "/scripts", label: "台本ノート", icon: "note" },
        { href: "/brand-profile", label: "うちの店のこと", icon: "shop" },
        { href: "/video-analysis", label: "動画を診てもらう", icon: "diagnose" },
      ],
    },
    { heading: "すすめる", items: go },
    { heading: "みる", items: see },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/order") return pathname === "/order" || pathname.startsWith("/order/create") || pathname.startsWith("/order/menu");
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // デスクトップの折りたたみ。前回の状態を覚えておく
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("sidebar_collapsed") === "1") {
        // 初回マウント時に保存済みの状態へ戻す（サーバー描画と合わせるため effect で行う）
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(true);
      }
    } catch { /* プライベートモード等では覚えない */ }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("sidebar_collapsed", c ? "0" : "1"); } catch { /* 無視 */ }
      return !c;
    });
  };
  const { mascot } = useMascot();
  const { me } = useMe();
  const groups = groupsFor(role, mascot.pointName, Boolean(me?.hasSales));

  // 画面遷移したらモバイルのメニューを閉じる（遷移前のパスを覚えておいて比べる）
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const nav = (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.heading}>
          <div className="mb-1.5 flex items-center gap-2 px-3 text-[11px] font-black tracking-widest text-food-600"><span className="h-px w-3 bg-food-300" aria-hidden="true" />{g.heading}</div>
          <div className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm font-bold transition-colors ${
                    active ? "hex-tab bg-food-500 text-white" : "text-hive-700 hover:bg-food-100 hover:text-hive-900"
                  }`}
                >
                  <NavIcon name={item.icon} className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-food-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* デスクトップ（折りたたみ可） */}
      <aside
        className={`hidden shrink-0 overflow-hidden border-food-200 bg-cream-50 transition-all md:block ${
          collapsed ? "w-0 border-r-0" : "w-64 border-r px-3 py-5"
        }`}
      >
        {!collapsed && nav}
      </aside>
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? "メニューを開く" : "メニューをたたむ"}
        title={collapsed ? "メニューを開く" : "メニューをたたむ"}
        className="fixed top-14 z-40 hidden h-9 w-9 items-center justify-center rounded-xl border border-food-200 bg-food-500 text-base font-black text-white shadow-sm transition-all hover:bg-food-600 md:flex"
        style={{ left: collapsed ? 10 : 220 }}
      >
        {collapsed ? "»" : "«"}
      </button>

      {/* モバイル: ハンバーガー（上部バーの左端に置く） */}
      <button
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="fixed left-3 top-2.5 z-50 flex h-9 w-9 items-center justify-center text-white md:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto border-r border-food-200 bg-cream-50 px-3 py-5">
            <div className="mb-5 flex items-center justify-between px-3">
              <span className="flex items-center gap-2">
                <Mascot className="h-7 w-7" />
                <span className="text-base font-black text-hive-900">{BRAND.name}</span>
              </span>
              <button onClick={() => setOpen(false)} aria-label="メニューを閉じる" className="text-hive-500 hover:text-hive-900">
                ✕
              </button>
            </div>
            {nav}
            <button
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" });
                window.location.href = "/sign-in";
              }}
              className="mt-6 w-full rounded-full border border-food-200 py-2 text-xs font-bold text-hive-500 hover:bg-food-50"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </>
  );
}
