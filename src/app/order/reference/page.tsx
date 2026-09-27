"use client";

import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/AppShell";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Illust from "@/components/Illust";
import { api } from "@/lib/client";
import PlatformIcon from "@/components/PlatformIcon";
import { DEFAULT_SCRIPT_CATEGORY, DEFAULT_VIDEO_CATEGORY, POINTS_BY_CATEGORY } from "@/lib/data";
import { PointInline } from "@/components/MascotProvider";
import { retryImage, thumbUrl, iconUrl } from "@/lib/client-img";

type RefVideo = {
  id: string; caption: string; url: string; thumbnail: string; hue: number;
  views?: number; likes?: number; posted_at?: string; growth?: number;
};
type Trending = RefVideo & { account_id: string; accountName: string; handle: string; followers: number; industry: string; growth: number; spread: number };
type VideoSort = "views" | "growth" | "new";

const fmtCount = (n: number) => (n >= 100000000 ? `${(n / 100000000).toFixed(1)}億` : n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString());
const fmtDate = (iso?: string) => (iso ? iso.slice(0, 10).replace(/-/g, "/") : "");

/** サムネイルの上に出す再生数・伸びのバッジ（再生数が無い手入力の動画には出さない） */
function VideoBadges({ v }: { v: RefVideo }) {
  if (!v.views) return null;
  return (
    <span className="absolute right-2 top-2 flex flex-col items-end gap-1">
      <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">▶ {fmtCount(v.views)}</span>
      {(v.growth ?? 0) > 0 && (
        <span className="rounded bg-night-500 px-1.5 py-0.5 text-[10px] font-bold text-white">↑ {fmtCount(v.growth!)}/週</span>
      )}
    </span>
  );
}

function tiktokVideoId(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return m ? m[1] : null;
}
type Industry = { id: string; name: string; account_count: number; requested: number };

type RefAccount = {
  id: string; name: string; handle: string; industry: string; followers: number; bio: string;
  icon_url: string; profile_url: string; video_count: number; loaded_videos: number;
  best_views?: number;
  persona?: string;
  videos?: RefVideo[];
};

/**
 * TikTokのキャプションは説明文がまるごと入っていて長い（最大300文字）。
 * サムネイルの上にそのまま出すと画像が文字で埋まってしまうので、
 * 一覧では頭出しだけを見せる。元の文章はDBにそのまま残している。
 */
