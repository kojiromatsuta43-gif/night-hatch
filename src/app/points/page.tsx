"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { PointMark, useMascot } from "@/components/MascotProvider";

type Tx = { id: string; amount: number; kind: string; memo: string; created_at: string };

const PLANS = [
  { amount: 50, price: "¥30,000", desc: "お試しプラン" },
  { amount: 100, price: "¥55,000", desc: "スタンダード" },
  { amount: 300, price: "¥150,000", desc: "ビジネス" },
];

export default function PointsPage() {
  const { mascot } = useMascot();
  const { me, refresh } = useMe();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ transactions: Tx[] }>("/api/points").then((r) => setTxs(r.transactions)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const buy = async (amount: number) => {
    if (!confirm(`${mascot.pointName} を ${amount}${mascot.pointEmoji} 購入します（デモのため決済は行われません）`)) return;
    setBusy(true);
    await api("/api/points", { method: "POST", body: JSON.stringify({ amount }) });
    refresh();
    load();
    setBusy(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        {mascot.pointName}
        <PointMark className="h-7 w-7 text-2xl" />
      </h1>
      <div className="mb-8 flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-6">
        <PointMark className="h-16 w-16 shrink-0 text-5xl" />
        <div>
          <div className="text-sm text-slate-500">現在の残高</div>
          <div className="text-4xl font-bold text-honey-700">{me?.points ?? 0}</div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">{mascot.pointName}を買う</h2>
      <p className="mb-4 text-xs text-slate-400">※ デモ環境のため実際の決済は行われません（本番はStripe連携を想定）</p>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.amount} className="rounded-xl border border-slate-200 bg-white p-5 text-center">
            <div className="text-sm text-slate-500">{p.desc}</div>
            <div className="mt-1 text-2xl font-bold text-honey-700">{p.amount}{mascot.pointEmoji}</div>
            <div className="text-sm text-slate-400">{p.price}</div>
            <button onClick={() => buy(p.amount)} disabled={busy} className="mt-3 w-full rounded-lg bg-honey-400 py-2 text-sm font-medium text-hive-900 disabled:opacity-40 hover:bg-honey-300">購入する</button>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">利用履歴</h2>
      <div className="rounded-xl border border-slate-200 bg-white">
        {txs.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">履歴がありません</div>}
        {txs.map((t) => (
          <div key={t.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-0">
            <div>
              <div className="font-medium">{t.memo}</div>
              <div className="text-xs text-slate-400">{t.created_at.slice(0, 16)}</div>
            </div>
            <span className={t.amount > 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-500"}>
              {t.amount > 0 ? "+" : ""}{t.amount}{mascot.pointEmoji}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
