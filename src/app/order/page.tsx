"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mascot, PointInline, useMascot } from "@/components/MascotProvider";
import FormatIcon from "@/components/FormatIcon";
import PlatformIcon from "@/components/PlatformIcon";
import { useMe } from "@/components/AppShell";
import { api } from "@/lib/client";
import { DEFAULT_SCRIPT_CATEGORY, DEFAULT_VIDEO_CATEGORY, POINTS_BY_CATEGORY } from "@/lib/data";

type RefAccount = { id: string; name: string; handle: string; icon_url: string; followers: number };

const OTHER_STARTS = [
  {
    who: "まだ企画が決まっていない",
    title: "バズり動画をAIで分析",
    desc: "URLを入れると構成・フックを分解",
    href: "/video-analysis",
    cost: () => <>無料</>,
  },
  {
    who: "企画はある。台本がほしい",
    title: "AIと台本をつくる",
    desc: "会話しながらショート動画の台本を作成",
    href: "/agent",
    cost: () => (
      <>
        {POINTS_BY_CATEGORY[DEFAULT_SCRIPT_CATEGORY]}
        <PointInline />〜
      </>
    ),
  },
  {
    who: "素材はある。編集してほしい",
    title: "動画編集を発注する",
    desc: "字幕・カット・BGMまで指定して依頼",
    href: `/order/create?category=${encodeURIComponent(DEFAULT_VIDEO_CATEGORY)}`,
    cost: () => (
      <>
        {POINTS_BY_CATEGORY[DEFAULT_VIDEO_CATEGORY]}
        <PointInline />〜
      </>
    ),
  },
];

const OTHER_GROUPS: {
  heading: string;
  items: { label: string; category: string; size: string; days: string }[];
}[] = [
  {
    heading: "動画まわり",
    items: [
      { label: "動画編集（3分）", category: "動画編集（3分）", size: "会社紹介・商品説明", days: "5日〜" },
      { label: "台本を作る（長尺）", category: "台本作成（長尺）", size: "3分以上の構成台本", days: "3日〜" },
      { label: "サムネイルを作る", category: "サムネイル作成", size: "16:9", days: "2日〜" },
    ],
  },
  {
    heading: "SNS・Webまわり",
    items: [
      { label: "カルーセル投稿を作る", category: "カルーセル投稿", size: "Instagram複数枚", days: "4日〜" },
      { label: "投稿文＋画像を作る", category: "投稿文＋画像", size: "SNS投稿1本ぶん", days: "3日〜" },
      { label: "LPのファーストビュー", category: "LPファーストビュー", size: "訴求・デザイン込み", days: "1週間〜" },
      { label: "軽微な修正を頼む", category: "軽微な修正", size: "テロップ差し替えなど", days: "1日〜" },
    ],
  },
];

function Avatar({ a }: { a: RefAccount }) {
  if (a.icon_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={a.icon_url} alt={a.name} title={a.name} className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm" />;
  }
  return (
    <span
      title={a.name}
      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-sm"
      style={{ background: `linear-gradient(135deg, hsl(${a.followers % 360}, 60%, 55%), hsl(${(a.followers % 360) + 40}, 60%, 40%))` }}
    >
      {a.name[0]}
    </span>
  );
}

