"use client";

/**
 * 上部ナビ。サイドバーの12項目をやめて、「つくる／すすめる／みる」の3モードにまとめる。
 * 選んだモードの中の画面は、黒帯の下の細い帯に並ぶ。
 * 選択中のモードは六角形（巣箱のモチーフ）で示す。
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { Mascot, useMascot } from "./MascotProvider";
import NotificationBell from "./NotificationBell";
import HoneyJar from "./HoneyJar";
import { api } from "@/lib/client";

type Mode = { key: string; label: string; href: string; match: (p: string) => boolean; sub: { href: string; label: string }[] };

function modesFor(role: string | undefined, pointName: string): Mode[] {
  if (role === "freelancer") {
    return [
      { key: "find", label: "さがす", href: "/jobs", match: (p) => p.startsWith("/jobs"), sub: [{ href: "/jobs", label: "お仕事をさがす" }] },
      {
        key: "work", label: "すすめる", href: "/projects",
        match: (p) => p.startsWith("/projects") || p.startsWith("/chat") || p.startsWith("/video-analysis"),
        sub: [{ href: "/projects", label: "担当案件" }, { href: "/chat", label: "チャット" }, { href: "/video-analysis", label: "動画分析" }],
      },
      { key: "see", label: "みる", href: "/", match: (p) => p === "/" || p.startsWith("/guide"), sub: [{ href: "/", label: "ダッシュボード" }, { href: "/guide", label: "デモの歩き方" }] },
    ];
  }
  const see: { href: string; label: string }[] = [
    { href: "/", label: "ダッシュボード" },
    { href: "/issue", label: "発注書・請求書" },
    { href: "/points", label: pointName },
    { href: "/guide", label: "デモの歩き方" },
  ];
  if (role === "admin") see.push({ href: "/admin", label: "管理" });
  return [
    {
      key: "make", label: "つくる", href: "/order",
      match: (p) => p.startsWith("/order") || p.startsWith("/agent") || p.startsWith("/scripts") || p.startsWith("/brand-profile") || p.startsWith("/video-analysis"),
      sub: [
        { href: "/order", label: "発注トップ" },
        { href: "/order/reference", label: "お手本から" },
        { href: "/agent", label: "ハチに相談" },
        { href: "/scripts", label: "保存済み台本" },
        { href: "/brand-profile", label: "ブランドプロファイル" },
        { href: "/video-analysis", label: "動画分析" },
      ],
    },
    {
      key: "work", label: "すすめる", href: "/projects",
      match: (p) => p.startsWith("/projects") || p.startsWith("/chat"),
      sub: [{ href: "/projects", label: "案件一覧" }, { href: "/chat", label: "チャット" }],
    },
    {
      key: "see", label: "みる", href: "/",
      match: (p) => p === "/" || p.startsWith("/issue") || p.startsWith("/points") || p.startsWith("/guide") || p.startsWith("/admin"),
      sub: see,
    },
  ];
}

export default function TopNav({ role, name, points }: { role?: string; name: string; points: number }) {
  const pathname = usePathname();
  const { mascot } = useMascot();
  const modes = modesFor(role, mascot.pointName);
  const active = modes.find((m) => m.match(pathname)) ?? modes[0];
  const showPoints = role !== "freelancer";
  const videos = Math.floor(points / 7);

  return (
    <div className="sticky top-0 z-40">
      {/* 黒帯 */}
      <div className="bg-hive-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-6 sm:px-6">
          <Link href="/order" className="flex shrink-0 items-center gap-2">
            <Mascot className="h-8 w-8" />
            <span className="hidden text-base font-black tracking-wide sm:inline">{BRAND.name}</span>
          </Link>
          <nav className="flex items-center gap-1 sm:ml-4">
            {modes.map((m) => {
              const on = m.key === active.key;
              return (
                <Link
                  key={m.key}
                  href={m.href}
                  className={`flex h-10 w-20 items-center justify-center text-sm font-black transition-colors sm:w-24 ${
                    on ? "hex-tab bg-honey-400 text-hive-900" : "text-white/85 hover:text-honey-300"
                  }`}
                >
                  {m.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <span className="text-white [&_button]:text-white/80 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
              <NotificationBell />
            </span>
            {showPoints && (
              <Link href="/points" title={`${mascot.pointName}の残高（クリックで詳細）`} className="flex items-center gap-2">
                <HoneyJar points={points} />
                <span className="flex flex-col leading-none">
                  <span className="text-lg font-black text-honey-400">
                    {points}
                    <span className="ml-0.5 text-[11px] font-bold">{mascot.pointName}</span>
                  </span>
                  <span className="mt-0.5 hidden text-[10px] text-hive-200 sm:block">
                    {videos > 0 ? `あと約${videos}本つくれます` : "追加購入できます"}
                  </span>
                </span>
              </Link>
            )}
            <span className="hidden text-xs text-hive-200 sm:inline">{name}</span>
            <button
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" });
                window.location.href = "/sign-in";
              }}
              className="text-xs text-hive-200 hover:text-white"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
      {/* 選んだモードの中の画面 */}
      <div className="border-b-2 border-hive-900 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
          {active.sub.map((s) => {
            const on = s.href === "/" ? pathname === "/" : pathname === s.href || (s.href !== "/order" && pathname.startsWith(s.href + "/")) || (s.href === "/order" && pathname === "/order");
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`shrink-0 border-b-[3px] px-3 py-2 text-sm font-bold transition-colors ${
                  on ? "border-honey-400 text-hive-900" : "border-transparent text-hive-500 hover:text-hive-900"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
