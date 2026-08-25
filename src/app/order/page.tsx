"use client";

import Link from "next/link";
import BeeLogo from "@/components/BeeLogo";
import { useMe } from "@/components/AppShell";
import { POINTS_BY_CATEGORY } from "@/lib/data";

const VIDEO_PATHS = [
  {
    emoji: "🔍",
    who: "まだ企画が決まっていない",
    title: "バズり動画をAIで分析",
    desc: "参考動画のURLを入れると、構成・フック・自社への応用ポイントをAIが分解します。",
    href: "/video-analysis",
    cost: "無料",
  },
  {
    emoji: "✍️",
    who: "企画はある。台本がほしい",
    title: "AIと台本をつくる",
    desc: "AIエージェントと会話しながらショート動画の台本を作成。できた台本は保存できます。",
    href: "/agent",
    cost: `${POINTS_BY_CATEGORY["台本作成"]}🍯〜`,
  },
  {
    emoji: "🎬",
    who: "素材はある。編集してほしい",
    title: "動画編集を発注する",
    desc: "素材を渡して、プロのフリーランスに編集を依頼。字幕・カット・BGMまで指定できます。",
    href: "/order/create?category=動画編集",
    cost: `${POINTS_BY_CATEGORY["動画編集"]}🍯〜`,
  },
];

const OTHER_GROUPS: {
  heading: string;
  emoji: string;
  items: { label: string; category: string; days: string }[];
}[] = [
  {
    heading: "デザインをつくる",
    emoji: "🎨",
    items: [
      { label: "バナーを作る", category: "バナー作成", days: "3日〜" },
      { label: "チラシを作る", category: "チラシ作成", days: "5日〜" },
      { label: "サムネイルを作る", category: "サムネイル作成", days: "2日〜" },
      { label: "名刺を作る", category: "名刺作成", days: "3日〜" },
    ],
  },
  {
    heading: "Web・集客をつくる",
    emoji: "🌐",
    items: [
      { label: "LPを作る・直す", category: "LP作成・修正", days: "2週間〜" },
      { label: "LINEを構築する", category: "LINE構築", days: "2週間〜" },
      { label: "Instagram投稿を作る", category: "Instagram投稿", days: "3日〜" },
      { label: "SEO記事を書く", category: "SEO記事作成", days: "5日〜" },
    ],
  },
];

export default function OrderTopPage() {
  const { me } = useMe();

  return (
    <div className="max-w-5xl">
      {/* ハチのあいさつ */}
      <div className="mb-6 flex items-start gap-3">
        <BeeLogo className="h-12 w-12 shrink-0" />
        <div className="relative rounded-2xl border border-honey-200 bg-white px-4 py-3 shadow-sm">
          <span className="absolute -left-2 top-4 h-4 w-4 rotate-45 border-b border-l border-honey-200 bg-white" />
          <p className="text-sm font-medium text-hive-900">
            こんにちは、{me?.name ?? "ゲスト"}さん！今日は何をつくりますか？
          </p>
          <p className="mt-1 text-xs text-slate-500">
            いまの残高は <Link href="/points" className="font-semibold text-honey-600 hover:underline">{me?.points ?? 0}🍯</Link>。
            🍯の横の数字は発注に必要な目安ポイントです。迷ったら一番下の「ハチに相談」からどうぞ。
          </p>
        </div>
      </div>

      {/* メイン: ショート動画 */}
      <section className="rounded-3xl border-2 border-honey-300 bg-gradient-to-br from-honey-50 to-honey-100 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-hive-900">ショート動画をつくる</h1>
          <div className="flex gap-1.5">
            <span className="rounded-full bg-hive-900 px-3 py-1 text-xs font-semibold text-white">TikTok</span>
            <span className="rounded-full border border-hive-900/20 bg-white px-3 py-1 text-xs font-medium text-hive-900">Instagramリール</span>
            <span className="rounded-full border border-hive-900/20 bg-white px-3 py-1 text-xs font-medium text-hive-900">YouTubeショート</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-hive-900/70">
          いまの状態に合う入り口を選んでください。<b>分析 → 台本 → 発注</b> と、そのまま次のステップに進めます。
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {VIDEO_PATHS.map((p, i) => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col rounded-2xl border border-honey-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-honey-400 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{p.emoji}</span>
                <span className="rounded-full bg-honey-50 px-2.5 py-0.5 text-xs font-bold text-honey-700">{p.cost}</span>
              </div>
              <span className="mt-3 text-xs font-medium text-slate-400">
                STEP {i + 1}｜{p.who}
              </span>
              <span className="mt-1 font-bold text-hive-900 group-hover:text-honey-700">{p.title}</span>
              <span className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-500">{p.desc}</span>
              <span className="mt-3 text-right text-sm font-semibold text-honey-600">すすむ →</span>
            </Link>
          ))}
        </div>

        <Link
          href="/order/reference"
          className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-honey-400 bg-white/60 px-4 py-3 text-sm font-medium text-hive-900 transition-colors hover:bg-white"
        >
          <BeeLogo className="h-6 w-6 shrink-0" />
          「このアカウントみたいに作りたい」— 参考アカウントの一覧から選んで始めることもできます →
        </Link>
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
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-hive-900">
                <span>{g.emoji}</span>
                {g.heading}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {g.items.map((it) => (
                  <Link
                    key={it.category}
                    href={`/order/create?category=${encodeURIComponent(it.category)}`}
                    className="group rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-honey-400 hover:bg-honey-50"
                  >
                    <span className="block text-sm font-semibold text-slate-700 group-hover:text-hive-900">{it.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {POINTS_BY_CATEGORY[it.category]}🍯 ／ 納期目安 {it.days}
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
        <BeeLogo className="h-10 w-10 shrink-0" />
        <div className="flex-1">
          <span className="block font-bold text-hive-900">どれを選べばいいか分からない？</span>
          <span className="block text-xs text-slate-500">ハチに相談すれば、内容を聞いてぴったりの発注方法を案内します。</span>
        </div>
        <span className="text-sm font-semibold text-honey-600">相談する →</span>
      </Link>
    </div>
  );
}
