"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { retryImage } from "@/lib/client-img";
import TikTokPlayer, { useTikTokPreconnect } from "@/components/TikTokPlayer";

export type GridVideo = {
  key: string;
  tiktokId: string;
  url: string;
  caption: string;
  views: number;
  thumb: string | null;
  store?: { name: string; href: string; label: string };
};

const fmtViews = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}万回` : n > 0 ? `${n.toLocaleString()}回` : "");

/**
 * お店の TikTok 動画。はじめはサムネイルだけ（遅延読み込み）で、押したときに TikTok の公式埋め込み
 * （TikTok 公式の軽い再生専用プレイヤー player/v1。開いたらすぐ自動再生）を重ねて開く。スマホでもページが重くならない。
 * layout="strip" は横スクロール（トップの「今週の動画」）。
 */
export default function VideoGrid({ videos, layout = "grid" }: { videos: GridVideo[]; layout?: "grid" | "strip" }) {
  const [open, setOpen] = useState<GridVideo | null>(null);
  // 動画を押す前に TikTok への接続を張っておく（最初の1本を速くする）
  useTikTokPreconnect();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const wrap =
    layout === "strip"
      ? "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-6 [&>*]:w-[42vw] [&>*]:max-w-[200px] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-auto sm:[&>*]:max-w-none"
      : "grid grid-cols-2 gap-3 sm:grid-cols-3";

  return (
    <>
      <ul className={wrap}>
        {videos.map((v) => (
          <li key={v.key}>
            <button
              type="button"
              onClick={() => setOpen(v)}
              className="group relative block aspect-[9/16] w-full overflow-hidden rounded-xl border border-gold-200/60 bg-gradient-to-br from-night-200 via-ink-700 to-ink-900 text-left"
              aria-label={`${v.store ? v.store.name + "の" : ""}動画を再生`}
            >
              {v.thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumb} alt="" loading="lazy" decoding="async" onError={retryImage} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              )}
              <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 font-latin text-[9px] !tracking-[0.18em] text-white/90">TikTok</span>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/35 backdrop-blur-sm transition-transform group-hover:scale-110">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5l12 7-12 7z" fill="#fff" />
                  </svg>
                </span>
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pb-2.5 pt-8">
                {v.store && <span className="block truncate text-[12px] font-bold text-white">{v.store.name}</span>}
                {v.store && <span className="block truncate text-[10px] text-gold-600">{v.store.label}</span>}
                {!v.store && v.caption && <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">{v.caption}</span>}
                {fmtViews(v.views) && <span className="mt-0.5 block text-[10px] text-white/70">▶ {fmtViews(v.views)}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="動画を再生">
          <div className="w-full max-w-[340px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              {open.store ? (
                <Link href={open.store.href} className="min-w-0 truncate text-sm font-bold text-gold-600 hover:underline" onClick={() => setOpen(null)}>
                  {open.store.name} →
                </Link>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => setOpen(null)} className="shrink-0 rounded-full border border-white/30 px-3 py-1 text-xs text-white/85 hover:bg-white/10">
                閉じる ✕
              </button>
            </div>
            <TikTokPlayer videoId={open.tiktokId} poster={open.thumb ?? undefined} title="TikTok動画" className="h-[min(600px,76vh)] w-full rounded-xl" />
            <a href={open.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-center text-xs text-white/70 underline-offset-2 hover:underline">
              TikTokのアプリ・サイトで見る
            </a>
          </div>
        </div>
      )}
    </>
  );
}
