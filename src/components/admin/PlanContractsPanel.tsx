"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PointInline } from "@/components/MascotProvider";

type Plan = { id: string; name: string; monthly: number; points: number; carryMonths: number; initial: number };
type Row = {
  id: string;
  name: string;
  email: string;
  points: number;
  plan: string;
  plan_active: number;
  plan_since: string | null;
  tiktok_handle: string;
  via_stripe: number;
  expiring: { remaining: number; memo: string; expires_at: string }[];
};

/**
 * 契約管理。
 * 銀行振込など Stripe を通らない契約はここで「契約中」にする。
 * 契約中のお客様には毎月自動でハニーPが付与され、繰越期限で失効する。
 */
export default function PlanContractsPanel() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [handles, setHandles] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api<{ plans: Plan[]; users: Row[] }>("/api/admin/plan")
      .then((r) => {
        setPlans(r.plans);
        setRows(r.users);
        setHandles(Object.fromEntries(r.users.map((u) => [u.id, u.tiktok_handle ?? ""])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗しました"));
  }, []);
  useEffect(load, [load]);

  const save = async (userId: string, payload: Record<string, unknown>) => {
    setSaving(userId);
    setError("");
    try {
      await api("/api/admin/plan", { method: "POST", body: JSON.stringify({ user_id: userId, ...payload }) });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "変更できませんでした");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-night-200 bg-night-50/50 p-4 text-sm text-hive-900">
        「契約中」にすると、その場で今月分のハニーPが付与され、以降は毎月自動で付与されます。
        繰越期限（ライト3ヶ月・スタンダード6ヶ月・プレミアム12ヶ月）を過ぎた分は自動で失効します。
        カード決済（Stripe）で申し込んだお客様は自動で契約中になります。
        TikTokアカウントを入れておくと、お客様の月次レポートに「動画の伸び」が出ます（参考動画に取り込み済みのアカウントのみ）。
      </div>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="whitespace-nowrap px-3 py-2">お客様</th>
              <th className="whitespace-nowrap px-3 py-2">プラン</th>
              <th className="whitespace-nowrap px-3 py-2">契約</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">残高</th>
              <th className="whitespace-nowrap px-3 py-2">失効予定（60日以内）</th>
              <th className="whitespace-nowrap px-3 py-2">TikTok</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="font-bold">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                  {u.via_stripe === 1 && <span className="text-[10px] text-emerald-600">カード決済</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <select
                    value={u.plan}
                    disabled={saving === u.id}
                    onChange={(e) => save(u.id, { plan: e.target.value })}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}（{p.points}pt/月）</option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button
                    onClick={() => save(u.id, { active: u.plan_active !== 1 })}
                    disabled={saving === u.id}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      u.plan_active === 1 ? "bg-emerald-100 text-emerald-700" : "border border-slate-300 text-slate-500"
                    }`}
                  >
                    {u.plan_active === 1 ? "契約中" : "未契約"}
                  </button>
                  {u.plan_since && <div className="mt-0.5 text-[10px] text-slate-400">{u.plan_since}〜</div>}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums">
                  {u.points}<PointInline />
                </td>
                <td className="px-3 py-2 text-xs">
                  {u.expiring.length === 0 ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    u.expiring.map((e, i) => (
                      <div key={i}>{e.remaining}pt … {e.expires_at}</div>
                    ))
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      value={handles[u.id] ?? ""}
                      onChange={(e) => setHandles((h) => ({ ...h, [u.id]: e.target.value }))}
                      placeholder="@handle"
                      className="w-32 rounded border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => save(u.id, { tiktok_handle: handles[u.id] ?? "" })}
                      disabled={saving === u.id}
                      className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200"
                    >
                      保存
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
