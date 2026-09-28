"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { InvoiceItem, Rounding, lineAmount, summarize } from "@/lib/invoice";

type Issuer = {
  company_name: string;
  registration_no: string;
  postal_code: string;
  address: string;
  tel: string;
  bank_name: string;
  branch_name: string;
  account_type: string;
  account_no: string;
  account_holder: string;
  seal_upload_id: string | null;
  rounding: string;
};

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
  items: (InvoiceItem & { id: string })[];
};

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;
const jpDate = (v?: string | null) => {
  if (!v) return "";
  const [y, m, d] = v.slice(0, 10).split("-");
  if (!y || !m || !d) return v;
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
};

export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [issuer, setIssuer] = useState<Issuer | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      api<Issuer>("/api/issuer"),
      api<Invoice>(`/api/invoices/${id}`),
    ])
      .then(([is, inv]) => {
        setIssuer(is);
        setInvoice(inv);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  if (loading) return <div className="p-10 text-sm text-slate-500">読み込み中…</div>;
  if (error || !invoice) {
    return (
      <div className="p-10 text-sm text-rose-600">
        {error || "請求書が見つかりません"}
        <div className="mt-4">
          <Link href="/issue" className="text-night-700 underline">請求・支払いに戻る</Link>
        </div>
      </div>
    );
  }

  const rounding = (issuer?.rounding ?? "切り捨て") as Rounding;
  const { groups, subtotal, taxTotal, total } = summarize(invoice.items, rounding);
  const hasReduced = invoice.items.some((i) => Number(i.tax_rate) === 8);
  const rateLabel = (rate: number) => (rate === 0 ? "非課税・対象外" : `${rate}%`);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      {/* 画面だけに出る操作バー（印刷では消える） */}
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <Link href={`/issue/invoice/${id}`} className="text-sm text-slate-600 hover:text-night-700">
          ← 編集に戻る
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            プレビューでA4・PDF保存もこのボタンから
          </span>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-night-500 px-4 py-2 text-sm font-semibold text-white hover:bg-night-600"
          >
            印刷 / PDFで保存
          </button>
        </div>
      </div>

      <div className="invoice-sheet paper mx-auto bg-white text-slate-900 shadow-sm print:shadow-none">
        <h1 className="text-center text-2xl font-bold tracking-[0.4em]">請求書</h1>
        <p className="mt-1 text-center text-[10px] tracking-widest text-slate-500">
          適格請求書（インボイス）
        </p>

        <div className="mt-6 flex items-start justify-between gap-8">
          {/* 交付を受ける者 */}
          <div className="flex-1">
            <div className="border-b-2 border-slate-800 pb-1 text-lg font-semibold">
              {invoice.partner_name || "（請求先未入力）"} <span className="text-sm">御中</span>
            </div>
            {invoice.partner_address ? (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                {invoice.partner_address}
              </p>
            ) : null}
            <p className="mt-6 text-sm">下記のとおりご請求申し上げます。</p>
            <div className="mt-3 inline-flex items-end gap-3 border-b-2 border-slate-800 pb-1">
              <span className="text-xs text-slate-500">ご請求金額</span>
              <span className="text-2xl font-bold">{yen(total)}</span>
              <span className="text-[10px] text-slate-500">（税込）</span>
            </div>
          </div>

          {/* 発行者 */}
          <div className="relative w-[74mm] shrink-0 text-xs leading-relaxed">
            <table className="mb-3 w-full">
              <tbody>
                <tr>
                  <td className="py-0.5 pr-2 text-slate-500">請求書番号</td>
                  <td className="py-0.5">{invoice.invoice_no || "—"}</td>
                </tr>
                <tr>
                  <td className="py-0.5 pr-2 text-slate-500">請求日</td>
                  <td className="py-0.5">{jpDate(invoice.issued_on)}</td>
                </tr>
                {invoice.due_on ? (
                  <tr>
                    <td className="py-0.5 pr-2 text-slate-500">お支払期限</td>
                    <td className="py-0.5">{jpDate(invoice.due_on)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <div className="border-t border-slate-300 pt-2">
              <div className="text-sm font-semibold">{issuer?.company_name || "（自社情報未入力）"}</div>
              <div className="mt-1 text-slate-600">
                {issuer?.postal_code ? <div>〒{issuer.postal_code}</div> : null}
                {issuer?.address ? <div className="whitespace-pre-line">{issuer.address}</div> : null}
                {issuer?.tel ? <div>TEL {issuer.tel}</div> : null}
              </div>
              <div className="mt-2 font-medium">
                登録番号　{issuer?.registration_no || "（未登録）"}
              </div>
            </div>

            {issuer?.seal_upload_id ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/uploads/${issuer.seal_upload_id}`}
                alt="印影"
                className="absolute right-0 bottom-0 h-[20mm] w-[20mm] object-contain opacity-90"
              />
            ) : null}
          </div>
        </div>

        {invoice.title ? (
          <p className="mt-6 text-sm">
            <span className="text-slate-500">件名：</span>
            {invoice.title}
          </p>
        ) : null}

        {/* 明細 */}
        <table className="mt-3 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1.5 text-left">品目</th>
              <th className="border border-slate-300 px-2 py-1.5 text-center w-[22mm]">提供日</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right w-[14mm]">数量</th>
              <th className="border border-slate-300 px-2 py-1.5 text-center w-[12mm]">単位</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right w-[22mm]">単価</th>
              <th className="border border-slate-300 px-2 py-1.5 text-center w-[16mm]">税率</th>
              <th className="border border-slate-300 px-2 py-1.5 text-right w-[26mm]">金額</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={it.id ?? i}>
                <td className="border border-slate-300 px-2 py-1.5">
                  {Number(it.tax_rate) === 8 ? <span className="mr-1">※</span> : null}
                  {it.name}
                  {it.note ? <span className="ml-2 text-[10px] text-slate-500">{it.note}</span> : null}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center">
                  {it.delivered_on ? it.delivered_on.slice(5).replace("-", "/") : ""}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{it.quantity}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-center">{it.unit}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{yen(Number(it.unit_price) || 0)}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-center">{rateLabel(Number(it.tax_rate))}</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{yen(lineAmount(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {hasReduced ? (
          <p className="mt-1 text-[10px] text-slate-600">※は軽減税率（8%）対象品目です。</p>
        ) : null}

        {/* 税率区分ごとの集計 */}
        <div className="mt-4 flex items-start justify-between gap-8">
          <div className="flex-1 text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1.5 text-left">区分</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right">対象金額（税抜）</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right">消費税額</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.rate}>
                    <td className="border border-slate-300 px-2 py-1.5">
                      {g.rate === 0 ? "非課税・対象外" : `${g.rate}%対象${g.rate === 8 ? "（軽減税率）" : ""}`}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{yen(g.base)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">
                      {g.rate === 0 ? "—" : yen(g.tax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[10px] text-slate-500">
              消費税額の端数処理は「{rounding}」で、税率区分ごとに1回だけ行っています。
            </p>
          </div>

          <table className="w-[74mm] shrink-0 border-collapse text-xs">
            <tbody>
              <tr>
                <td className="border border-slate-300 bg-slate-50 px-2 py-1.5">小計（税抜）</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{yen(subtotal)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 bg-slate-50 px-2 py-1.5">消費税</td>
                <td className="border border-slate-300 px-2 py-1.5 text-right">{yen(taxTotal)}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 bg-slate-800 px-2 py-2 font-semibold text-white">
                  合計（税込）
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right text-base font-bold">{yen(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 振込先・備考 */}
        <div className="mt-6 flex items-start gap-8 text-xs">
          <div className="w-[90mm] rounded border border-slate-300 p-3">
            <div className="mb-1 font-semibold">お振込先</div>
            {issuer?.bank_name ? (
              <div className="leading-relaxed text-slate-700">
                <div>
                  {issuer.bank_name} {issuer.branch_name}
                </div>
                <div>
                  {issuer.account_type} {issuer.account_no}
                </div>
                <div>{issuer.account_holder}</div>
              </div>
            ) : (
              <div className="text-slate-400">（自社情報で振込先を登録してください）</div>
            )}
            <p className="mt-2 text-[10px] text-slate-500">
              恐れ入りますが、振込手数料は御社にてご負担をお願いいたします。
            </p>
            {invoice.payment_url ? (
              <div className="mt-3 border-t border-slate-200 pt-2">
                <div className="mb-0.5 font-semibold">カードでのお支払い</div>
                <div className="break-all text-[10px] leading-snug text-slate-600">{invoice.payment_url}</div>
              </div>
            ) : null}
          </div>
          {invoice.note ? (
            <div className="flex-1">
              <div className="mb-1 font-semibold">備考</div>
              <p className="whitespace-pre-line leading-relaxed text-slate-700">{invoice.note}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
