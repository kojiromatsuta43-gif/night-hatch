"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { Project } from "@/lib/data";
import { useMascot } from "@/components/MascotProvider";

export default function Dashboard() {
  const { mascot } = useMascot();
  const { me } = useMe();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api<Project[]>("/api/projects").then(setProjects).catch(() => {});
  }, []);

  const done = projects.filter((p) => p.status === "完了");
  const active = projects.filter((p) => p.status !== "完了" && p.status !== "未公開");
  const open = projects.filter((p) => p.status === "募集中");

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "完了", value: `${done.length}件` },
          { label: "進行中", value: `${active.length}件` },
          { label: `残り${mascot.pointName}`, value: `${me?.points ?? 0}${mascot.pointEmoji}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="mt-1 text-3xl font-bold text-honey-700">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">募集中の案件</h2>
        <Link href="/order" className="rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900 hover:bg-honey-300">
          ＋ 新規案件を登録
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">案件名</th>
              <th className="px-4 py-3 font-medium">カテゴリ</th>
              <th className="px-4 py-3 font-medium">納期</th>
              <th className="px-4 py-3 font-medium text-right">{mascot.pointName}</th>
            </tr>
          </thead>
          <tbody>
            {open.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">募集中の案件はありません</td></tr>
            )}
            {open.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{p.deadline}</td>
                <td className="px-4 py-3 text-right">{p.points}{mascot.pointEmoji}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
