"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import AiUsage from "@/components/AiUsage";

type Fact = { label: string; value: string };
type Profile = {
  id: string; name: string; facts: string; stances: string; ng_items: string; notes: string; updated_at: string;
};

export default function BrandProfilePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Profile[]>("/api/brand-profiles").then(setProfiles).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    const name = window.prompt("プロファイル名（例: 採用動画用）");
    if (!name) return;
    const res = await api<{ id: string }>("/api/brand-profiles", { method: "POST", body: JSON.stringify({ name }) });
    load();
    setEditingId(res.id);
  };

  const editing = profiles.find((p) => p.id === editingId);
  if (editing) return <Editor profile={editing} onBack={() => { setEditingId(null); load(); }} />;

  return (
    <div className="max-w-3xl">
      <div className="mb-2 flex items-center justify-between">
        <div><h1 className="text-2xl">うちの店のこと</h1><p className="page-sub">店の売りや雰囲気を覚えさせておくと、台本や投稿文が「うちの店らしく」なります。</p></div>
        <button onClick={create} className="rounded-lg bg-night-500 px-4 py-2 text-sm font-medium text-white hover:bg-night-600">＋ 新規作成</button>
      </div>
      <p className="mb-3 text-sm text-slate-500">台本生成時に参照される「情報の単一情報源」。確定情報はAIが改変しません。用途ごとに複数作れます。</p>
      <div className="mb-6"><AiUsage /></div>
      <div className="space-y-2">
        {profiles.map((p) => (
          <button key={p.id} onClick={() => setEditingId(p.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-night-400">
            <div>
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="text-xs text-slate-400">更新 {p.updated_at.slice(0, 16)}</div>
            </div>
            <span className="text-slate-300">›</span>
          </button>
        ))}
        {profiles.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">プロファイルがありません</div>
        )}
      </div>
    </div>
  );
}

function Editor({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const [name, setName] = useState(profile.name);
  const [facts, setFacts] = useState<Fact[]>(JSON.parse(profile.facts));
  const [stances, setStances] = useState<string[]>(JSON.parse(profile.stances));
  const [ngItems, setNgItems] = useState<string[]>(JSON.parse(profile.ng_items));
  const [notes, setNotes] = useState(profile.notes);
  const [sourceText, setSourceText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    await api(`/api/brand-profiles/${profile.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, facts, stances, ng_items: ngItems, notes }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const extract = async () => {
    if (!sourceText.trim()) return;
    setExtracting(true);
    setError("");
    try {
      const res = await api<{ facts: Fact[]; stances: string[]; ng_items: string[]; notes: string }>(
        "/api/brand-profiles/extract",
        { method: "POST", body: JSON.stringify({ text: sourceText }) }
      );
      setFacts((f) => [...f, ...res.facts]);
      setStances((s) => [...s, ...res.stances]);
      setNgItems((n) => [...n, ...res.ng_items]);
      if (res.notes) setNotes((n) => (n ? n + "\n" : "") + res.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "抽出に失敗しました");
    } finally {
      setExtracting(false);
    }
  };

  const listEditor = (
    title: string, desc: string, items: string[], setItems: (v: string[]) => void, placeholder: string
  ) => (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mb-3 text-xs text-slate-500">{desc}</p>
      {items.map((item, i) => (
        <div key={i} className="mb-2 flex gap-2">
          <input value={item} onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-slate-300 hover:text-rose-500">✕</button>
        </div>
      ))}
      <button onClick={() => setItems([...items, ""])} className="text-xs text-night-700 hover:underline">＋ {placeholder}</button>
    </section>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">← 一覧へ戻る</button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-emerald-600">✓ 保存しました</span>}
          <button onClick={save} className="rounded-lg bg-night-500 px-4 py-2 text-sm font-medium text-white hover:bg-night-600">保存</button>
        </div>
      </div>

      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-bold" />

      <section className="rounded-xl border border-night-200 bg-night-50/50 p-5">
        <h3 className="text-sm font-bold">資料からAIで下書きを抽出</h3>
        <p className="mb-3 text-xs text-slate-500">会社概要・パンフレットなどのテキストを貼り付けると、AIが下の各欄に振り分けます。</p>
        <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={4} placeholder="ここに資料のテキストを貼り付け" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={extract} disabled={extracting || !sourceText.trim()} className="mt-2 rounded-lg bg-night-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          {extracting ? "抽出中..." : "AIで下書きを抽出"}
        </button>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold">① 確定情報（変えてはいけない事実）</h3>
        <p className="mb-3 text-xs text-slate-500">価格・住所・実績数値など。AIが台本でそのまま使い、勝手に変えません。</p>
        {facts.map((f, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input value={f.label} placeholder="項目名" onChange={(e) => setFacts(facts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="w-36 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <input value={f.value} placeholder="値" onChange={(e) => setFacts(facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <button onClick={() => setFacts(facts.filter((_, j) => j !== i))} className="text-slate-300 hover:text-rose-500">✕</button>
          </div>
        ))}
        <button onClick={() => setFacts([...facts, { label: "", value: "" }])} className="text-xs text-night-700 hover:underline">＋ 確定情報を追加</button>
      </section>

      {listEditor("② スタンス（自社の立場）", "意見が割れるテーマの方針。AIが一般論で上書きしません。", stances, setStances, "スタンスを追加")}
      {listEditor("③ NG事項（禁止）", "避けたい表現・規制。台本生成で参照されます。", ngItems, setNgItems, "NG事項を追加")}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-2 text-sm font-bold">④ 補足（自由メモ）</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </section>
    </div>
  );
}
