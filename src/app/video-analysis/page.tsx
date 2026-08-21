"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type Analysis = {
  title: string; summary: string; hook: string;
  scenes: { time: string; label: string; note: string }[];
  retention: string[];
  applications: { priority: string; note: string }[];
  mock?: boolean;
};

export default function VideoAnalysisPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState("");

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
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">動画分析</h1>
      <p className="mb-6 text-sm text-slate-500">
        参考にしたい動画のURL（YouTube / YouTubeショート）を入力すると、シーン分解・フック分析・応用ポイントをAIが提案します。
      </p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/shorts/..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button onClick={analyze} disabled={busy || !url.trim()} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
          {busy ? "分析中..." : "分析する"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {result && (
        <div className="mt-8 space-y-5">
          {result.mock && (
            <div className="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
              これはデモ結果です。実際の動画分析には .env.local に GEMINI_API_KEY を設定してください。
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
                  <span className="mr-3 font-mono text-xs text-indigo-600">{s.time}</span>
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
