"use client";

import { useState } from "react";
import { STATUSES, Status } from "@/lib/data";
import { useProjects } from "@/lib/store";

const STATUS_COLOR: Record<Status, string> = {
  "未公開": "bg-slate-200 text-slate-700",
  "募集中": "bg-indigo-100 text-indigo-700",
  "制作待ち": "bg-amber-100 text-amber-700",
  "フィードバック": "bg-orange-100 text-orange-700",
  "完了": "bg-emerald-100 text-emerald-700",
};

export default function ProjectsPage() {
  const { projects, move } = useProjects();
  const [view, setView] = useState<"board" | "table">("board");
  const list = projects ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">案件一覧</h1>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button
            onClick={() => setView("board")}
            className={`px-4 py-1.5 ${view === "board" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}
          >
            ボード
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-4 py-1.5 ${view === "table" ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}
          >
            テーブル
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 text-sm">
        {STATUSES.map((s) => (
          <div key={s} className="text-slate-500">
            {s} <span className="font-bold text-slate-900">{list.filter((p) => p.status === s).length}</span>
          </div>
        ))}
      </div>

      {view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {STATUSES.map((status) => {
            const items = list.filter((p) => p.status === status);
            return (
              <div key={status} className="rounded-xl bg-slate-100 p-3 min-h-40">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="text-sm font-semibold">{status}</span>
                  <span className="rounded-full bg-white px-2 text-xs text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-sm font-medium leading-snug">{p.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{p.category}</div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{p.points}pt</span>
                        <span>納期 {p.deadline.slice(5).replace("-", "/")}</span>
                      </div>
                      <select
                        value={p.status}
                        onChange={(e) => move(p.id, e.target.value as Status)}
                        className="mt-2 w-full rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-600"
                      >
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {items.length === 0 && <div className="px-1 py-4 text-center text-xs text-slate-400">案件がありません</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">ステータス</th>
                <th className="px-4 py-3 font-medium">案件名</th>
                <th className="px-4 py-3 font-medium">カテゴリ</th>
                <th className="px-4 py-3 font-medium">依頼日</th>
                <th className="px-4 py-3 font-medium">納期</th>
                <th className="px-4 py-3 font-medium text-right">ポイント</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3">{p.createdAt}</td>
                  <td className="px-4 py-3">{p.deadline}</td>
                  <td className="px-4 py-3 text-right">{p.points}pt</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
