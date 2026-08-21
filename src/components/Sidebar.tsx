"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "ダッシュボード" },
  { href: "/order", label: "案件登録" },
  { href: "/projects", label: "案件一覧" },
  { href: "/agent", label: "AIエージェント" },
  { href: "/scripts", label: "保存済み台本" },
  { href: "/brand-profile", label: "ブランドプロファイル" },
  { href: "/video-analysis", label: "動画分析" },
  { href: "/issue", label: "発注書・請求書" },
  { href: "/chat", label: "チャット" },
  { href: "/points", label: "ポイント" },
];

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const items = role === "admin" ? [...NAV, { href: "/admin", label: "管理" }] : NAV;
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white min-h-screen px-4 py-6 hidden md:block">
      <div className="text-xl font-bold tracking-tight text-indigo-600 mb-8 px-2">CREATE WORKS</div>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
