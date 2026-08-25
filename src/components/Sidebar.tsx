"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BeeLogo from "./BeeLogo";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/guide", label: "デモの歩き方" },
  { href: "/", label: "ダッシュボード" },
  { href: "/order", label: "案件登録" },
  { href: "/projects", label: "案件一覧" },
  { href: "/agent", label: "AIエージェント" },
  { href: "/scripts", label: "保存済み台本" },
  { href: "/brand-profile", label: "ブランドプロファイル" },
  { href: "/video-analysis", label: "動画分析" },
  { href: "/issue", label: "発注書・請求書" },
  { href: "/chat", label: "チャット" },
  { href: "/points", label: "はちみつP" },
];

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = role === "admin" ? [...NAV, { href: "/admin", label: "管理" }] : NAV;

  // 画面遷移したらメニューを閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navLinks = (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-honey-400 text-hive-900" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* デスクトップ: 常時表示のサイドバー */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:block">
        <div className="mb-8 flex items-center gap-2 px-2">
          <BeeLogo className="h-8 w-8 shrink-0" />
          <span className="text-lg font-bold tracking-tight text-hive-900">BRIDGE HATCH</span>
        </div>
        {navLinks}
      </aside>

      {/* モバイル: ヘッダー + スライドインメニュー */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="メニューを開く"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <span className="flex items-center gap-2">
          <BeeLogo className="h-7 w-7" />
          <span className="text-base font-bold tracking-tight text-hive-900">BRIDGE HATCH</span>
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-white px-4 py-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BeeLogo className="h-7 w-7" />
                <span className="text-base font-bold tracking-tight text-hive-900">BRIDGE HATCH</span>
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="メニューを閉じる"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            {navLinks}
          </div>
        </div>
      )}
    </>
  );
}
