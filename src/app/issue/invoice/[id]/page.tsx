"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import {
  InvoiceItem,
  Rounding,
  TAX_RATE_OPTIONS,
  TaxRate,
  INVOICE_STATUSES,
  checkRequirements,
  lineAmount,
  summarize,
} from "@/lib/invoice";

type Issuer = {
  company_name: string;
  registration_no: string;
  rounding: string;
  stripe_account_id: string | null;
  stripe_account_name: string | null;
};
type Partner = { id: string; name: string; address?: string };

type Invoice = {
  id: string;
  invoice_no: string;
  title: string;
  status: string;
  issued_on: string;
  due_on: string | null;
  partner_name: string;
  partner_address: string;
  note: string;
  payment_url: string | null;
  paid_at: string | null;
  items: (InvoiceItem & { id: string })[];
};

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-night-500 focus:outline-none";
const cell = "w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-night-500 focus:outline-none";
const yen = (n: number) => `¥${n.toLocaleString()}`;

function emptyItem(): InvoiceItem {
  return { name: "", delivered_on: "", quantity: 1, unit: "式", unit_price: 0, tax_rate: 10, reduced: false, note: "" };
}

export default function InvoiceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();

  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [title, setTitle] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [status, setStatus] = useState("下書き");
  const [issuedOn, setIssuedOn] = useState(new Date().toISOString().slice(0, 10));
  const [dueOn, setDueOn] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerAddress, setPartnerAddress] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Issuer>("/api/issuer").then(setIssuer).catch(() => {});
    api<Partner[]>("/api/partners").then(setPartners).catch(() => {});
    if (isNew) return;
    api<Invoice>(`/api/invoices/${id}`)
      .then((d) => {
        setTitle(d.title); setInvoiceNo(d.invoice_no); setStatus(d.status);
        setIssuedOn(d.issued_on); setDueOn(d.due_on ?? "");
        setPartnerName(d.partner_name); setPartnerAddress(d.partner_address);
        setNote(d.note);
        setPaymentUrl(d.payment_url ?? "");
        setPaidAt(d.paid_at ?? null);
        setItems(d.items.length ? d.items : [emptyItem()]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, [id, isNew]);
  useEffect(load, [load]);

  const rounding = (issuer?.rounding ?? "切り捨て") as Rounding;
  const totals = useMemo(() => summarize(items, rounding), [items, rounding]);

  const checks = useMemo(
    () =>
      checkRequirements({
        issuerName: issuer?.company_name ?? "",
        registrationNo: issuer?.registration_no ?? "",
        issuedOn,
        partnerName,
        items,
      }),
    [issuer, issuedOn, partnerName, items]
  );
  const allOk = checks.every((c) => c.ok);

  const createPaymentLink = async () => {
    if (linkBusy) return;
    setLinkBusy(true);
    setLinkError("");
    try {
      const res = await api<{ url: string }>(`/api/invoices/${id}/checkout`, { method: "POST" });
      setPaymentUrl(res.url);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "支払いリンクを作れませんでした");
    } finally {
      setLinkBusy(false);
    }
  };

  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLinkError("コピーできませんでした。リンクを選択して手動でコピーしてください。");
    }
  };

  const setItem = (i: number, patch: Partial<InvoiceItem>) =>
    setItems((prev) => prev.map((it, n) => (n === i ? { ...it, ...patch } : it)));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    const body = JSON.stringify({
      title, invoice_no: invoiceNo, status, issued_on: issuedOn, due_on: dueOn || null,
      partner_name: partnerName, partner_address: partnerAddress, note, items,
    });
    try {
      if (isNew) {
        const res = await api<{ id: string }>("/api/invoices", { method: "POST", body });
        router.push(`/issue/invoice/${res.id}`);
      } else {
        await api(`/api/invoices/${id}`, { method: "PATCH", body });
        load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-400">読み込み中...</div>;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/issue" className="text-sm text-slate-500 hover:text-slate-700">← 発注書・請求書</Link>
        {!isNew && (
          <Link
            href={`/issue/invoice/${id}/print`}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:border-night-400"
          >
            請求書を表示・印刷 →
          </Link>
        )}
      </div>
      <h1 className="mt-1 mb-1 text-2xl font-bold">{isNew ? "請求書を作成" : "請求書の編集"}</h1>
      <p className="mb-6 text-sm text-slate-500">
        インボイス（適格請求書）の要件を満たすように、税率ごとの合計と消費税額を自動で計算します。
      </p>

      {!issuer?.registration_no && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          登録番号が未設定です。
          <Link href="/issue/issuer" className="mx-1 font-bold underline">自社情報</Link>
          で登録番号を入れないと、適格請求書として発行できません。
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {/* 基本情報 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-hive-900">基本情報</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold">件名</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${input} mt-1`} placeholder="2026年8月分 制作費" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">請求日</span>
                <input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} className={`${input} mt-1`} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">お支払期限</span>
                <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className={`${input} mt-1`} />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold">請求先（会社名）</span>
                <input
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  list="partner-list"
                  className={`${input} mt-1`}
                  placeholder="株式会社〇〇 御中"
                />
                <datalist id="partner-list">
                  {partners.map((p) => <option key={p.id} value={p.name} />)}
                </datalist>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold">請求先の住所</span>
                <input value={partnerAddress} onChange={(e) => setPartnerAddress(e.target.value)} className={`${input} mt-1`} />
              </label>
              {!isNew && (
                <label className="block">
                  <span className="text-sm font-semibold">請求書番号</span>
                  <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={`${input} mt-1`} />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold">状態</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${input} mt-1`}>
                  {INVOICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
          </section>

          {/* 明細 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-hive-900">明細</h2>
              <span className="text-xs text-slate-400">※ が付いた行は軽減税率（8%）の対象です</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="pb-2 pr-2 font-medium">品目</th>
                    <th className="pb-2 pr-2 font-medium">提供日</th>
                    <th className="w-20 pb-2 pr-2 font-medium">数量</th>
                    <th className="w-20 pb-2 pr-2 font-medium">単位</th>
                    <th className="w-28 pb-2 pr-2 font-medium">単価</th>
                    <th className="w-40 pb-2 pr-2 font-medium">税率</th>
                    <th className="w-28 pb-2 pr-2 text-right font-medium">金額</th>
                    <th className="w-8 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-2">
                        <input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} className={cell} placeholder="ショート動画編集" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="date" value={it.delivered_on ?? ""} onChange={(e) => setItem(i, { delivered_on: e.target.value })} className={cell} />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min={0} step="0.1" value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} className={`${cell} text-right`} />
                      </td>
                      <td className="py-2 pr-2">
                        <input value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} className={cell} />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min={0} value={it.unit_price} onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })} className={`${cell} text-right`} />
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          value={String(it.tax_rate)}
                          onChange={(e) => {
                            const rate = Number(e.target.value) as TaxRate;
                            setItem(i, { tax_rate: rate, reduced: rate === 8 });
                          }}
                          className={cell}
                        >
                          {TAX_RATE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-2 text-right font-medium tabular-nums">
                        {yen(lineAmount(it))}
                        {Number(it.tax_rate) === 8 && <span className="ml-1 text-night-700">※</span>}
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => setItems((p) => (p.length === 1 ? [emptyItem()] : p.filter((_, n) => n !== i)))}
                          className="text-slate-300 hover:text-rose-500"
                          aria-label="この行を削除"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setItems((p) => [...p, emptyItem()])}
              className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-night-400 hover:text-night-700"
            >
              ＋ 行を追加
            </button>

            <label className="mt-5 block">
              <span className="text-sm font-semibold">備考</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${input} mt-1 resize-none`} />
            </label>
          </section>
        </div>

        {/* 右側: 集計とチェック */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-hive-900">合計</h2>
            <div className="space-y-2 text-sm">
              {totals.groups.map((g) => (
                <div key={g.rate} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{g.rate === 0 ? "非課税・対象外" : `${g.rate}%対象${g.rate === 8 ? "（※軽減）" : ""}`}</span>
                  </div>
                  <div className="mt-0.5 flex justify-between tabular-nums">
                    <span className="text-slate-600">小計</span>
                    <span className="font-medium">{yen(g.base)}</span>
                  </div>
                  {g.rate !== 0 && (
                    <div className="flex justify-between tabular-nums">
                      <span className="text-slate-600">消費税</span>
                      <span className="font-medium">{yen(g.tax)}</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-2 tabular-nums">
                <span className="text-slate-600">税抜合計</span>
                <span className="font-medium">{yen(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-slate-600">消費税合計</span>
                <span className="font-medium">{yen(totals.taxTotal)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t-2 border-night-400 pt-2">
                <span className="font-bold">ご請求額</span>
                <span className="text-2xl font-bold tabular-nums text-night-700">{yen(totals.total)}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              端数処理は「{rounding}」。税率ごとに1回だけ行っています（インボイス制度の要件）。
            </p>
          </section>

          <section className={`rounded-xl border p-5 ${allOk ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <h2 className="mb-3 text-sm font-bold text-hive-900">
              適格請求書の記載事項
              <span className={`ml-2 ${allOk ? "text-emerald-700" : "text-amber-700"}`}>
                {checks.filter((c) => c.ok).length} / {checks.length}
              </span>
            </h2>
            <div className="space-y-2">
              {checks.map((c) => (
                <div key={c.label} className="flex items-start gap-2 text-xs">
                  <span className={c.ok ? "text-emerald-600" : "text-amber-600"}>{c.ok ? "✓" : "—"}</span>
                  <div className="min-w-0">
                    <div className={c.ok ? "text-slate-600" : "font-medium text-hive-900"}>{c.label}</div>
                    {!c.ok && <div className="text-slate-500">{c.hint}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {!isNew && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-1 text-sm font-bold text-hive-900">お支払いリンク</h2>
              <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
                請求先にこのリンクを送ると、カードでお支払いいただけます。
                <b className="text-hive-900">代金はお客様のStripeへ直接入金され、当社は預かりません。</b>
              </p>

              {paidAt ? (
                <div className="rounded-lg bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
                  <b>入金済みです</b>
                  <div className="mt-1 text-emerald-700">{paidAt} に確認しました</div>
                </div>
              ) : !issuer?.stripe_account_id ? (
                <div className="rounded-lg bg-amber-50 px-3 py-3 text-xs text-amber-800">
                  ご自身のStripeが未連携です。
                  <Link href="/issue/payment" className="ml-1 font-bold underline">決済の設定</Link>
                  から連携すると、ここでリンクを作れるようになります。
                </div>
              ) : paymentUrl ? (
                <div className="space-y-2">
                  <div className="break-all rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    {paymentUrl}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyPaymentLink}
                      className="flex-1 rounded-lg bg-night-500 py-2 text-xs font-bold text-white hover:bg-night-600"
                    >
                      {copied ? "コピーしました" : "リンクをコピー"}
                    </button>
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:border-night-400"
                    >
                      開く
                    </a>
                  </div>
                  <button
                    onClick={createPaymentLink}
                    disabled={linkBusy}
                    className="w-full text-[11px] text-slate-400 hover:text-night-700 disabled:opacity-40"
                  >
                    {linkBusy ? "作り直しています..." : "金額を変えたので作り直す"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={createPaymentLink}
                  disabled={linkBusy || totals.total <= 0}
                  className="w-full rounded-lg bg-night-500 py-2.5 text-xs font-bold text-white hover:bg-night-600 disabled:opacity-40"
                >
                  {linkBusy ? "作成中..." : "お支払いリンクを作る"}
                </button>
              )}

              {linkError && (
                <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-600">{linkError}</div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                金額を変えたあとは、保存してからリンクを作り直してください。古いリンクは元の金額のままです。
              </p>
            </section>
          )}

          {error && <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-lg bg-night-500 py-3 text-sm font-bold text-white hover:bg-night-600 disabled:opacity-40"
          >
            {saving ? "保存中..." : isNew ? "この内容で作成する" : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
