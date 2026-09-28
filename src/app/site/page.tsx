import Link from "next/link";
import type { Metadata } from "next";
import BeeLogo from "@/components/BeeLogo";
import BeeGirl from "@/components/BeeGirl";
import StoreCard from "@/components/site/StoreCard";
import VideoGrid from "@/components/site/VideoGrid";
import EmptyStores from "@/components/site/EmptyStores";
import { demoVisible, pageMeta, siteContext } from "@/lib/server/site";
import { publicAreas, publicListings, weeklyVideos } from "@/lib/server/listings";
import { GENRES, SITE_NAME, SITE_SUB, genreStyle } from "@/lib/listing";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await siteContext();
  return pageMeta(ctx, {
    path: "/",
    description:
      "バー・ガールズバー・スナック・キャバクラ・ラウンジ・クラブ・ホストクラブ。夜のお店の公式TikTok動画と、明朗な料金・求人情報。予約も体入の相談も、お店の公式LINEへ直接。",
  });
}

/** 公開サイトのトップ。2つの入口（飲みに行く／働く）、エリア×業態の検索、今週の動画、新着のお店 */
export default async function SiteTop() {
  const { base } = await siteContext();
  const demo = await demoVisible();
  const stores = publicListings({ demo });
  const areas = publicAreas(demo);
  const videos = weeklyVideos(12, demo);
  const hiring = stores.filter((s) => s.recruit_hiring).length;

  return (
    <>
      {/* ── ヒーロー ── */}
      <section className="site-hero relative overflow-hidden border-b border-gold-200/50">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16">
          <p className="kicker">Official Night Guide</p>
          <h1 className="mt-3 leading-none">
            <span className="font-latin block text-[54px] !tracking-[0.06em] text-gold-700 sm:text-[92px]">{SITE_NAME}</span>
            <span className="mt-2 block font-display text-lg tracking-[0.4em] text-hive-800 sm:text-2xl">{SITE_SUB}</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-hive-700 sm:text-base">
            夜のお店の“いま”を、お店の公式動画で。
            <br className="hidden sm:block" />
            今夜の一軒さがしも、はじめての一歩も。やりとりは、お店の公式LINEと直接。
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-5">
            <Link
              href={`${base}/drink`}
              className="group relative flex min-h-[148px] flex-col justify-end overflow-hidden rounded-2xl border border-gold-300/70 bg-[linear-gradient(135deg,#4A1A34_0%,#2A1428_45%,#15101E_100%)] p-5 transition-colors hover:border-gold-500 sm:min-h-[210px] sm:p-7"
            >
              <span className="kicker">Drink</span>
              <span className="mt-1 font-display text-[30px] leading-tight text-hive-900 sm:text-4xl">飲みに行く</span>
              <span className="mt-1 text-[13px] text-hive-700 sm:text-sm">今夜の一軒を、動画と料金でえらぶ</span>
              <span className="mt-3 inline-flex w-fit items-center gap-1 text-[13px] font-bold text-gold-600">お店をさがす <span className="transition-transform group-hover:translate-x-1">→</span></span>
              <BeeLogo className="absolute bottom-4 right-3 h-24 w-24 animate-bee-float sm:bottom-6 sm:right-6 sm:h-36 sm:w-36" />
            </Link>
            <Link
              href={`${base}/work`}
              className="group relative flex min-h-[148px] flex-col justify-end overflow-hidden rounded-2xl border border-gold-300/70 bg-[linear-gradient(135deg,#453519_0%,#2A2016_45%,#15101E_100%)] p-5 transition-colors hover:border-gold-500 sm:min-h-[210px] sm:p-7"
            >
              <span className="kicker">Work</span>
              <span className="mt-1 font-display text-[30px] leading-tight text-hive-900 sm:text-4xl">働く</span>
              <span className="mt-1 text-[13px] text-hive-700 sm:text-sm">体入・求人を、お店の雰囲気から</span>
              <span className="mt-3 inline-flex w-fit items-center gap-1 text-[13px] font-bold text-gold-600">求人をさがす <span className="transition-transform group-hover:translate-x-1">→</span></span>
              <BeeGirl className="absolute bottom-4 right-3 h-24 w-24 animate-bee-float [animation-delay:-1.5s] sm:bottom-6 sm:right-6 sm:h-36 sm:w-36" />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-10 sm:px-6 sm:pt-14">
        {/* ── エリア × 業態でさがす ── */}
        <section aria-labelledby="search-h">
          <p className="kicker">Search</p>
          <h2 id="search-h" className="mt-1 text-2xl text-hive-900">エリアと業態でさがす</h2>
          <form action={`${base}/drink`} method="get" className="mt-4 rounded-2xl border border-gold-200/70 bg-ink-800 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <label className="block">
                <span className="text-[12px] font-bold text-hive-500">エリア</span>
                <select name="area" className="mt-1 w-full rounded-lg border border-gold-200 bg-ink-900 px-3 py-2.5 text-[15px] text-hive-900" defaultValue="">
                  <option value="">すべてのエリア</option>
                  {areas.map((a) => (
                    <option key={a.area} value={a.area}>{a.area}（{a.count}）</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-bold text-hive-500">業態</span>
                <select name="genre" className="mt-1 w-full rounded-lg border border-gold-200 bg-ink-900 px-3 py-2.5 text-[15px] text-hive-900" defaultValue="">
                  <option value="">すべての業態</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="self-end rounded-full bg-night-500 px-6 py-2.5 text-[14px] font-bold text-white hover:bg-night-600">飲みに行く店をさがす</button>
              <button type="submit" formAction={`${base}/work`} className="self-end rounded-full border border-gold-400 px-6 py-2.5 text-[14px] font-bold text-gold-600 hover:bg-gold-50">働く店をさがす</button>
            </div>
          </form>
          <ul className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {GENRES.map((g) => (
              <li key={g} className="shrink-0">
                <Link href={`${base}/drink?genre=${encodeURIComponent(g)}`} className="flex items-baseline gap-2 rounded-full border border-gold-200 px-4 py-2 text-[13px] font-bold text-hive-900 hover:border-gold-400 hover:bg-night-50">
                  {g}
                  <span className="font-latin text-[9px] !tracking-[0.2em] text-gold-400">{genreStyle(g).en}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 今週の動画 ── */}
        {videos.length > 0 && (
          <section aria-labelledby="videos-h">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="kicker">This Week</p>
                <h2 id="videos-h" className="mt-1 text-2xl text-hive-900">今週の動画</h2>
                <p className="page-sub">掲載店の公式TikTokから。押すとその場で再生します</p>
              </div>
            </div>
            <div className="mt-4">
              <VideoGrid
                layout="strip"
                videos={videos.map((v) => ({
                  ...v,
                  store: { name: v.store.store_name, href: `${base}/stores/${v.store.slug}`, label: `${v.store.genre}・${v.store.area}` },
                }))}
              />
            </div>
          </section>
        )}

        {/* ── 新着のお店 ── */}
        <section aria-labelledby="new-h">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="kicker">New Arrivals</p>
              <h2 id="new-h" className="mt-1 text-2xl text-hive-900">新着のお店</h2>
              {stores.length > 0 && <p className="page-sub">掲載 {stores.length} 店・うち求人中 {hiring} 店</p>}
            </div>
            {stores.length > 0 && (
              <Link href={`${base}/drink`} className="shrink-0 text-sm font-bold text-gold-500 hover:underline">すべて見る →</Link>
            )}
          </div>
          {stores.length === 0 ? (
            <div className="mt-4">
              <EmptyStores base={base} />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.slice(0, 6).map((l) => (
                <StoreCard key={l.id} l={l} base={base} />
              ))}
            </div>
          )}
        </section>

        {/* ── 掲載のご案内 ── */}
        <section className="relative overflow-hidden rounded-2xl border border-gold-300/60 bg-ink-800 p-5 sm:p-7">
          <p className="kicker">For Stores</p>
          <h2 className="mt-1 text-xl text-hive-900 sm:text-2xl">お店の方へ — 掲載は無料です</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-hive-700 sm:text-sm">
            NIGHT HATCH をご契約のお店は、このサイトに無料で掲載できます。お店の TikTok 動画は自動で更新。予約も応募も、お店の公式LINEに直接つながります。
          </p>
          <Link href={`${base}/for-stores`} className="mt-4 inline-flex rounded-full border border-gold-400 px-5 py-2 text-[13px] font-bold text-gold-600 hover:bg-gold-50">
            掲載をご希望の店舗さまへ →
          </Link>
        </section>
      </div>
    </>
  );
}
