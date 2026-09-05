"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";

type Company = {
  id: number;
  source: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  form_url: string | null;
  website: string | null;
  industry_l: string | null;
  industry_s: string | null;
  employees: number | null;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  ceo: string | null;
  capital: string | null;
  revenue: string | null;
};
type Facet = { v: string; n: number };
type Res =
  | { ready: false; phase: string }
  | {
      ready: true;
      items: Company[];
      total: number;
      page: number;
      perPage: number;
      facets: { prefectures: Facet[]; industries: Facet[]; sources: Facet[]; withPhone: number; withEmail: number; withForm: number };
    };

const box = "rounded rounded-xl border border-food-200 bg-white";
const input = "rounded rounded-xl border border-food-200 px-2 py-1 text-sm bg-white";
const btn = "rounded rounded-xl border border-food-200 px-3 py-1 text-sm font-bold";
const btnY = `${btn} bg-food-500 text-white hover:bg-food-600 disabled:opacity-40`;
const btnW = `${btn} bg-white text-hive-900 hover:bg-food-50 disabled:opacity-40`;

/** 企業DB（775万社）から条件で探して営業リストに追加する */
export default function CompanySearch({ onAdded, isAdmin }: { onAdded: () => void; isAdmin: boolean }) {
  const [q, setQ] = useState("");
  const [prefs, setPrefs] = useState<string[]>([]);
  const [inds, setInds] = useState<string[]>([]);
  const [indS, setIndS] = useState("");
  const [empMin, setEmpMin] = useState("");
  const [empMax, setEmpMax] = useState("");
  const [phone, setPhone] = useState(true);
  const [email, setEmail] = useState(false);
  const [form, setForm] = useState(false);
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [limit, setLimit] = useState("500");
  const [msg, setMsg] = useState("");
  const [allFacets, setAllFacets] = useState<{ prefectures: Facet[]; industries: Facet[]; sources: Facet[] } | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (prefs.length) p.set("pref", prefs.join("|"));
    if (inds.length) p.set("industry", inds.join("|"));
    if (indS) p.set("industryS", indS);
    if (empMin) p.set("empMin", empMin);
    if (empMax) p.set("empMax", empMax);
    if (phone) p.set("phone", "1");
    if (email) p.set("email", "1");
    if (form) p.set("form", "1");
    if (source) p.set("source", source);
    p.set("page", String(page));
    return p.toString();
  }, [q, prefs, inds, indS, empMin, empMax, phone, email, form, source, page]);

  const load = useCallback(() => {
    setBusy(true);
    api<Res>(`/api/companies?${query}`)
      .then((r) => {
        setRes(r);
        setSelected(new Set());
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "検索に失敗しました"))
      .finally(() => setBusy(false));
  }, [query]);
  // 入力が落ち着いてから検索（775万件なので連打しない）
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);
  // 選択肢用に全体の内訳を一度だけ取る
  useEffect(() => {
    api<Res>("/api/companies?perPage=10").then((r) => { if (r.ready) setAllFacets(r.facets); }).catch(() => {});
  }, []);

  const toggleIn = (list: string[], set: (v: string[]) => void, v: string) => {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    setPage(1);
  };

  const add = async (body: Record<string, unknown>, label: string) => {
    if (!window.confirm(`${label}を営業リストに追加しますか？（同じ電話番号の会社は飛ばします）`)) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ added: number; skipped: number }>("/api/companies/add", { method: "POST", body: JSON.stringify(body) });
      setMsg(`${r.added}社を営業リストに追加しました${r.skipped ? `（重複 ${r.skipped}社は飛ばしました）` : ""}`);
      setSelected(new Set());
      onAdded();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "追加できませんでした");
    } finally {
      setBusy(false);
    }
  };

  if (res && !res.ready) {
    return (
      <div className={`${box} p-6 text-sm text-slate-600`}>
        企業DBはまだ準備できていません（状態: {res.phase}）。
        {isAdmin ? "管理画面の「企業DB」から Parquet を取り込んでください。" : "管理者が取り込むと、ここから775万社を条件で探せるようになります。"}
      </div>
    );
  }

  const total = res?.ready ? res.total : 0;
  const pages = res?.ready ? Math.max(1, Math.ceil(res.total / res.perPage)) : 1;
  const items = res?.ready ? res.items : [];
  const prefOptions = allFacets?.prefectures ?? [];
  const indOptions = allFacets?.industries ?? [];
  const lim = Math.min(5000, Math.max(1, Number(limit) || 1));

  return (
    <div>
      <div className={`${box} mb-3 p-3`}>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            会社名・代表者・住所
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className={`${input} block w-52`} placeholder="キーワード" />
          </label>
          <label className="text-xs">
            都道府県を追加
            <select value="" onChange={(e) => e.target.value && toggleIn(prefs, setPrefs, e.target.value)} className={`${input} block`}>
              <option value="">選ぶ…</option>
              {prefOptions.map((f) => <option key={f.v} value={f.v}>{f.v}（{f.n.toLocaleString()}）</option>)}
            </select>
          </label>
          <label className="text-xs">
            業界を追加
            <select value="" onChange={(e) => e.target.value && toggleIn(inds, setInds, e.target.value)} className={`${input} block max-w-56`}>
              <option value="">選ぶ…</option>
              {indOptions.map((f) => <option key={f.v} value={f.v}>{f.v}（{f.n.toLocaleString()}）</option>)}
            </select>
          </label>
          <label className="text-xs">
            小業界（部分一致）
            <input value={indS} onChange={(e) => { setIndS(e.target.value); setPage(1); }} className={`${input} block w-36`} placeholder="例: 飲食店" />
          </label>
          <label className="text-xs">
            従業員数
            <div className="flex items-center gap-1">
              <input value={empMin} onChange={(e) => { setEmpMin(e.target.value); setPage(1); }} inputMode="numeric" placeholder="下限" className={`${input} w-16`} />
              〜
              <input value={empMax} onChange={(e) => { setEmpMax(e.target.value); setPage(1); }} inputMode="numeric" placeholder="上限" className={`${input} w-16`} />
            </div>
          </label>
          <label className="text-xs">
            出典
            <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className={`${input} block`}>
              <option value="">すべて</option>
              {(allFacets?.sources ?? []).map((f) => <option key={f.v} value={f.v}>{f.v}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-3 text-xs pb-1">
            <label className="flex items-center gap-1"><input type="checkbox" checked={phone} onChange={(e) => { setPhone(e.target.checked); setPage(1); }} />電話あり</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={email} onChange={(e) => { setEmail(e.target.checked); setPage(1); }} />メールあり</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={form} onChange={(e) => { setForm(e.target.checked); setPage(1); }} />フォームあり</label>
          </div>
        </div>
        {(prefs.length > 0 || inds.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {prefs.map((v) => <button key={v} onClick={() => toggleIn(prefs, setPrefs, v)} className="rounded rounded-xl border border-food-200 bg-food-100 px-2 py-0.5">{v} ×</button>)}
            {inds.map((v) => <button key={v} onClick={() => toggleIn(inds, setInds, v)} className="rounded rounded-xl border border-food-200 bg-food-100 px-2 py-0.5">{v} ×</button>)}
            <button onClick={() => { setPrefs([]); setInds([]); setPage(1); }} className="underline">すべて外す</button>
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded rounded-xl border border-food-200 bg-food-50 px-3 py-2 text-sm">
        <span className="font-bold">{busy ? "検索中…" : `${total.toLocaleString()} 社`}</span>
        {res?.ready && (
          <span className="text-xs text-slate-600">
            電話 {res.facets.withPhone.toLocaleString()} ・ メール {res.facets.withEmail.toLocaleString()} ・ フォーム {res.facets.withForm.toLocaleString()}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs">
          先頭
          <input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" className={`${input} w-20`} />
          社を
        </span>
        <button onClick={() => add({ filter: query, limit: lim }, `この条件の先頭 ${lim.toLocaleString()} 社`)} disabled={busy || total === 0} className={btnY}>
          営業リストに追加
        </button>
        {selected.size > 0 && (
          <button onClick={() => add({ ids: [...selected] }, `選んだ ${selected.size} 社`)} disabled={busy} className={btnW}>
            選んだ {selected.size} 社を追加
          </button>
        )}
      </div>
      {msg && <div className="mb-3 text-sm text-slate-700">{msg}</div>}

      <div className={`${box} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-food-200 text-left text-xs text-slate-500">
              <th className="px-2 py-2">
                <input type="checkbox" checked={items.length > 0 && items.every((c) => selected.has(c.id))} onChange={() => setSelected(items.every((c) => selected.has(c.id)) ? new Set() : new Set(items.map((c) => c.id)))} />
              </th>
              <th className="px-2 py-2">会社名 / 代表者</th>
              <th className="px-2 py-2">電話・メール</th>
              <th className="px-2 py-2">所在地</th>
              <th className="px-2 py-2">業界</th>
              <th className="px-2 py-2">規模</th>
              <th className="px-2 py-2">出典</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !busy && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">条件に合う会社がありません</td></tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="border-b border-slate-200">
                <td className="px-2 py-2 align-top">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.ceo}{c.website && <> ・ <a href={c.website} target="_blank" rel="noreferrer" className="underline">HP</a></>}{c.form_url && <> ・ <a href={c.form_url} target="_blank" rel="noreferrer" className="underline">フォーム</a></>}</div>
                </td>
                <td className="px-2 py-2 align-top text-xs whitespace-nowrap">
                  <div>{c.phone ?? <span className="text-slate-400">—</span>}</div>
                  <div className="text-slate-500">{c.email}</div>
                </td>
                <td className="px-2 py-2 align-top text-xs">{c.prefecture}{c.city}</td>
                <td className="px-2 py-2 align-top text-xs">{c.industry_l}{c.industry_s && <div className="text-slate-500">{c.industry_s}</div>}</td>
                <td className="px-2 py-2 align-top text-xs whitespace-nowrap">{c.employees ? `${c.employees}人` : ""}{c.capital && <div className="text-slate-500">{c.capital}</div>}</td>
                <td className="px-2 py-2 align-top text-xs text-slate-500">{c.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btnW}>前へ</button>
          <span>{page} / {pages.toLocaleString()}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={btnW}>次へ</button>
        </div>
      )}
    </div>
  );
}
