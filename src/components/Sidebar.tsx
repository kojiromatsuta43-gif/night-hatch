"use client";

/**
 * 左サイドバー。業務ツールとしての基本の並び（12項目）は動かさず、
 * 見た目だけ巣箱の世界観（太い線・黄×黒・選択中は六角形）に合わせる。
 * 項目は「つくる／すすめる／みる」の3つの見出しでまとめる。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { Mascot, useMascot } from "./MascotProvider";

type Item = { href: string; label: string };
type Group = { heading: string; items: Item[] };

function groupsFor(role: string | undefined, pointName: string): Group[] {
  if (role === "freelancer") {
    return [
      { heading: "さがす", items: [{ href: "/jobs", label: "お仕事をさがす" }] },
      { heading: "すすめる", items: [{ href: "/projects", label: "担当案件" }, { href: "/sales", label: "営業リスト" }, { href: "/chat", label: "チャット" }] },
      { heading: "みる", items: [{ href: "/", label: "ダッシュボード" }] },
    ];
  }
  const see: Item[] = [
    { href: "/", label: "ダッシュボード" },
    { href: "/reports", label: "月次レポート" },
    { href: "/issue", label: "発注書・請求書" },
    { href: "/points", label: pointName },
    { href: "/guide", label: "デモの歩き方" },
  ];
  if (role === "admin") see.push({ href: "/admin", label: "管理" });
  return [
    {
      heading: "つくる",
      items: [
        { href: "/order", label: "つくる・発注" },
        { href: "/order/reference", label: "お手本から発注" },
        { href: "/agent", label: "AIエージェント" },
        { href: "/scripts", label: "保存済み台本" },
        { href: "/brand-profile", label: "ブランドプロファイル" },
        { href: "/video-analysis", label: "動画分析" },
      ],
    },
    { heading: "すすめる", items: [{ href: "/projects", label: "案件一覧" }, { href: "/sales", label: "営業リスト" }, { href: "/chat", label: "チャット" }] },
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
  const groups = groupsFor(role, mascot.pointName);

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
          <div className="mb-1.5 px-3 text-[11px] font-black tracking-widest text-hive-500">{g.heading}</div>
          <div className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 text-sm font-bold transition-colors ${
                    active ? "hex-tab bg-honey-400 text-hive-900" : "text-hive-700 hover:bg-honey-50 hover:text-hive-900"
                  }`}
                >
                  {item.label}
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
        className={`hidden shrink-0 overflow-hidden border-hive-900 bg-white transition-all md:block ${
          collapsed ? "w-0 border-r-0" : "w-60 border-r-[3px] px-3 py-5"
        }`}
      >
        {!collapsed && nav}
      </aside>
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? "メニューを開く" : "メニューをたたむ"}
        title={collapsed ? "メニューを開く" : "メニューをたたむ"}
        className="fixed top-14 z-40 hidden h-9 w-9 items-center justify-center border-2 border-hive-900 bg-honey-400 text-base font-black text-hive-900 shadow-sm transition-all hover:bg-honey-300 md:flex"
        style={{ left: collapsed ? 10 : 204 }}
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
          <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto border-r-[3px] border-hive-900 bg-white px-3 py-5">
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
          </div>
        </div>
      )}
    </>
  );
}
