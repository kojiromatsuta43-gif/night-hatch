"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

export type UsageSummary = {
  plan: string;
  planLabel: string;
  unlimited: boolean;
  chat: { used: number; limit: number };
  gen: { used: number; limit: number };
  extra: number;
  extraUses: number;
  extraPoints: number;
};

/**
 * AIの残り回数の小さな表示。上限に達したら追加パックの購入ボタンを出す。
 * `refreshKey` が変わるたびに取り直す（AIを1回使うごとに親から変える）。
 */
export default function AiUsage({ refreshKey = 0, compact = false }: { refreshKey?: number; compact?: boolean }) {
  const [u, setU] = useState<UsageSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<UsageSummary>("/api/ai/usage").then(setU).catch(() => {});
  }, []);
  useEffect(load, [load, refreshKey]);

  if (!u || u.unlimited) return null;

  const chatLeft = Math.max(0, u.chat.limit - u.chat.used);
  const genLeft = Math.max(0, u.gen.limit - u.gen.used);
  const low = chatLeft === 0 || genLeft === 0;

  const buy = async () => {
    if (!window.confirm(`追加パック（${u.extraUses}回）を ${u.extraPoints}🍯 で購入しますか？`)) return;
    setBusy(true);
    setMsg("");
    try {
      setU(await api<UsageSummary>("/api/ai/usage", { method: "POST", body: JSON.stringify({ buy: true }) }));
      setMsg("追加しました");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "購入できませんでした");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${compact ? "" : "rounded border-2 border-hive-900 bg-white px-3 py-2"} ${low ? "text-rose-600" : "text-slate-500"}`}>
      <span title="AIチャットの自由入力。日本時間の0時にリセット">会話 今日あと {chatLeft}/{u.chat.limit}</span>
      <span title="台本づくり・動画分析・資料の読み取り。月初にリセット">生成 今月あと {genLeft}/{u.gen.limit}</span>
      {u.extra > 0 && <span className="text-slate-500">＋追加 {u.extra}回</span>}
      <button onClick={buy} disabled={busy} className="rounded border-2 border-hive-900 bg-honey-400 px-2 py-0.5 font-bold text-hive-900 disabled:opacity-50">
        {busy ? "処理中..." : `＋${u.extraUses}回（${u.extraPoints}🍯）`}
      </button>
      {msg && <span className="text-slate-600">{msg}</span>}
    </div>
  );
}