function shortCaption(caption: string, max = 32): string {
  const text = (caption ?? "")
    .replace(/#[^\s#]+/g, " ")           // ハッシュタグを外す
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "参考動画";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function fmtFollowers(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
}

export default function OrderPage() {
  const { me } = useMe();
  const canOrder = me?.role !== "freelancer";
  const router = useRouter();
  const [accounts, setAccounts] = useState<RefAccount[]>([]);
  const [industry, setIndustry] = useState("すべて");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [selected, setSelected] = useState<RefAccount | null>(null);
  const [video, setVideo] = useState<RefVideo | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoSort, setVideoSort] = useState<VideoSort>("views");
  const [trending, setTrending] = useState<Trending[]>([]);
  const [trendSort, setTrendSort] = useState<VideoSort>("growth");
  // アカウントは一度に24件ずつ（自動取り込みで数百件になるため）
  const PAGE = 24;
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    api<RefAccount[]>("/api/ref-accounts")
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
    api<Industry[]>("/api/industries").then(setIndustries).catch(() => {});
  }, []);

  // いま伸びている動画（自動取り込み分があるときだけ出る）
  useEffect(() => {
    api<Trending[]>(`/api/ref-videos/trending?industry=${encodeURIComponent(industry)}&sort=${trendSort}&limit=12`)
      .then(setTrending)
      .catch(() => setTrending([]));
  }, [industry, trendSort]);

  const sortedVideos = useMemo(() => {
    const vs = [...(selected?.videos ?? [])];
    if (videoSort === "growth") return vs.sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0) || (b.views ?? 0) - (a.views ?? 0));
    if (videoSort === "new") return vs.sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? ""));
    return vs.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  }, [selected?.videos, videoSort]);
  const hasStats = (selected?.videos ?? []).some((v) => (v.views ?? 0) > 0);

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

  // 業種ごとの実際の登録数（マスタの件数より、いま画面にある数を正とする）
  const countByIndustry = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts) m.set(a.industry, (m.get(a.industry) ?? 0) + 1);
    return m;
  }, [accounts]);

  const tabs = useMemo(() => {
    const fromMaster = industries.map((i) => ({ ...i, count: countByIndustry.get(i.name) ?? 0 }));
    // マスタに無い業種が参考アカウント側にあれば、取りこぼさず末尾に足す
    const known = new Set(fromMaster.map((t) => t.name));
    const extras = [...countByIndustry.keys()]
      .filter((n) => !known.has(n))
      .map((n) => ({ id: `x:${n}`, name: n, account_count: 0, requested: 0, count: countByIndustry.get(n) ?? 0 }));
    return [...fromMaster, ...extras];
  }, [industries, countByIndustry]);

  const shown = industry === "すべて" ? accounts : accounts.filter((a) => a.industry === industry);
  const pageShown = shown.slice(0, visible);

  const requestIndustry = async (name: string) => {
    if (requesting) return;
    setRequesting(true);
    try {
      await api("/api/industries/requests", { method: "POST", body: JSON.stringify({ industry_name: name }) });
      setRequested((prev) => (prev.includes(name) ? prev : [...prev, name]));
    } catch {
      // 送れなくても画面は壊さない
    } finally {
      setRequesting(false);
    }
  };

  const order = (kind: string) => {
    if (!video || !selected) return;
    const params = new URLSearchParams({
      category: kind,
      ref: video.url || `demo://${selected.handle}/${video.id}`,
      refTitle: shortCaption(video.caption, 40),
    });
    router.push(`/order/create?${params.toString()}`);
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/order" className="text-sm text-slate-500 hover:text-slate-700">← 発注トップ</Link>
          <h1 className="text-2xl font-bold">伸びてる夜のお店の動画をまねる</h1>
        </div>
        <Link href="/order/create" className="text-sm text-night-700 hover:underline">
          参考動画なしでフォームから登録 →
        </Link>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        お手本のアカウントを選ぶ → 真似したい動画を選ぶ → 台本作成か動画編集の発注に進みます。
      </p>


      {!selected ? (
        <>
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                onClick={() => { setIndustry("すべて"); setVisible(PAGE); }}
                className={`rounded-full px-4 py-1.5 transition-colors ${
                  industry === "すべて"
                    ? "bg-night-500 font-semibold text-white"
                    : "border border-slate-300 text-slate-600 hover:border-night-400"
                }`}
              >
                すべて
                <span className="ml-1.5 text-xs opacity-70">{accounts.length}</span>
              </button>
              {tabs.map((t) => {
                const active = industry === t.name;
                const empty = t.count === 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setIndustry(t.name); setVisible(PAGE); }}
                    className={`rounded-full px-4 py-1.5 transition-colors ${
                      active
                        ? "bg-night-500 font-semibold text-white"
                        : empty
                          ? "border border-dashed border-slate-300 text-slate-400 hover:border-night-400"
                          : "border border-slate-300 text-slate-600 hover:border-night-400"
                    }`}
                  >
                    {t.name}
                    <span className="ml-1.5 text-xs opacity-70">{empty ? "準備中" : t.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              参考アカウントを読み込んでいます...
            </div>
          )}
          {!loading && accounts.length === 0 && industry === "すべて" && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-gold-300 bg-white px-6 py-12 text-center">
              <Illust name="glass" className="h-24 w-24" />
              <p className="mt-3 font-display text-lg text-hive-900">お手本動画はまだありません</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                お手本動画は管理画面の「TikTok取り込み」から追加できます。
                追加されるまでは、参考動画なしでそのまま発注できます。
              </p>
              <Link href="/order/create" className="mt-5 rounded-full bg-night-500 px-5 py-2 text-sm font-bold text-white hover:bg-night-600">
                参考動画なしで発注する →
              </Link>
            </div>
          )}
          {!loading && shown.length === 0 && industry !== "すべて" && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-bold text-hive-900">「{industry}」のお手本はいま準備中です</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                リクエストをいただくと、この業態で伸びているアカウントを集めて登録します。
                お急ぎの場合は、下のボタンからフォームで直接ご依頼いただくこともできます。
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {requested.includes(industry) ? (
                  <span className="rounded-lg bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-700">
                    リクエストを受け付けました
                  </span>
                ) : (
                  <button
                    onClick={() => requestIndustry(industry)}
                    disabled={requesting}
                    className="rounded-lg bg-night-500 px-5 py-2 text-sm font-bold text-white hover:bg-night-600 disabled:opacity-40"
                  >
                    この業態のお手本を追加してほしい
                  </button>
                )}
                <Link href="/order/create" className="text-sm text-slate-500 hover:text-night-700">
                  参考動画なしでフォームから発注する →
                </Link>
              </div>
            </div>
          )}

          {trending.length > 0 && (
            <section className="mb-8">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h2 className="text-base font-bold text-hive-900">いま伸びている動画</h2>
                <div className="flex gap-1 text-xs">
                  {([["growth", "今週の伸び"], ["views", "再生数"], ["new", "新着"]] as const).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setTrendSort(k)}
                      className={`rounded-full px-2.5 py-1 ${trendSort === k ? "bg-night-500 font-semibold text-white" : "border border-slate-300 text-slate-500"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400">{industry === "すべて" ? "全業種" : industry}・毎日更新</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {trending.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const acc = accounts.find((a) => a.id === t.account_id);
                      if (acc) void openAccount(acc).then(() => { setVideo(t); setPlaying(false); setPlayerReady(false); });
                    }}
                    className="group relative w-32 shrink-0 overflow-hidden rounded-xl text-left"
                    style={{ aspectRatio: "9/16", background: `linear-gradient(160deg, hsl(${t.hue}, 45%, 30%), hsl(${t.hue + 30}, 50%, 15%))` }}
                    title={t.caption}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbUrl(t.id)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" onError={retryImage} />
                    <VideoBadges v={t} />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-6">
                      <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">{shortCaption(t.caption, 24)}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-white/80">{t.accountName}{t.spread > 0 ? `・拡散${t.spread}倍` : ""}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageShown.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                {a.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconUrl(a.id)} alt="" loading="lazy" decoding="async" onError={retryImage} className="mx-auto h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
                    style={{ background: `linear-gradient(135deg, hsl(${(a.followers % 360)}, 60%, 55%), hsl(${(a.followers % 360) + 40}, 60%, 40%))` }}
                  >
                    {a.name[0]}
                  </div>
                )}
                <div className="mt-3 font-bold">{a.name}</div>
                <div className="text-xs text-night-700">{a.handle}</div>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-night-50 px-3 py-1 text-xs font-medium text-night-700">
                  <PlatformIcon platform="tiktok" className="h-3.5 w-3.5" />
                  {a.industry}
                </span>
                {a.persona && <div className="mt-1.5 text-xs font-medium text-hive-900/70">{a.persona}</div>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 py-2">
                    <div className="text-lg font-bold">{fmtFollowers(a.followers)}</div>
                    <div className="text-xs text-slate-500">フォロワー</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    {a.best_views ? (
                      <>
                        <div className="text-lg font-bold">{fmtCount(a.best_views)}</div>
                        <div className="text-xs text-slate-500">最高再生数</div>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-bold">{a.loaded_videos || a.video_count}</div>
                        <div className="text-xs text-slate-500">登録動画数</div>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-left text-xs text-slate-500">{a.bio}</p>
                <button onClick={() => openAccount(a)} className="mt-3 w-full rounded-lg bg-night-500 py-2 text-sm font-medium text-white hover:bg-night-600">
                  動画を見る
                </button>
              </div>
            ))}
          </div>
          {shown.length > visible && (
            <div className="mt-6 text-center">
              <button onClick={() => setVisible((v) => v + PAGE)} className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:border-night-400">
                もっと見る（残り {shown.length - visible} 件）
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <button onClick={() => { setSelected(null); setVideo(null); setPlaying(false); }} className="mb-4 rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            ← アカウント一覧に戻る
          </button>
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-night-200 bg-night-50/50 px-5 py-4">
            <div>
              <span className="font-bold">{selected.name}</span>
              <span className="ml-2 text-sm text-night-700">{selected.handle}</span>
            </div>
            <div className="ml-auto flex gap-4 text-sm">
              <span><b>{fmtFollowers(selected.followers)}</b> フォロワー</span>
              <span><b>{selected.videos?.length ?? selected.video_count}</b> 本</span>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold">参考動画を選択</h2>
            {hasStats && (
              <div className="flex gap-1 text-xs">
                {([["views", "再生数順"], ["growth", "今週伸びた順"], ["new", "新着順"]] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setVideoSort(k)}
                    className={`rounded-full px-2.5 py-1 ${videoSort === k ? "bg-night-500 font-semibold text-white" : "border border-slate-300 text-slate-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {loadingVideos && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              動画を読み込んでいます...
            </div>
          )}
          {!loadingVideos && selected.videos?.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              このアカウントの動画はまだ取り込まれていません。
              {selected.profile_url && (
                <a href={selected.profile_url} target="_blank" rel="noreferrer" className="mx-1 text-night-700 hover:underline">
                  TikTokプロフィール
                </a>
              )}
              から動画URLをコピーし、管理画面の「参考アカウント」タブで追加してください（キャプション・サムネイルは自動取得）。
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sortedVideos.map((v) => (
              <button
                key={v.id}
                onClick={() => { setVideo(v); setPlaying(false); setPlayerReady(false); }}
                className="group relative aspect-[9/16] overflow-hidden rounded-xl text-left transition-transform hover:scale-[1.02]"
                style={{ background: `linear-gradient(160deg, hsl(${v.hue}, 45%, 30%), hsl(${v.hue + 30}, 50%, 15%))` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl(v.id)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={retryImage}
                />
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  <PlatformIcon platform="tiktok" className="h-3 w-3" mono /> ショート動画
                </span>
                <VideoBadges v={v} />
                <span
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-7"
                  title={v.caption}
                >
                  <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">
                    {shortCaption(v.caption)}
                  </span>
                  {v.posted_at && <span className="mt-0.5 block text-[10px] text-white/70">{fmtDate(v.posted_at)}</span>}
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
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-night-500" />
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
                  src={thumbUrl(video.id)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={retryImage}
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
                <span className="relative z-10 line-clamp-2 text-left text-sm font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]">
                  {shortCaption(video.caption, 40)}
                </span>
              </button>
            )}
            {video.views ? (
              <p className="mt-2 flex justify-center gap-3 text-xs text-slate-600">
                <span>▶ {fmtCount(video.views)} 再生</span>
                {video.likes ? <span>♥ {fmtCount(video.likes)}</span> : null}
                {(video.growth ?? 0) > 0 && <span className="font-semibold text-night-700">↑ 今週 +{fmtCount(video.growth!)}</span>}
                {selected.followers > 0 && <span>拡散 {Math.round((video.views / selected.followers) * 10) / 10}倍</span>}
                {video.posted_at && <span>{fmtDate(video.posted_at)} 投稿</span>}
              </p>
            ) : null}
            <p className="mt-2 text-center text-xs text-slate-400">
              {selected.handle}
              {video.url ? (
                <a href={video.url} target="_blank" rel="noreferrer" className="ml-1 font-medium text-night-700 hover:underline">TikTokで開く →</a>
              ) : "（デモ動画）"}
            </p>
            {canOrder && (
              <>
                <p className="mt-4 text-center text-sm font-medium">この動画を参考に発注しますか？</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button onClick={() => order(DEFAULT_SCRIPT_CATEGORY)} className="rounded-lg bg-night-500 py-2.5 text-sm font-medium text-white hover:bg-night-600">
                    台本作成で発注
                    <span className="block text-[10px] font-normal opacity-80">{POINTS_BY_CATEGORY[DEFAULT_SCRIPT_CATEGORY]}<PointInline /></span>
                  </button>
                  <button onClick={() => order(DEFAULT_VIDEO_CATEGORY)} className="rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white hover:brightness-110">
                    動画編集で発注
                    <span className="block text-[10px] font-normal opacity-80">{POINTS_BY_CATEGORY[DEFAULT_VIDEO_CATEGORY]}<PointInline /></span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
