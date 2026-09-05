"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { isValidRegistrationNo } from "@/lib/invoice";
import FileDrop, { UploadedFile } from "@/components/FileDrop";

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

const EMPTY: Issuer = {
  company_name: "", registration_no: "", postal_code: "", address: "", tel: "",
  bank_name: "", branch_name: "", account_type: "普通", account_no: "",
  account_holder: "", seal_upload_id: null, rounding: "切り捨て",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-food-500 focus:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-hive-900">{label}</span>
      {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
      {children}
    </label>
  );
}

export default function IssuerPage() {
  const [v, setV] = useState<Issuer>(EMPTY);
  const [seal, setSeal] = useState<UploadedFile[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const set = <K extends keyof Issuer>(k: K, val: Issuer[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setSaved(false);
  };

  const load = useCallback(() => {
    api<Issuer>("/api/issuer")
      .then((d) => setV({ ...EMPTY, ...d }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    await api("/api/issuer", {
      method: "PUT",
      body: JSON.stringify({ ...v, seal_upload_id: seal[0]?.id ?? v.seal_upload_id }),
    });
    setSeal([]);
    setSaved(true);
    load();
  };

  const regOk = isValidRegistrationNo(v.registration_no);

  if (loading) return <div className="text-sm text-slate-400">読み込み中...</div>;

  return (
    <div className="max-w-3xl">
      <Link href="/issue" className="text-sm text-slate-500 hover:text-slate-700">← 発注書・請求書</Link>
      <h1 className="mt-1 mb-1 text-2xl font-bold">自社情報</h1>
      <p className="mb-6 text-sm text-slate-500">
        インボイス（適格請求書）の発行に必要な情報です。一度入れておけば、以降の請求書に自動で印字されます。
      </p>

      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-hive-900">発行者の情報</h2>
        <div className="grid gap-4">
          <Field label="会社名・屋号" hint="必須">
            <input value={v.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputClass} placeholder="株式会社ブリッジハッチ" />
          </Field>
          <Field label="適格請求書発行事業者 登録番号" hint="必須・T＋数字13桁">
            <input
              value={v.registration_no}
              onChange={(e) => set("registration_no", e.target.value.toUpperCase().replace(/\s/g, ""))}
              className={`${inputClass} ${v.registration_no && !regOk ? "border-rose-400" : ""}`}
              placeholder="T1234567890123"
            />
            {v.registration_no && !regOk ? (
              <span className="mt-1 block text-xs text-rose-600">
                形式が違います。「T」のあとに数字13桁です（法人の場合はT＋法人番号）。
              </span>
            ) : (
              <span className="mt-1 block text-xs text-slate-400">
                国税庁の「適格請求書発行事業者公表サイト」で自社の番号を確認できます。
              </span>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
            <Field label="郵便番号"><input value={v.postal_code} onChange={(e) => set("postal_code", e.target.value)} className={inputClass} placeholder="810-0001" /></Field>
            <Field label="住所"><input value={v.address} onChange={(e) => set("address", e.target.value)} className={inputClass} placeholder="福岡県福岡市中央区天神1-1-1" /></Field>
          </div>
          <Field label="電話番号"><input value={v.tel} onChange={(e) => set("tel", e.target.value)} className={inputClass} placeholder="092-000-0000" /></Field>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-bold text-hive-900">振込先</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="金融機関名"><input value={v.bank_name} onChange={(e) => set("bank_name", e.target.value)} className={inputClass} placeholder="福岡銀行" /></Field>
          <Field label="支店名"><input value={v.branch_name} onChange={(e) => set("branch_name", e.target.value)} className={inputClass} placeholder="天神支店" /></Field>
          <Field label="種別">
            <select value={v.account_type} onChange={(e) => set("account_type", e.target.value)} className={inputClass}>
              {["普通", "当座"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="口座番号"><input value={v.account_no} onChange={(e) => set("account_no", e.target.value)} className={inputClass} placeholder="1234567" /></Field>
          <div className="sm:col-span-2">
            <Field label="口座名義"><input value={v.account_holder} onChange={(e) => set("account_holder", e.target.value)} className={inputClass} placeholder="カ）ブリッジハッチ" /></Field>
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-bold text-hive-900">社印・角印（任意）</h2>
        <p className="mb-3 text-xs text-slate-500">
          登録すると請求書の会社名の横に印字されます。背景が透過したPNGがきれいに出ます。
        </p>
        {v.seal_upload_id && seal.length === 0 && (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
            登録済み:
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/uploads/${v.seal_upload_id}`} alt="印影" className="h-16 w-16 object-contain" />
            <button onClick={() => set("seal_upload_id", null)} className="text-rose-500 hover:underline">外す</button>
          </div>
        )}
        <FileDrop label="印影の画像" hint="PNG推奨・1ファイル" accept="image/*" value={seal} onChange={setSeal} />
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-bold text-hive-900">消費税の端数処理</h2>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          インボイス制度では、端数処理は<b className="text-hive-900">1つの請求書につき、税率ごとに1回だけ</b>と決まっています
          （明細1行ずつ処理して足し上げるのは認められません）。どちらに寄せるかを選んでください。
        </p>
        <div className="flex flex-wrap gap-2">
          {["切り捨て", "切り上げ", "四捨五入"].map((r) => (
            <button
              key={r}
              onClick={() => set("rounding", r)}
              className={`rounded-full border px-4 py-1.5 text-sm ${v.rounding === r ? "border-food-500 bg-food-500 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-food-400"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} className="rounded-lg bg-food-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-food-600">
          保存する
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">保存しました</span>}
      </div>
    </div>
  );
}