export default function OrderTopPage() {
  const { me } = useMe();
  const { mascot } = useMascot();
  const [accounts, setAccounts] = useState<RefAccount[]>([]);

  useEffect(() => {
    api<RefAccount[]>("/api/ref-accounts").then(setAccounts).catch(() => {});
  }, []);

  const strip = accounts.slice(0, 8);
  const rest = Math.max(0, accounts.length - strip.length);

  return (
    <div className="max-w-5xl">
      {/* ハチのあいさつ */}
      <div className="mb-6 flex items-start gap-3">
        <Mascot className="h-12 w-12 shrink-0" />
        <div className="relative rounded-2xl border border-honey-200 bg-white px-4 py-3 shadow-sm">
          <span className="absolute -left-2 top-4 h-4 w-4 rotate-45 border-b border-l border-honey-200 bg-white" />
          <p className="text-sm font-medium text-hive-900">
            こんにちは、{me?.name ?? "ゲスト"}さん！今日は何をつくりますか？
          </p>
          <p className="mt-1 text-xs text-slate-500">
            いまの残高は <Link href="/points" className="font-semibold text-honey-600 hover:underline">{me?.points ?? 0}<PointInline /></Link>。
            <PointInline />の数字は発注に必要な目安ポイントです。迷ったら一番下の「{mascot.consult}」からどうぞ。
          </p>
        </div>
      </div>

      {/* メイン: ショート動画 */}
      <section className="rounded-3xl border-2 border-honey-300 bg-gradient-to-br from-honey-50 to-honey-100 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-hive-900">ショート動画をつくる</h1>
          <div className="flex gap-1.5">
            <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-hive-900 shadow-sm">
              <PlatformIcon platform="tiktok" /> TikTok
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-hive-900">
              <PlatformIcon platform="instagram" /> リール
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-hive-900">
              <PlatformIcon platform="youtube" /> ショート
            </span>
          </div>
        </div>

        {/* 一番使う導線 */}
        <Link
          href="/order/reference"
          className="group mt-4 block rounded-2xl border-2 border-honey-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-honey-500 hover:shadow-lg"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-honey-400 px-2.5 py-0.5 text-xs font-bold text-hive-900">いちばん人気</span>
            <span className="text-lg font-bold text-hive-900 sm:text-xl">「このアカウントみたいに作りたい」から始める</span>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            お手本のアカウントを選ぶ → 真似したい動画を選ぶ → そのまま台本作成・動画編集の発注に進めます。
          </p>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {strip.length > 0
                ? strip.map((a) => <Avatar key={a.id} a={a} />)
                : Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="h-11 w-11 animate-pulse rounded-full border-2 border-white bg-honey-100" />
                  ))}
              {rest > 0 && (
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-hive-900 text-xs font-bold text-white shadow-sm">
                  +{rest}
                </span>
              )}
            </div>
            <span className="ml-auto shrink-0 rounded-xl bg-honey-400 px-5 py-2.5 text-sm font-bold text-hive-900 transition-colors group-hover:bg-honey-300">
              お手本を探す →
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {accounts.length > 0 ? `${accounts.length}アカウント・約1,400本の参考動画から選べます` : "参考アカウントを読み込んでいます…"}
          </p>
        </Link>

        {/* 他の始め方 */}
        <p className="mt-5 mb-2 text-xs font-semibold text-hive-900/60">ほかの始め方</p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {OTHER_STARTS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group rounded-xl border border-honey-200 bg-white/80 px-4 py-3 transition-colors hover:border-honey-400 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-hive-900 group-hover:text-honey-700">{p.title}</span>
                <span className="shrink-0 rounded-full bg-honey-50 px-2 py-0.5 text-[11px] font-bold text-honey-700">{p.cost()}</span>
              </div>
              <span className="mt-0.5 block text-[11px] text-slate-400">{p.who}</span>
              <span className="mt-1 block text-xs text-slate-500">{p.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* その他の制作物 */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-lg font-bold text-hive-900">その他の制作物</h2>
          <span className="text-xs text-slate-400">押すと発注フォームに進みます</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {OTHER_GROUPS.map((g) => (
            <div key={g.heading} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-bold text-hive-900">{g.heading}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.items.map((it) => (
                  <Link
                    key={it.category}
                    href={`/order/create?category=${encodeURIComponent(it.category)}`}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-honey-400 hover:bg-honey-50"
                  >
                    <FormatIcon category={it.category} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-700 group-hover:text-hive-900">{it.label}</span>
                      <span className="block text-[11px] text-slate-400">{it.size}</span>
                      <span className="block text-[11px] font-medium text-honey-700">
                        {POINTS_BY_CATEGORY[it.category]}<PointInline /> ／ {it.days}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 迷子の受け皿 */}
      <Link
        href="/agent"
        className="mt-8 flex items-center gap-4 rounded-2xl border border-honey-200 bg-honey-50 px-5 py-4 transition-colors hover:bg-honey-100"
      >
        <Mascot className="h-10 w-10 shrink-0" />
        <div className="flex-1">
          <span className="block font-bold text-hive-900">どれを選べばいいか分からない？</span>
          <span className="block text-xs text-slate-500">{mascot.consult}すれば、内容を聞いてぴったりの発注方法を案内します。</span>
        </div>
        <span className="text-sm font-semibold text-honey-600">相談する →</span>
      </Link>
    </div>
  );
}
