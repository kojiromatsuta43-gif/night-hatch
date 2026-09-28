"use client";

import Link from "next/link";
import { PointInline } from "@/components/MascotProvider";
import TikTokGlyph from "@/components/TikTokGlyph";
import { useMe } from "@/components/AppShell";
import { DEFAULT_SET_CATEGORY, DEFAULT_VIDEO_CATEGORY, POINTS_BY_CATEGORY } from "@/lib/data";

/**
 * メインサービス（TikTokショート動画の編集）の入口。ホームとメニュー画面の一番上に出す。
 * 頼み方は2択: 「動画の編集」（素材を送るだけ）と「台本作成＋動画の編集」（何を撮るかから）。
 */
export default function MainService({ showRefLink = true }: { showRefLink?: boolean }) {
  const { me } = useMe();
  const edit = POINTS_BY_CATEGORY[DEFAULT_VIDEO_CATEGORY] ?? 10;
  const set = POINTS_BY_CATEGORY[DEFAULT_SET_CATEGORY] ?? 15;
  const left = me ? Math.floor((me.points ?? 0) / edit) : null;
  const leftSet = me ? Math.floor((me.points ?? 0) / set) : null;
  const href = (c: string) => `/order/create?category=${encodeURIComponent(c)}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-gold-300 shadow-sm">
      {/* バナー: ひと目で「TikTok動画をつくるサービス」と分かるように */}
      <div className="relative overflow-hidden bg-[#0b0b10] px-5 py-6 text-white sm:px-7 sm:py-7">
        <span className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[#25F4EE]/15 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-20 right-24 h-56 w-56 rounded-full bg-[#FE2C55]/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-4 sm:gap-6">
          <TikTokGlyph className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
          <div className="min-w-0">
            <p className="font-latin text-[11px] font-bold tracking-[0.2em] text-[#25F4EE]">MAIN SERVICE</p>
            <h2 className="mt-0.5 font-display text-2xl leading-tight [word-break:auto-phrase] sm:text-4xl">TikTok動画、つくります。</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/80 sm:text-sm">求人も集客も。スマホで撮って送るだけで、伸びている夜のお店と同じ形に仕上げます。</p>
          </div>
        </div>
      </div>
      <div className="night-glow flex flex-col gap-5 p-5 sm:p-6">
        {/* 2択 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={href(DEFAULT_VIDEO_CATEGORY)} className="group flex flex-col rounded-xl border border-gold-200 bg-white p-4 transition-colors hover:border-gold-400 hover:bg-night-50">
            <span className="text-[11px] font-black tracking-widest text-gold-500">素材がある</span>
            <span className="mt-1 font-display text-lg text-hive-900">動画の編集</span>
            <span className="mt-1 text-xs leading-relaxed text-hive-500">撮った素材を送るだけ。お手本どおりのテンポと字幕で仕上げます。</span>
            <span className="mt-auto flex items-end justify-between pt-3">
              <span className="text-2xl font-black text-hive-900">{edit}<PointInline /></span>
              <span className="text-sm font-bold text-gold-500 group-hover:underline">頼む →</span>
            </span>
          </Link>
          <Link href={href(DEFAULT_SET_CATEGORY)} className="group relative flex flex-col rounded-xl border border-night-500 bg-night-500 p-4 text-white transition-colors hover:bg-night-600">
            <span className="absolute -top-2.5 right-3 rounded-full bg-honey-400 px-2.5 py-0.5 text-[10px] font-black text-ink-900">おすすめ</span>
            <span className="text-[11px] font-black tracking-widest text-white/75">何を撮るかから</span>
            <span className="mt-1 font-display text-lg">台本作成＋動画の編集</span>
            <span className="mt-1 text-xs leading-relaxed text-white/85">台本どおりにスマホで撮って送れば、お手本と同じ仕上がりに。</span>
            <span className="mt-auto flex items-end justify-between pt-3">
              <span className="text-2xl font-black">{set}<PointInline /></span>
              <span className="text-sm font-bold group-hover:underline">頼む →</span>
            </span>
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gold-200 px-5 py-3 text-xs sm:px-6">
        {showRefLink ? <Link href="/order/reference" className="font-bold text-gold-500 hover:underline">▶ 伸びている夜のお店の動画から、お手本を選ぶ →</Link> : <span className="text-hive-500">できた動画は Instagramリール・YouTubeショートにもそのまま使えます</span>}
        {left !== null && <span className="text-hive-500">いまの残高で、編集なら あと約{left}本／台本つきなら あと約{leftSet}本</span>}
      </div>
    </section>
  );
}
