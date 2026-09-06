"use client";

/**
 * ホーム＝「ハッチのカウンター」。
 * お店の人が朝いちばんに開いて、今日やること・おすすめ・お品書き・伸びてる動画・ハニーの残りが1画面で分かる。
 * 管理者にも同じ画面を見せ、その下に管理者向けの全体表を足す。制作者（freelancer）は仕事中心の別レイアウト。
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Illust, { GROUP_ILLUST } from "@/components/Illust";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { BRAND } from "@/lib/brand";
import { Project } from "@/lib/data";
import { Mascot, PointInline, useMascot } from "@/components/MascotProvider";
import HoneyCells from "@/components/HoneyCells";
import AdminDashboard from "@/components/AdminDashboard";
import { seasonalPick } from "@/lib/seasonal";
import { thumbUrl, retryImage } from "@/lib/client-img";

type FStats = { month: string; submissions: number; accepted: number; revising: number };
type Trending = { id: string; caption: string; views: number; growth: number; accountName: string; industry: string };

const fmtCount = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString());

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 5) return `${name}さん、遅くまでお疲れさまです。`;
  if (h < 11) return `おはようございます、${name}さん。仕込みの前に、ちょっとだけ。`;
  if (h < 15) return `こんにちは、${name}さん。ランチお疲れさまです。`;
  if (h < 18) return `${name}さん、アイドルタイムですね。今のうちに一つ頼んでおきませんか。`;
  return `こんばんは、${name}さん。営業中の合間に見てもらえてうれしいです。`;
}

function daysUntil(deadline: string) {
  const d = new Date(deadline + "T00:00:00").getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today.getTime()) / 86400000);
}

export default function Home() {
  const { mascot } = useMascot();
  const { me } = useMe();
  const [projects, setProjects] = useState<Project[]>([]);
  const [fstats, setFstats] = useState<FStats | null>(null);
  const [trend, setTrend] = useState<Trending[]>([]);
  const isAdmin = me?.role === "admin";
  const isFreelancer = me?.role === "freelancer";

  useEffect(() => {
    api<Project[]>("/api/projects").then(setProjects).catch(() => {});
    api<Trending[]>("/api/ref-videos/trending?sort=growth&limit=4").then(setTrend).catch(() => {});
  }, []);
  useEffect(() => {
    if (isFreelancer) api<FStats>("/api/freelancer/stats").then(setFstats).catch(() => {});
  }, [isFreelancer]);

  const todo = useMemo(() => {
    const review = projects.filter((p) => p.status === "フィードバック");
    const making = projects.filter((p) => p.status === "制作待ち" || p.status === "募集中");
    const soon = projects.filter((p) => p.status !== "完了" && p.status !== "未公開" && daysUntil(p.deadline) <= 3);
    const done = projects.filter((p) => p.status === "完了");
    return { review, making, soon, done };
  }, [projects]);

  const name = me?.name ?? "ゲスト";
  const pick = seasonalPick(new Date().getMonth() + 1);
  const recent = useMemo(() => [...projects].filter((p) => p.status !== "完了").slice(0, 3), [projects]);

  // ── 制作者向け ──
  if (isFreelancer) {
    return (
      <div className="max-w-5xl space-y-8">
        <div className="flex items-end gap-4">
          <Mascot className="h-16 w-16 shrink-0 animate-bee-float" />
          <div className="relative flex-1 rounded-2xl border border-food-200 bg-white px-5 py-4 shadow-sm">
            <span className="absolute -left-2 bottom-5 h-4 w-4 rotate-45 border-b border-l border-food-200 bg-white" aria-hidden="true" />
            <p className="font-display text-lg text-hive-900">{greeting(name)}</p>
            <p className="mt-1 text-xs text-hive-500">修正のお願いが {fstats?.revising ?? 0} 件、今月の提出 {fstats?.submissions ?? 0} 本・検収OK {fstats?.accepted ?? 0} 本。</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "作業中", value: `${todo.making.length}件`, href: "/projects" },
            { label: "修正依頼あり", value: `${fstats?.revising ?? 0}件`, href: "/projects" },
            { label: "受けられる仕事", value: "さがす →", href: "/jobs" },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="rounded-2xl border border-food-200 bg-white p-5 transition-colors hover:bg-food-50">
              <div className="text-sm text-hive-500">{s.label}</div>
              <div className="mt-1 text-2xl font-black text-hive-900">{s.value}</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ── お店向け（管理者も同じ） ──
  return (
    <div className="max-w-5xl space-y-9">
      {/* あいさつ＋今日やること */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex items-end gap-4">
          <Mascot className="h-20 w-20 shrink-0 animate-bee-float" />
          <div className="relative flex-1 rounded-2xl border border-food-200 bg-white px-5 py-4 shadow-sm">
            <span className="absolute -left-2 bottom-6 h-4 w-4 rotate-45 border-b border-l border-food-200 bg-white" aria-hidden="true" />
            <p className="font-display text-lg leading-snug text-hive-900">{greeting(name)}</p>
            <p className="mt-1.5 text-xs text-hive-500">
              {todo.review.length > 0
                ? `できあがったものが ${todo.review.length} 件届いています。見て「OK」か「ここ直して」を返してください。`
                : todo.making.length > 0
                  ? `いま ${todo.making.length} 件作っています。届いたらここでお知らせします。`
                  : "頼んでいるものはありません。お品書きから、今日の一つを選びませんか。"}
            </p>
          </div>
        </div>
        <Link href={todo.review.length > 0 ? "/projects" : "/points"} className={`flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-sm transition-colors ${todo.review.length > 0 ? "border-food-500 bg-food-500 text-white hover:bg-food-600" : "border-food-200 bg-white hover:bg-food-50"}`}>
          {todo.review.length > 0 ? (
            <>
              <Illust name="sparkle" className="h-14 w-14 shrink-0" />
              <span>
                <span className="block text-[11px] font-black tracking-widest opacity-80">今日やること</span>
                <span className="block font-display text-xl">確認待ちが {todo.review.length} 件</span>
                <span className="block text-xs opacity-85">押すと一覧に進みます</span>
              </span>
            </>
          ) : (
            <>
              <Illust name="jar" className="h-14 w-14 shrink-0" />
              <span>
                <span className="block text-[11px] font-black tracking-widest text-hive-500">ハニーの残り</span>
                <span className="block text-2xl font-black text-hive-900">{me?.points ?? 0}<PointInline /></span>
                <span className="block text-xs text-hive-500">1{mascot.pointName}＝1,200円（税別）</span>
              </span>
            </>
          )}
        </Link>
      </section>

      {/* 今月のおすすめ */}
      <Link href={`/order/menu?group=${encodeURIComponent(pick.group)}`} className="group flex items-center gap-4 rounded-2xl border border-honey-300 bg-honey-50 px-5 py-4 shadow-sm transition-colors hover:bg-honey-100">
        <Illust name="sparkle" className="h-12 w-12 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="text-[11px] font-black tracking-widest text-honey-700">今月のおすすめ</span>
          <span className="mt-0.5 block font-display text-lg leading-snug text-hive-900">{pick.title}</span>
          <span className="mt-1 hidden text-xs text-hive-500 sm:block">{pick.body}</span>
        </span>
        <span className="hidden shrink-0 rounded-full bg-food-500 px-4 py-2 text-sm font-bold text-white group-hover:bg-food-600 sm:block">{pick.cta} →</span>
      </Link>

      {/* お品書き（困りごと） */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-xl text-hive-900">お品書き</h2>
            <p className="page-sub">困りごとを押すと、頼めるメニューと値段が出ます</p>
          </div>
          <Link href="/order" className="shrink-0 whitespace-nowrap text-sm font-bold text-food-600 hover:underline">ぜんぶ見る →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BRAND.groups.map((g) => (
            <Link
              key={g.name}
              href={`/order/menu?group=${encodeURIComponent(g.name)}`}
              className="group flex flex-col items-center rounded-2xl border border-food-200 bg-white px-3 py-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-food-400 hover:shadow-md"
            >
              <Illust name={GROUP_ILLUST[g.name] ?? "empty"} className="h-16 w-16 transition-transform group-hover:scale-110" />
              <span className="mt-2 text-[11px] font-black tracking-widest text-food-600">{g.name}</span>
              <span className="mt-0.5 text-xs font-bold leading-snug text-hive-900">{g.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 頼んだもの＋伸びてる動画 */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl text-hive-900">頼んだもの</h2>
            <Link href="/projects" className="text-sm font-bold text-food-600 hover:underline">すべて →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex items-center gap-4 rounded-2xl border border-dashed border-food-300 bg-white px-5 py-5">
              <Illust name="empty" className="h-14 w-14 shrink-0" />
              <div>
                <p className="font-display text-base text-hive-900">まだ何も頼んでいません</p>
                <p className="text-xs text-hive-500">できあがったもの {todo.done.length} 件</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-4 rounded-2xl border border-food-200 bg-white px-4 py-3 transition-colors hover:bg-food-50">
                  <HoneyCells status={p.status} size={20} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-hive-900">{p.title}</span>
                    <span className="block text-[11px] text-hive-500">{p.category}・{p.deadline.slice(5).replace("-", "/")}まで</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${p.status === "フィードバック" ? "bg-food-500 text-white" : "bg-cream-100 text-hive-700"}`}>
                    {p.status === "フィードバック" ? "確認してね" : p.status === "制作待ち" ? "制作中" : p.status === "募集中" ? "担当を探し中" : p.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl text-hive-900">いま伸びてる飲食店の動画</h2>
            <Link href="/order/reference" className="text-sm font-bold text-food-600 hover:underline">もっと →</Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {trend.slice(0, 4).map((v) => (
              <Link key={v.id} href="/order/reference" title={v.caption} className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-hive-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl(v.id)} alt="" loading="lazy" decoding="async" onError={retryImage} className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-hive-900/90 to-transparent p-2">
                  <span className="block truncate text-[10px] font-bold text-white">{v.accountName}</span>
                  <span className="block text-[10px] text-honey-300">▶ {fmtCount(v.views)}{v.growth > 0 && `　↑${fmtCount(v.growth)}/週`}</span>
                </span>
              </Link>
            ))}
            {trend.length === 0 && (
              <div className="col-span-4 flex items-center gap-3 rounded-2xl border border-dashed border-food-300 bg-white px-4 py-5 text-xs text-hive-500">
                <Illust name="phone" className="h-12 w-12" />動画を集めています。少し待ってから開いてみてください。
              </div>
            )}
          </div>
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-3xl border border-food-200 bg-cream-50 p-5">
          <h2 className="text-lg text-hive-900">お店全体のようす（管理者）</h2>
          <p className="page-sub mb-4">お客様と制作者の状況。お店の人には見えません。</p>
          <AdminDashboard />
        </section>
      )}
    </div>
  );
}
