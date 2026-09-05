"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { PointInline } from "@/components/MascotProvider";

type Overview = {
  month: string;
  totals: {
    submissions: number;
    accepted: number;
    revising: number;
    honeySpent: number;
    ai: { chat: number; gen: number };
    contracts: number;
  };
  clients: {
    id: string; name: string; plan: string; plan_active: number; points: number; last_seen_at: string | null;
    ordered: number; active: number; spent: number; submissions: number; awaiting: number;
  }[];
  creators: {
    id: string; name: string; last_seen_at: string | null;
    active: number; submissions: number; accepted: number; revising: number;
  }[];
};

const PLAN_NAME: Record<string, string> = { light: "ライト", standard: "スタンダード", premium: "プレミアム", unlimited: "無制限" };

/** 最終アクセスを「◯分前」の形に */
function ago(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso.replace(" ", "T") + "Z").getTime();
  const m = Math.floor(ms / 60000);
  if (m < 2) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

/** 管理者用ダッシュボード。今月の全体数字と、お客様・クリエイターの状況が一目で分かる */
export default function AdminDashboard() {
  const [o, setO] = useState<Overview | null>(null);

  useEffect(() => {
    api<Overview>("/api/admin/overview").then(setO).catch(() => {});
  }, []);

  if (!o) return <div className="text-sm text-slate-400">集計中...</div>;
  const rate = o.totals.submissions > 0 ? Math.round((o.totals.accepted / o.totals.submissions) * 100) : null;

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <span className="text-sm text-slate-500">{Number(o.month.slice(5))}月の全体</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["提出", `${o.totals.submissions}本`],
          ["検収OK", `${o.totals.accepted}本${rate != null ? `（${rate}%）` : ""}`],
          ["修正対応中", `${o.totals.revising}件`],
          ["ハニー消費", `${o.totals.honeySpent.toLocaleString()}pt`],
          ["AI利用", `${o.totals.ai.chat + o.totals.ai.gen}回`],
          ["契約中", `${o.totals.contracts}社`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-food-200 bg-white px-4 py-3">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="mt-0.5 text-xl font-black text-hive-900">{v}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-hive-900">クライアントの状況</h2>
          <Link href="/admin" className="text-sm font-bold text-food-700 hover:underline">契約管理へ →</Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-food-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="whitespace-nowrap px-3 py-2">お客様</th>
                <th className="whitespace-nowrap px-3 py-2">プラン</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">残高</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">今月発注</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">進行中</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">今月消費</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">検収待ち</th>
                <th className="whitespace-nowrap px-3 py-2">最終アクセス</th>
              </tr>
            </thead>
            <tbody>
              {o.clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 font-bold">
                    {c.name}
                    {c.awaiting > 0 && (
                      <span className="ml-2 rounded-full bg-food-500 px-2 py-0.5 text-[10px] font-bold text-white">確認促し</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {PLAN_NAME[c.plan] ?? c.plan}
                    {c.plan_active === 1 ? (
                      <span className="ml-1 text-[10px] font-bold text-emerald-600">契約中</span>
                    ) : (
                      <span className="ml-1 text-[10px] text-slate-400">未契約</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.points}<PointInline /></td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.ordered}件</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.active}件</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.spent}pt</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.awaiting > 0 ? <b className="text-food-700">{c.awaiting}件</b> : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{ago(c.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-hive-900">クリエイターの状況</h2>
        <div className="overflow-x-auto rounded-xl border border-food-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="whitespace-nowrap px-3 py-2">クリエイター</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">作業中</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">今月提出</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">検収OK</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">修正対応中</th>
                <th className="whitespace-nowrap px-3 py-2">最終アクセス</th>
              </tr>
            </thead>
            <tbody>
              {o.creators.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 font-bold">{c.name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.active}件</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.submissions}本</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.accepted}本</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{c.revising > 0 ? <b className="text-rose-600">{c.revising}件</b> : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{ago(c.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
