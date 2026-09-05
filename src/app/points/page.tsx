"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { PointInline, PointMark, useMascot } from "@/components/MascotProvider";
import { POINT_PACKS, POINT_UNIT_PRICE, PLANS, priceExclTax, priceInclTax, yen } from "@/lib/points";

type Tx = { id: string; amount: number; kind: string; memo: string; created_at: string };
type Expiring = { remaining: number; memo: string; expires_at: string };
type Subscription = { id: string; category: string; base_title: string; points: number; last_month: string };

const PACK_NOTE: Record<number, string> = {
  10: "ショート動画 1本ぶん",
  50: "ショート動画 5本ぶん",
  100: "ショート動画 10本ぶん",
};

function PointsInner() {
  const { mascot } = useMascot();
  const { me, refresh } = useMe();
  const search = useSearchParams();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [expiring, setExpiring] = useState<Expiring[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [planActive, setPlanActive] = useState(false);
  const [busy, setBusy] = useState(0);
  const [planBusy, setPlanBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<{ transactions: Tx[]; expiring: Expiring[]; planActive: boolean }>("/api/points")
      .then((r) => { setTxs(r.transactions); setExpiring(r.expiring ?? []); setPlanActive(Boolean(r.planActive)); })
      .catch(() => {});
    api<{ subscriptions: Subscription[] }>("/api/subscriptions")
      .then((r) => setSubs(r.subscriptions ?? []))
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  // 戻ってきた直後は、Webhookの反映を待ってから残高を取り直す
  useEffect(() => {
    if (search.get("paid") !== "1" && search.get("plan_paid") !== "1") return;
    const timers = [1000, 3000, 6000].map((ms) => setTimeout(() => { refresh(); load(); }, ms));
    return () => timers.forEach(clearTimeout);
  }, [search, refresh, load]);

  const subscribe = async (planId: string) => {
    if (planBusy) return;
    setPlanBusy(planId);
    setError("");
    try {
      const res = await api<{ url: string }>("/api/plans/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });
      window.location.assign(res.url);
    } catch (e) {
      setPlanBusy("");
      setError(e instanceof Error ? e.message : "決済画面を開けませんでした");
    }
  };

  const buy = async (points: number) => {
    if (busy) return;
    setBusy(points);
    setError("");
    try {
      const res = await api<{ url: string }>("/api/points/checkout", {
        method: "POST",
        body: JSON.stringify({ points }),
      });
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "決済画面を開けませんでした");
      setBusy(0);
    }
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
          <div className="text-4xl font-bold text-honey-600">{me?.points ?? 0}</div>
        </div>
      </div>

      {search.get("paid") === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <b>お支払いありがとうございました。</b>
          <div className="mt-1 text-emerald-700">
            残高への反映は数秒かかることがあります。反映されない場合はページを再読み込みしてください。
          </div>
        </div>
      )}
      {search.get("plan_paid") === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <b>プランのお申込みありがとうございました。</b>
          <div className="mt-1 text-emerald-700">
            契約の反映と今月分の{mascot.pointName}付与まで数秒かかることがあります。
          </div>
        </div>
      )}
      {expiring.length > 0 && (
        <div className="mb-6 rounded-xl border border-food-400 bg-food-50 px-4 py-3 text-sm text-hive-900">
          <b>まもなく繰越期限を迎える{mascot.pointName}があります。</b>
          <ul className="mt-1 space-y-0.5 text-xs">
            {expiring.map((e, i) => (
              <li key={i}>{e.remaining}<PointInline /> … {e.expires_at} に失効（{e.memo}）</li>
            ))}
          </ul>
        </div>
      )}
      {search.get("canceled") === "1" && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          お支払いは完了していません。もう一度お試しいただけます。
        </div>
      )}

      <h2 className="mb-1 text-lg font-semibold">月額プランと{mascot.pointName}</h2>
      <p className="mb-3 text-xs text-slate-500">
        定価は 1<PointInline />＝{yen(POINT_UNIT_PRICE)}（税別）。月額プランは定価換算に増量分が付き、上のプランほど1<PointInline />が安くなります。
        ショート動画は編集10<PointInline />・台本10<PointInline />・サムネ5<PointInline />です。
      </p>
      <div className="mb-8 max-w-2xl overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="whitespace-nowrap px-4 py-2">プラン</th>
              <th className="whitespace-nowrap px-4 py-2 text-right">月額（税別）</th>
              <th className="whitespace-nowrap px-4 py-2 text-right">毎月の{mascot.pointName}</th>
              <th className="whitespace-nowrap px-4 py-2 text-right">実質単価</th>
              <th className="whitespace-nowrap px-4 py-2 text-right">繰越</th>
              {me?.role === "client" && <th className="whitespace-nowrap px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {PLANS.map((pl) => {
              const mine = me?.plan === pl.id;
              return (
                <tr key={pl.id} className={`border-b border-slate-100 last:border-0 ${mine ? "bg-food-50" : ""}`}>
                  <td className="whitespace-nowrap px-4 py-2 font-bold">
                    <span className="inline-flex items-center gap-2">
                      {pl.name}
                      {mine && (
                        <span className="rounded bg-food-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {planActive ? "契約中" : "ご利用中"}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{yen(pl.monthly)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                    {pl.points}<PointInline />
                    {pl.bonus > 0 && <span className="ml-1 text-[11px] text-food-700">+{pl.bonus}%増量</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{yen(Math.round(pl.monthly / pl.points))}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">{pl.carryMonths}ヶ月</td>
                  {me?.role === "client" && (
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {mine && planActive ? (
                        <span className="text-xs text-slate-400">契約中</span>
                      ) : (
                        <button
                          onClick={() => subscribe(pl.id)}
                          disabled={planBusy !== ""}
                          className="rounded-lg bg-hive-900 px-3 py-1.5 text-xs font-bold text-honey-400 hover:bg-hive-800 disabled:opacity-40"
                        >
                          {planBusy === pl.id ? "移動中..." : "申込む"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-1 text-lg font-semibold">{mascot.pointName}を追加で買う</h2>
      <p className="mb-4 text-xs text-slate-500">
        月額プランのポイントが足りなくなったときに、必要な分だけ買い足せます。
        追加購入は定価（1<PointInline />あたり {yen(POINT_UNIT_PRICE)}・税別）です。
      </p>

      <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {POINT_PACKS.map((p) => (
          <div key={p} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-center">
            <div className="text-3xl font-bold text-honey-600">
              {p}<PointInline />
            </div>
            <div className="mt-0.5 text-xs text-slate-400">{PACK_NOTE[p] ?? ""}</div>
            <div className="mt-3 text-xl font-bold tabular-nums">{yen(priceInclTax(p))}</div>
            <div className="text-[11px] text-slate-400">
              税込（本体 {yen(priceExclTax(p))}）
            </div>
            <button
              onClick={() => buy(p)}
              disabled={busy !== 0}
              className="mt-4 w-full rounded-lg bg-food-500 py-2.5 text-sm font-bold text-white hover:bg-food-600 disabled:opacity-40"
            >
              {busy === p ? "決済画面へ移動しています..." : "購入する"}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      )}

      <p className="mb-10 text-[11px] leading-relaxed text-slate-400">
        お支払いはクレジットカード（Stripe）です。ボタンを押すとStripeの決済画面に移動します。
        カード情報がこのシステムに保存されることはありません。
        お支払いが確認できしだい、自動で残高に反映されます。
      </p>

      {subs.length > 0 && (
        <>
          <h2 className="mb-1 text-lg font-semibold">毎月の継続メニュー</h2>
          <p className="mb-3 text-xs text-slate-500">
            月が変わると自動で1か月ぶんが発注され、{mascot.pointName}が使われます。停止はいつでもできます。
          </p>
          <div className="mb-10 rounded-xl border border-slate-200 bg-white">
            {subs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0">
                <div className="min-w-0">
                  <div className="truncate font-medium">{sub.base_title}</div>
                  <div className="text-xs text-slate-400">{sub.category} ・ 毎月{sub.points}<PointInline /> ・ 直近 {sub.last_month}</div>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`「${sub.base_title}」の自動継続を停止しますか？（今月分までで止まります）`)) return;
                    await api(`/api/subscriptions?id=${sub.id}`, { method: "DELETE" });
                    load();
                  }}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:border-rose-400 hover:text-rose-600"
                >
                  停止する
                </button>
              </div>
            ))}
          </div>
        </>
      )}

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
              {t.amount > 0 ? "+" : ""}{t.amount}<PointInline />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PointsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">読み込み中...</div>}>
      <PointsInner />
    </Suspense>
  );
}
