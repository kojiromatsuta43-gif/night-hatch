"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "ダッシュボード" },
  { href: "/order", label: "案件登録" },
  { href: "/projects", label: "案件一覧" },
];

const SOON = ["AIエージェント", "保存済み台本", "ブランドプロファイル", "発注書・請求書", "チャット"];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white min-h-screen px-4 py-6 hidden md:block">
      <div className="text-xl font-bold tracking-tight text-indigo-600 mb-8 px-2">CREATE WORKS</div>
      <nav className="space-y-1">
        {NAV.map((item) => {
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
      <div className="mt-8 px-3 text-xs font-semibold text-slate-400 uppercase">Coming soon</div>
      <div className="mt-2 space-y-1">
        {SOON.map((label) => (
          <div key={label} className="px-3 py-1.5 text-sm text-slate-400 select-none">
            {label}
          </div>
        ))}
      </div>
    </aside>
  );
}
