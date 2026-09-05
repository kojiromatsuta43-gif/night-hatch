"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import AiUsage from "@/components/AiUsage";
import PlatformIcon from "@/components/PlatformIcon";

type Analysis = {
  title: string; summary: string; hook: string;
  scenes: { time: string; label: string; note: string }[];
  retention: string[];
  applications: { priority: string; note: string }[];
  mock?: boolean;
  source?: "tiktok" | "youtube";
  inferred?: boolean;
  thumbnail?: string;
  author?: string;
  caption?: string;
};

/** TikTokの埋め込み用に動画IDを取り出す */
function tiktokVideoId(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return m ? m[1] : null;
}

export default function VideoAnalysisPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [usageKey, setUsageKey] = useState(0);

  const analyze = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await api<Analysis>("/api/analyze-video", { method: "POST", body: JSON.stringify({ url }) });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析に失敗しました");
    } finally {
      setBusy(false);
      setUsageKey((k) => k + 1);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">動画分析</h1>
      <p className="mb-4 text-sm text-slate-500">
        参考にしたい動画のURLを入れると、シーン分解・フック分析・自社への応用ポイントをAIが提案します。
      </p>
      <div className="mb-4"><AiUsage refreshKey={usageKey} /></div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">
          <PlatformIcon platform="tiktok" className="h-3.5 w-3.5" /> TikTok
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium">
          <PlatformIcon platform="youtube" className="h-3.5 w-3.5" /> YouTube・ショート
        </span>
      </div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@... または https://www.youtube.com/shorts/..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-food-500 focus:outline-none"
        />
        <button onClick={analyze} disabled={busy || !url.trim()} className="rounded-lg bg-food-500 px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
          {busy ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
              分析中...
            </span>
          ) : "分析する"}
        </button>
      </div>
      {busy && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border-2 border-dashed border-food-400 bg-food-50 px-5 py-4 text-sm text-hive-900">
          <svg className="h-6 w-6 shrink-0 animate-spin text-food-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          ハッチが動画を見ています… 30秒ほどかかることがあります。そのままお待ちください。
        </div>
      )}
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {result && (
        <div className="mt-8 space-y-5">
          {result.inferred && !result.mock && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800">
              <b className="block text-sm">TikTokは推定分析です</b>
              TikTokは動画の中身をAIが直接再生できないため、<b>キャプション・投稿者・TikTokの一般的な構成パターンからの推定</b>になります。
              下の元動画を見ながらご確認ください。（YouTubeの場合は動画そのものを解析します）
            </div>
          )}
          {(result.thumbnail || tiktokVideoId(url)) && (
            <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-5">
              {tiktokVideoId(url) ? (
                <iframe
                  src={`https://www.tiktok.com/embed/v2/${tiktokVideoId(url)}`}
                  className="h-[420px] w-[240px] shrink-0 rounded-xl border-0"
                  allow="encrypted-media; fullscreen"
                  title="元の動画"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.thumbnail} alt="" className="h-40 w-auto shrink-0 rounded-lg border border-slate-200 object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-500">元の動画</div>
                {result.author && <div className="mt-1 text-sm font-bold">{result.author}</div>}
                {result.caption && <p className="mt-1 text-sm text-slate-600">{result.caption}</p>}
                <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-food-600 hover:underline">
                  TikTokで開く →
                </a>
              </div>
            </div>
          )}
          {result.mock && (
            <div className="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
              これはデモ結果です。実際の動画を分析するには .env.local に GEMINI_API_KEY（無料）を設定してサーバーを再起動してください。
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">{result.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{result.summary}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-sm font-bold text-amber-800">フック分析</h3>
            <p className="mt-1 text-sm text-amber-900">{result.hook}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold">シーン構造</h3>
            <div className="space-y-2">
              {result.scenes.map((s, i) => (
                <div key={i} className="rounded-lg bg-slate-50 px-4 py-2.5">
                  <span className="mr-3 font-mono text-xs text-food-700">{s.time}</span>
                  <span className="text-sm font-semibold">{s.label}</span>
                  <p className="mt-0.5 text-sm text-slate-600">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-2 text-sm font-bold">視聴維持要因</h3>
            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
              {result.retention.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold">自分の動画への応用ポイント</h3>
            <div className="space-y-2">
              {result.applications.map((a, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${a.priority === "高" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{a.priority}</span>
                  <span className="text-slate-700">{a.note}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400">AIによる自動分析レポートです。実際の運用判断は人の確認をお願いします。</p>
        </div>
      )}
    </div>
  );
}
