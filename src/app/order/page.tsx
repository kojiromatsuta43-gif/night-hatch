"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mascot, PointInline, useMascot } from "@/components/MascotProvider";
import FormatIcon from "@/components/FormatIcon";
import PlatformIcon from "@/components/PlatformIcon";
import { useMe } from "@/components/AppShell";
import { api } from "@/lib/client";
import { DEFAULT_SCRIPT_CATEGORY, DEFAULT_VIDEO_CATEGORY, POINTS_BY_CATEGORY } from "@/lib/data";
import { BRAND, catalogGroups } from "@/lib/brand";
import { retryImage, iconUrl } from "@/lib/client-img";

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

// 発注トップに並べる「その他の制作物」。看板ごとのメニュー表から、上の大きな入口（ショート動画・台本）を除いたもの
const HERO_CATEGORIES = [DEFAULT_VIDEO_CATEGORY, DEFAULT_SCRIPT_CATEGORY];
const OTHER_GROUPS = catalogGroups()
  .map((g) => ({
    heading: g.heading,
    items: g.items
      .filter((c) => !HERO_CATEGORIES.includes(c.name))
      .map((c) => ({ label: c.name, category: c.name, size: c.size, days: c.days, monthly: c.monthly, quantity: c.quantity })),
  }))
  .filter((g) => g.items.length > 0);

function Avatar({ a }: { a: RefAccount }) {
  if (a.icon_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl(a.id)} alt={a.name} title={a.name} onError={retryImage} className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm" />;
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

/**
 * 店舗向けの発注トップ（FOOD HATCH）。
 * 「困りごと」4つから選ぶだけ。メニューの一覧は次の画面で、そのグループの分だけ見せる。
 */
function SimpleOrderTop() {
  const { me } = useMe();
  const { mascot } = useMascot();
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start gap-3">
        <Mascot className="h-12 w-12 shrink-0" />
        <div className="relative rounded-2xl border border-honey-200 bg-white px-4 py-3 shadow-sm">
          <span className="absolute -left-2 top-4 h-4 w-4 rotate-45 border-b border-l border-honey-200 bg-white" />
          <p className="text-sm font-medium text-hive-900">こんにちは、{me?.name ?? "ゲスト"}さん！今日はお店の何を良くしますか？</p>
          <p className="mt-1 text-xs text-slate-500">
            いまの残高は <Link href="/points" className="font-semibold text-honey-600 hover:underline">{me?.points ?? 0}<PointInline /></Link>。
            1<PointInline />＝1,000円（税別）です。
          </p>
        </div>
      </div>

      <h1 className="mb-3 text-xl font-bold text-hive-900">困りごとから選ぶ</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {BRAND.groups.map((g) => (
          <Link
            key={g.name}
            href={`/order/menu?group=${encodeURIComponent(g.name)}`}
            className="group rounded-3xl border-2 border-honey-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-honey-400 hover:shadow-md"
          >
            <div className="text-lg font-bold text-hive-900">{g.sub}</div>
            <div className="mt-1 text-xs font-semibold text-honey-700">{g.name}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {g.examples.map((e) => (
                <span key={e} className="rounded-full bg-honey-50 px-2.5 py-1 text-xs text-hive-900">{e}</span>
              ))}
            </div>
            <div className="mt-3 text-right text-sm font-bold text-honey-700 group-hover:underline">メニューを見る →</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/order/reference" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-colors hover:border-honey-400">
          <div className="text-sm font-bold text-hive-900">伸びている飲食店の動画をまねる</div>
          <div className="mt-1 text-xs text-slate-500">お手本の動画を選ぶと、台本と動画編集の発注にそのまま進めます</div>
        </Link>
        <Link href="/agent" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-colors hover:border-honey-400">
          <div className="text-sm font-bold text-hive-900">{mascot.consult}</div>
          <div className="mt-1 text-xs text-slate-500">「新メニューを考えたい」「口コミに返したい」など、話しかけるだけで整理します</div>
        </Link>
      </div>
    </div>
  );
}

export default function OrderTopPage() {
  if (BRAND.orderStyle === "simple") return <SimpleOrderTop />;
  return <FullOrderTop />;
}

function FullOrderTop() {
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
          <h1 className="text-2xl font-bold text-hive-900">{BRAND.hero.title}</h1>
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
          <p className="mt-1.5 text-sm text-slate-500">{BRAND.hero.sub}。お手本のアカウントを選ぶ → 真似したい動画を選ぶ → そのまま台本作成・動画編集の発注に進めます。</p>

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
      <section className="mt-10">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-xl font-bold text-hive-900">その他の制作物</h2>
          <span className="text-xs text-slate-400">押すと発注フォームに進みます。🍯は目安ポイント（1🍯＝1,000円・税別）</span>
        </div>
        <div className="space-y-6">
          {OTHER_GROUPS.map((g) => {
            const info = BRAND.groups.find((x) => x.name === g.heading);
            const steps = g.heading === "営業まわり"; // 台本→リスト→架電の順番がある
            return (
              <div key={g.heading} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <h3 className="text-base font-bold text-hive-900">{g.heading}</h3>
                  {info?.sub && <span className="text-sm text-slate-500">{info.sub}</span>}
                  {info?.examples[0] && (
                    <span className="ml-auto rounded-full bg-honey-100 px-3 py-1 text-xs font-bold text-hive-900">{info.examples[0]}</span>
                  )}
                </div>
                <div className={`grid gap-3 ${steps ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                  {g.items.map((it, i) => (
                    <Link
                      key={it.category}
                      href={`/order/create?category=${encodeURIComponent(it.category)}`}
                      className="group relative flex flex-col rounded-2xl border-2 border-slate-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-honey-400 hover:shadow-md"
                    >
                      {steps && (
                        <span className="absolute -top-3 left-4 rounded-full bg-hive-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                          STEP {i + 1}
                        </span>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 scale-125 origin-top-left">
                          <FormatIcon category={it.category} />
                        </span>
                        <span className="min-w-0 pl-2">
                          <span className="block text-base font-bold leading-snug text-hive-900 group-hover:text-honey-700">{it.label}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-500">{it.size}</span>
                        </span>
                      </div>
                      <div className="mt-auto flex items-end justify-between pt-3">
                        <span className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500">目安 {it.days}</span>
                        <span className="text-xl font-bold text-honey-700">
                          {POINTS_BY_CATEGORY[it.category]}
                          {it.quantity ? "〜" : ""}
                          <PointInline />
                          {it.monthly && <span className="text-xs font-medium text-slate-500">／月</span>}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
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
