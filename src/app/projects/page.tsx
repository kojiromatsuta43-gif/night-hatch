"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { STATUSES, Status, Project } from "@/lib/data";
import { PointInline, useMascot } from "@/components/MascotProvider";

const STATUS_COLOR: Record<Status, string> = {
  "未公開": "bg-slate-200 text-slate-700",
  "募集中": "bg-honey-100 text-honey-700",
  "制作待ち": "bg-amber-100 text-amber-700",
  "フィードバック": "bg-orange-100 text-orange-700",
  "完了": "bg-emerald-100 text-emerald-700",
};

export default function ProjectsPage() {
  const { mascot } = useMascot();
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<"board" | "table">("board");

  const counts = useMemo(
    () => Object.fromEntries(STATUSES.map((s) => [s, projects.filter((p) => p.status === s).length])) as Record<Status, number>,
    [projects]
  );

  const load = useCallback(() => {
    api<Project[]>("/api/projects").then(setProjects).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const move = async (id: string, status: Status) => {
    await api(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">案件一覧</h1>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button onClick={() => setView("board")} className={`px-4 py-1.5 ${view === "board" ? "bg-honey-400 text-hive-900" : "bg-white text-slate-600"}`}>ボード</button>
          <button onClick={() => setView("table")} className={`px-4 py-1.5 ${view === "table" ? "bg-honey-400 text-hive-900" : "bg-white text-slate-600"}`}>テーブル</button>
        </div>
      </div>

      {/* ステータス別の件数。注意が必要な列は色をつける */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const n = counts[s];
          const alert = (s === "制作待ち" || s === "フィードバック") && n > 0;
          return (
            <span
              key={s}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm ${
                alert ? "border-honey-400 bg-honey-50" : "border-slate-200 bg-white"
              }`}
            >
              <span className={alert ? "font-semibold text-hive-900" : "text-slate-600"}>{s}</span>
              <span className={`font-bold tabular-nums ${n === 0 ? "text-slate-300" : "text-hive-900"}`}>{n}</span>
            </span>
          );
        })}
        <span className="ml-auto flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-sm text-slate-600">
          合計 <b className="tabular-nums text-hive-900">{projects.length}</b>
        </span>
      </div>

      {view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {STATUSES.map((status) => {
            const items = projects.filter((p) => p.status === status);
            return (
              <div key={status} className="rounded-xl bg-slate-100 p-3 min-h-40">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="text-sm font-semibold">{status}</span>
                  <span className="rounded-full bg-white px-2 text-xs text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-honey-400">
                      <Link href={`/projects/${p.id}`} className="block">
                        <div className="text-sm font-medium leading-snug hover:text-honey-700">{p.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{p.category}</div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{p.points}<PointInline /></span>
                          <span>納期 {p.deadline.slice(5).replace("-", "/")}</span>
                        </div>
                      </Link>
                      <select
                        value={p.status}
                        onChange={(e) => move(p.id, e.target.value as Status)}
                        className="mt-2 w-full rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-600"
                      >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
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
                <th className="px-4 py-3 font-medium text-right">{mascot.pointName}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[p.status]}`}>{p.status}</span></td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/projects/${p.id}`} className="hover:text-honey-700 hover:underline">{p.title}</Link>
                  </td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{p.requested_on || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{p.deadline}</td>
                  <td className="px-4 py-3 text-right">{p.points}<PointInline /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
