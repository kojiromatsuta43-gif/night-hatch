"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import PlatformIcon from "@/components/PlatformIcon";
import { DEFAULT_SCRIPT_CATEGORY, DEFAULT_VIDEO_CATEGORY, POINTS_BY_CATEGORY } from "@/lib/data";
import { PointInline } from "@/components/MascotProvider";

type RefVideo = { id: string; caption: string; url: string; thumbnail: string; hue: number };

function tiktokVideoId(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return m ? m[1] : null;
}
type RefAccount = {
  id: string; name: string; handle: string; industry: string; followers: number; bio: string;
  icon_url: string; profile_url: string; video_count: number; loaded_videos: number;
  videos?: RefVideo[];
};

/**
 * サムネイルの初回取得はサーバーがTikTokに取りに行くため時間がかかることがある。
 * 一度だけ間を置いて取り直し、それでもだめなら背景だけ見せる。
 */
function retryThumbnail(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.retried) {
    img.style.display = "none";
    return;
  }
  img.dataset.retried = "1";
  const base = img.src.split("?")[0];
  setTimeout(() => { img.src = `${base}?retry=1`; }, 2500);
}

function fmtFollowers(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
}

export default function OrderPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<RefAccount[]>([]);
  const [industry, setIndustry] = useState("すべて");
  const [selected, setSelected] = useState<RefAccount | null>(null);
  const [video, setVideo] = useState<RefVideo | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);

  useEffect(() => {
    api<RefAccount[]>("/api/ref-accounts")
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openAccount = async (a: RefAccount) => {
    setSelected(a);
    if (a.videos) return;
    setLoadingVideos(true);
    try {
      const full = await api<RefAccount>(`/api/ref-accounts/${a.id}`);
      setSelected(full);
      setAccounts((prev) => prev.map((x) => (x.id === a.id ? full : x)));
    } catch {
      // 取得失敗時は空のまま案内を表示
      setSelected({ ...a, videos: [] });
    } finally {
      setLoadingVideos(false);
    }
  };

  const industries = useMemo(
    () => ["すべて", ...Array.from(new Set(accounts.map((a) => a.industry)))],
    [accounts]
  );
  const shown = industry === "すべて" ? accounts : accounts.filter((a) => a.industry === industry);

  const order = (kind: string) => {
    if (!video || !selected) return;
    const params = new URLSearchParams({
      category: kind,
      ref: video.url || `demo://${selected.handle}/${video.id}`,
      refTitle: video.caption,
    });
    router.push(`/order/create?${params.toString()}`);
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/order" className="text-sm text-slate-500 hover:text-slate-700">← 発注トップ</Link>
          <h1 className="text-2xl font-bold">参考アカウントから発注</h1>
        </div>
        <Link href="/order/create" className="text-sm text-honey-600 hover:underline">
          参考動画なしでフォームから登録 →
        </Link>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        お手本のアカウントを選ぶ → 真似したい動画を選ぶ → 台本作成か動画編集の発注に進みます。
      </p>


      {!selected ? (
        <>
          <div className="mb-6 flex items-center gap-2 text-sm">
            <span className="text-slate-500">業界:</span>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5">
              {industries.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              参考アカウントを読み込んでいます...
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                {a.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.icon_url} alt="" className="mx-auto h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${(a.followers % 360)}, 60%, 55%), hsl(${(a.followers % 360) + 40}, 60%, 40%))` }}
                  >
                    {a.name[0]}
                  </div>
                )}
                <div className="mt-3 font-bold">{a.name}</div>
                <div className="text-xs text-honey-600">{a.handle}</div>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-honey-50 px-3 py-1 text-xs font-medium text-honey-700">
                  <PlatformIcon platform="tiktok" className="h-3.5 w-3.5" />
                  {a.industry}
                </span>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 py-2">
                    <div className="text-lg font-bold">{fmtFollowers(a.followers)}</div>
                    <div className="text-xs text-slate-500">フォロワー</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    <div className="text-lg font-bold">{a.loaded_videos || a.video_count}</div>
                    <div className="text-xs text-slate-500">登録動画数</div>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-left text-xs text-slate-500">{a.bio}</p>
                <button onClick={() => openAccount(a)} className="mt-3 w-full rounded-lg bg-honey-400 py-2 text-sm font-medium text-hive-900 hover:bg-honey-300">
                  動画を見る
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => { setSelected(null); setVideo(null); setPlaying(false); }} className="mb-4 rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            ← アカウント一覧に戻る
          </button>
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-honey-200 bg-honey-50/50 px-5 py-4">
            <div>
              <span className="font-bold">{selected.name}</span>
              <span className="ml-2 text-sm text-honey-600">{selected.handle}</span>
            </div>
            <div className="ml-auto flex gap-4 text-sm">
              <span><b>{fmtFollowers(selected.followers)}</b> フォロワー</span>
              <span><b>{selected.videos?.length ?? selected.video_count}</b> 本</span>
            </div>
          </div>
          <h2 className="mb-3 text-sm font-semibold">参考動画を選択</h2>
          {loadingVideos && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              動画を読み込んでいます...
            </div>
          )}
          {!loadingVideos && selected.videos?.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              このアカウントの動画はまだ取り込まれていません。
              {selected.profile_url && (
                <a href={selected.profile_url} target="_blank" rel="noreferrer" className="mx-1 text-honey-600 hover:underline">
                  TikTokプロフィール
                </a>
              )}
              から動画URLをコピーし、管理画面の「参考アカウント」タブで追加してください（キャプション・サムネイルは自動取得）。
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(selected.videos ?? []).map((v) => (
              <button
                key={v.id}
                onClick={() => { setVideo(v); setPlaying(false); setPlayerReady(false); }}
                className="group relative aspect-[9/16] overflow-hidden rounded-xl text-left transition-transform hover:scale-[1.02]"
                style={{ background: `linear-gradient(160deg, hsl(${v.hue}, 45%, 30%), hsl(${v.hue + 30}, 50%, 15%))` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/ref-videos/${v.id}/thumbnail`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={retryThumbnail}
                />
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  <PlatformIcon platform="tiktok" className="h-3 w-3" mono /> ショート動画
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-xs font-semibold leading-snug text-white">
                  {v.caption}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {video && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => { setVideo(null); setPlaying(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-sm font-bold">動画プレビュー</h3>
              <button onClick={() => { setVideo(null); setPlaying(false); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            {tiktokVideoId(video.url) && playing ? (
              <div className="relative mx-auto h-[480px] w-[270px]">
                {!playerReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 text-xs text-slate-500">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-honey-500" />
                    TikTokを読み込んでいます…
                  </div>
                )}
                <iframe
                  src={`https://www.tiktok.com/embed/v2/${tiktokVideoId(video.url)}`}
                  className="h-full w-full rounded-xl border-0"
                  allow="encrypted-media; fullscreen; autoplay"
                  onLoad={() => setPlayerReady(true)}
                  title={video.caption}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => tiktokVideoId(video.url) && setPlaying(true)}
                className="group relative mx-auto flex aspect-[9/16] w-[270px] items-end overflow-hidden rounded-xl p-3"
                style={{ background: `linear-gradient(160deg, hsl(${video.hue}, 45%, 30%), hsl(${video.hue + 30}, 50%, 15%))` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/ref-videos/${video.id}/thumbnail`}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={retryThumbnail}
                />
                {tiktokVideoId(video.url) && (
                  <span className="absolute inset-0 z-10 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
                      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 5l12 7-12 7z" fill="#1C1710" />
                      </svg>
                    </span>
                  </span>
                )}
                <span className="relative z-10 text-left text-sm font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]">
                  {video.caption}
                </span>
              </button>
            )}
            <p className="mt-2 text-center text-xs text-slate-400">
              {selected.handle}
              {video.url ? (
                <a href={video.url} target="_blank" rel="noreferrer" className="ml-1 font-medium text-honey-600 hover:underline">TikTokで開く →</a>
              ) : "（デモ動画）"}
            </p>
            <p className="mt-4 text-center text-sm font-medium">この動画を参考に発注しますか？</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={() => order(DEFAULT_SCRIPT_CATEGORY)} className="rounded-lg bg-honey-400 py-2.5 text-sm font-medium text-hive-900 hover:bg-honey-300">
                台本作成で発注
                <span className="block text-[10px] font-normal opacity-80">{POINTS_BY_CATEGORY[DEFAULT_SCRIPT_CATEGORY]}<PointInline /></span>
              </button>
              <button onClick={() => order(DEFAULT_VIDEO_CATEGORY)} className="rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500">
                動画編集で発注
                <span className="block text-[10px] font-normal opacity-80">{POINTS_BY_CATEGORY[DEFAULT_VIDEO_CATEGORY]}<PointInline /></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
