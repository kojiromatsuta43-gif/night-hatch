"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { INVOICE_STATUSES } from "@/lib/invoice";

type Partner = { id: string; name: string; contact: string; email: string };
type Doc = { id: string; title: string; amount: number; status: string; issued_on: string; partner_id: string | null };

const PO_STATUSES = ["下書き", "送付済", "受注", "失注"];
const INV_STATUSES = [...INVOICE_STATUSES];

export default function IssuePage() {
  const [tab, setTab] = useState<"partners" | "po" | "inv">("po");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pos, setPos] = useState<Doc[]>([]);
  const [invs, setInvs] = useState<Doc[]>([]);

  const load = useCallback(() => {
    api<Partner[]>("/api/partners").then(setPartners).catch(() => {});
    api<Doc[]>("/api/purchase-orders").then(setPos).catch(() => {});
    api<Doc[]>("/api/invoices").then(setInvs).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const addPartner = async () => {
    const name = prompt("取引先名");
    if (!name) return;
    await api("/api/partners", { method: "POST", body: JSON.stringify({ name }) });
    load();
  };

  const addPurchaseOrder = async () => {
    const title = prompt("発注書の件名");
    if (!title) return;
    const amount = Number(prompt("金額（円）") ?? 0);
    await api("/api/purchase-orders", {
      method: "POST",
      body: JSON.stringify({ title, amount, issued_on: new Date().toISOString().slice(0, 10) }),
    });
    load();
  };

  const docTable = (docs: Doc[], statuses: string[], base: string, editBase?: string) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="px-4 py-3 font-medium">件名</th>
            <th className="px-4 py-3 font-medium text-right">金額</th>
            <th className="px-4 py-3 font-medium">発行日</th>
            <th className="px-4 py-3 font-medium">ステータス</th>
            {editBase && <th className="px-4 py-3 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 && <tr><td colSpan={editBase ? 5 : 4} className="px-4 py-8 text-center text-slate-400">まだありません</td></tr>}
          {docs.map((d) => (
            <tr key={d.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 font-medium">
                {editBase ? (
                  <Link href={`${editBase}/${d.id}`} className="text-hive-900 hover:text-honey-700 hover:underline">
                    {d.title || "（件名なし）"}
                  </Link>
                ) : (
                  d.title
                )}
              </td>
              <td className="px-4 py-3 text-right">¥{d.amount.toLocaleString()}</td>
              <td className="px-4 py-3">{d.issued_on}</td>
              <td className="px-4 py-3">
                <select
                  value={d.status}
                  onChange={async (e) => { await api(`${base}/${d.id}`, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) }); load(); }}
                  className="rounded border border-slate-200 px-2 py-1 text-xs"
                >
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
              {editBase && (
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`${editBase}/${d.id}`} className="text-xs text-slate-500 hover:text-honey-700">編集</Link>
                  <Link href={`${editBase}/${d.id}/print`} className="ml-3 text-xs text-slate-500 hover:text-honey-700">印刷</Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">発注書・請求書</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/issue/issuer" className="rounded-lg border border-slate-300 px-4 py-1.5 text-slate-600 hover:border-honey-400">
            自社情報
          </Link>
          <Link href="/issue/payment" className="rounded-lg border border-slate-300 px-4 py-1.5 text-slate-600 hover:border-honey-400">
            決済の設定
          </Link>
        </div>
      </div>
      <div className="mb-6 flex gap-2 text-sm">
        {([["po", "発注書"], ["inv", "請求書"], ["partners", "取引先"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 ${tab === k ? "bg-honey-400 text-hive-900" : "border border-slate-300 text-slate-600"}`}>{label}</button>
        ))}
      </div>

      {tab === "po" && (
        <>
          <div className="mb-3 flex justify-end"><button onClick={addPurchaseOrder} className="rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900">＋ 発注書作成</button></div>
          {docTable(pos, PO_STATUSES, "/api/purchase-orders")}
        </>
      )}
      {tab === "inv" && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              適格請求書（インボイス）に対応しています。作成画面で法定6項目の抜けを自動チェックします。
            </p>
            <Link href="/issue/invoice/new" className="rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900">
              ＋ 請求書作成
            </Link>
          </div>
          {docTable(invs, INV_STATUSES, "/api/invoices", "/issue/invoice")}
        </>
      )}
      {tab === "partners" && (
        <>
          <div className="mb-3 flex justify-end"><button onClick={addPartner} className="rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900">＋ 取引先登録</button></div>
          <div className="rounded-xl border border-slate-200 bg-white">
            {partners.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">取引先がありません</div>}
            {partners.map((p) => (
              <div key={p.id} className="border-b border-slate-100 px-4 py-3 text-sm last:border-0">
                <span className="font-medium">{p.name}</span>
                {p.email && <span className="ml-3 text-slate-400">{p.email}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
