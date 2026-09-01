"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { Project } from "@/lib/data";
import { PointInline, useMascot } from "@/components/MascotProvider";

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
  const isFreelancer = me?.role === "freelancer";
  // 制作側は「作業中」「提出済み」が知りたい。発注側は「募集中」が知りたい
  const inProgress = projects.filter((p) => p.status === "制作待ち");
  const submitted = projects.filter((p) => p.status === "フィードバック");
  const spotlight = isFreelancer ? inProgress : open;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {(isFreelancer
          ? [
              { label: "作業中", value: `${inProgress.length}件` },
              { label: "提出済み・確認待ち", value: `${submitted.length}件` },
              { label: "完了した仕事", value: `${done.length}件` },
            ]
          : [
              { label: "完了", value: `${done.length}件` },
              { label: "進行中", value: `${active.length}件` },
              { label: `残り${mascot.pointName}`, value: <>{me?.points ?? 0}<PointInline /></> },
            ]
        ).map((s) => (
          <div key={s.label} className="border-[3px] border-hive-900 bg-white p-5">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="mt-1 text-3xl font-black text-hive-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{isFreelancer ? "作業中の仕事" : "募集中の案件"}</h2>
        <Link
          href={isFreelancer ? "/jobs" : "/order"}
          className="rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900 hover:bg-honey-300"
        >
          {isFreelancer ? "お仕事をさがす →" : "＋ 新規案件を登録"}
        </Link>
      </div>
      <div className="overflow-x-auto border-2 border-hive-900 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">案件名</th>
              <th className="px-4 py-3 font-medium">カテゴリ</th>
              <th className="px-4 py-3 font-medium">納期</th>
              {!isFreelancer && <th className="px-4 py-3 font-medium text-right">{mascot.pointName}</th>}
            </tr>
          </thead>
          <tbody>
            {spotlight.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  {isFreelancer ? "作業中の仕事はありません。「お仕事をさがす」から受注できます。" : "募集中の案件はありません"}
                </td>
              </tr>
            )}
            {spotlight.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium"><Link href={`/projects/${p.id}`} className="hover:text-honey-700 hover:underline">{p.title}</Link></td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{p.deadline}</td>
                {!isFreelancer && <td className="px-4 py-3 text-right">{p.points}<PointInline /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
