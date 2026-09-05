"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_VIDEO_CATEGORY } from "@/lib/data";
import { marked } from "marked";
import { api } from "@/lib/client";
import ClientOnly from "@/components/ClientOnly";

type Script = { id: string; title: string; content: string; favorite: number; created_at: string };

function ScriptsPageInner() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "fav">("all");

  const load = useCallback(() => {
    api<Script[]>("/api/scripts").then(setScripts).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const list = filter === "fav" ? scripts.filter((s) => s.favorite) : scripts;
  const open = scripts.find((s) => s.id === openId);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl">台本ノート</h1>
      <p className="page-sub mb-4">ハッチと作った動画の台本を、ここに取っておけます。</p>
      <p className="mb-6 text-sm text-slate-500">AIエージェントで作成した台本の一覧です。</p>
      <div className="mb-4 flex gap-2 text-sm">
        <button onClick={() => setFilter("all")} className={`rounded-full px-4 py-1.5 ${filter === "all" ? "bg-food-500 text-white" : "border border-slate-300 text-slate-600"}`}>すべて ({scripts.length})</button>
        <button onClick={() => setFilter("fav")} className={`rounded-full px-4 py-1.5 ${filter === "fav" ? "bg-food-500 text-white" : "border border-slate-300 text-slate-600"}`}>お気に入り ({scripts.filter((s) => s.favorite).length})</button>
      </div>
      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          まだ台本がありません。AIエージェントで作成して保存しましょう。
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setOpenId(s.id)} className="text-left text-sm font-semibold hover:text-food-700">{s.title}</button>
              <button
                onClick={async () => { await api(`/api/scripts/${s.id}`, { method: "PATCH", body: JSON.stringify({ favorite: !s.favorite }) }); load(); }}
                className={s.favorite ? "text-amber-400" : "text-slate-300"}
              >★</button>
            </div>
            <p className="mt-1 line-clamp-3 text-xs text-slate-500 whitespace-pre-wrap">{s.content.slice(0, 150)}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{s.created_at.slice(0, 10)}</span>
              <button onClick={async () => { if (confirm("削除しますか？")) { await api(`/api/scripts/${s.id}`, { method: "DELETE" }); load(); } }} className="hover:text-rose-500">削除</button>
            </div>
            <Link
              href={`/order/create?category=${encodeURIComponent(DEFAULT_VIDEO_CATEGORY)}&script=${s.id}`}
              className="mt-3 block rounded-lg bg-food-500 py-2 text-center text-xs font-semibold text-white hover:bg-food-600"
            >
              🐝 この台本で動画編集を発注する →
            </Link>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setOpenId(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{open.title}</h2>
              <button onClick={() => setOpenId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="prose prose-sm prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: marked.parse(open.content) as string }} />
            <Link
              href={`/order/create?category=${encodeURIComponent(DEFAULT_VIDEO_CATEGORY)}&script=${open.id}`}
              className="mt-5 block rounded-lg bg-food-500 py-2.5 text-center text-sm font-semibold text-white hover:bg-food-600"
            >
              🐝 この台本で動画編集を発注する →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScriptsPage() {
  return (
    <ClientOnly>
      <ScriptsPageInner />
    </ClientOnly>
  );
}
