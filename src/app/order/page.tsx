"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { CATEGORIES } from "@/lib/data";

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

function fmtFollowers(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
}

export default function OrderPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<RefAccount[]>([]);
  const [category, setCategory] = useState<string>("台本作成");
  const [industry, setIndustry] = useState("すべて");
  const [selected, setSelected] = useState<RefAccount | null>(null);
  const [video, setVideo] = useState<RefVideo | null>(null);
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
  const isVideoCategory = category === "台本作成" || category === "動画編集";

  const order = (kind: "台本作成" | "動画編集") => {
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
        <h1 className="text-2xl font-bold">案件登録</h1>
        <Link href="/order/create" className="text-sm text-honey-600 hover:underline">
          参考動画なしでフォームから登録 →
        </Link>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        「このアカウントみたいに作りたい」から始める発注。参考アカウント → 動画を選ぶと、発注フォームに引き継がれます。
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${category === c ? "border-honey-500 bg-honey-400 text-hive-900" : "border-slate-300 bg-white text-slate-600 hover:border-honey-400"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {!isVideoCategory ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">このカテゴリは参考動画選択に対応していません。</p>
          <Link href={`/order/create?category=${encodeURIComponent(category)}`} className="mt-3 inline-block rounded-lg bg-honey-400 px-5 py-2 text-sm font-medium text-hive-900 hover:bg-honey-300">
            {category}の発注フォームへ進む
          </Link>
        </div>
      ) : !selected ? (
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
                <span className="mt-2 inline-block rounded-full bg-honey-50 px-3 py-1 text-xs font-medium text-honey-700">{a.industry}</span>
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
          <button onClick={() => { setSelected(null); setVideo(null); }} className="mb-4 rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
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
                onClick={() => setVideo(v)}
                className="group relative aspect-[9/16] overflow-hidden rounded-xl text-left transition-transform hover:scale-[1.02]"
                style={{ background: `linear-gradient(160deg, hsl(${v.hue}, 45%, 30%), hsl(${v.hue + 30}, 50%, 15%))` }}
              >
                {v.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white">▶ ショート動画</span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-xs font-semibold leading-snug text-white">
                  {v.caption}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {video && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setVideo(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-sm font-bold">動画プレビュー</h3>
              <button onClick={() => setVideo(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            {tiktokVideoId(video.url) ? (
              <iframe
                src={`https://www.tiktok.com/embed/v2/${tiktokVideoId(video.url)}`}
                className="mx-auto block h-[480px] w-[270px] rounded-xl border-0"
                allow="encrypted-media; fullscreen"
              />
            ) : (
              <div
                className="relative mx-auto flex aspect-[9/16] w-52 items-end overflow-hidden rounded-xl p-3"
                style={{ background: `linear-gradient(160deg, hsl(${video.hue}, 45%, 30%), hsl(${video.hue + 30}, 50%, 15%))` }}
              >
                {video.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <p className="relative text-sm font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">{video.caption}</p>
              </div>
            )}
            <p className="mt-2 text-center text-xs text-slate-400">
              {selected.handle}
              {video.url ? (
                <a href={video.url} target="_blank" rel="noreferrer" className="ml-1 text-honey-500 hover:underline">元動画を開く</a>
              ) : "（デモ動画）"}
            </p>
            <p className="mt-4 text-center text-sm font-medium">この動画を参考に発注しますか？</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={() => order("台本作成")} className="rounded-lg bg-honey-400 py-2.5 text-sm font-medium text-hive-900 hover:bg-honey-300">
                台本作成で発注
                <span className="block text-[10px] font-normal opacity-80">4🍯</span>
              </button>
              <button onClick={() => order("動画編集")} className="rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500">
                動画編集で発注
                <span className="block text-[10px] font-normal opacity-80">内容により変動</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
