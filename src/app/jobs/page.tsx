"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Mascot } from "@/components/MascotProvider";

type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  deadline: string;
  requested_on: string;
  owner_name: string;
  nominated: number;
};

function daysLeft(deadline: string) {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round(
    (new Date(deadline + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = useCallback(() => {
    api<Job[]>("/api/jobs")
      .then((d) => { setJobs(d); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const claim = async (job: Job) => {
    if (busyId) return;
    if (!confirm(`「${job.title}」を受けます。よろしいですか？\n受注すると、あなたが担当者になります。`)) return;
    setBusyId(job.id);
    setError("");
    try {
      await api(`/api/jobs/${job.id}`, { method: "POST" });
      setDone(job.title);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "受注できませんでした");
      load();
    } finally {
      setBusyId("");
    }
  };

  const nominated = jobs.filter((j) => j.nominated);
  const open = jobs.filter((j) => !j.nominated);

  const card = (j: Job) => {
    const left = daysLeft(j.deadline);
    return (
      <div key={j.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {j.nominated ? (
                <span className="rounded-full bg-honey-400 px-2.5 py-0.5 text-xs font-bold text-hive-900">
                  あなたに指名
                </span>
              ) : null}
              <h3 className="font-bold text-hive-900">{j.title}</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {j.category} ／ {j.owner_name}さん
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              left < 0
                ? "bg-rose-100 text-rose-700"
                : left <= 5
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            納期 {j.deadline}
            {left >= 0 ? `（あと${left}日）` : `（${-left}日超過）`}
          </span>
        </div>

        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{j.description}</p>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => claim(j)}
            disabled={busyId === j.id}
            className="rounded-lg bg-honey-400 px-5 py-2 text-sm font-bold text-hive-900 transition-colors hover:bg-honey-300 disabled:opacity-40"
          >
            {busyId === j.id ? "受注中..." : "この仕事を受ける"}
          </button>
          <Link href={`/projects/${j.id}`} className="text-sm text-slate-500 hover:text-honey-600">
            詳しく見る →
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-start gap-3">
        <Mascot className="h-12 w-12 shrink-0" />
        <div className="relative rounded-2xl border border-honey-200 bg-white px-4 py-3 shadow-sm">
          <span className="absolute -left-2 top-4 h-4 w-4 rotate-45 border-b border-l border-honey-200 bg-white" />
          <p className="text-sm font-medium text-hive-900">お仕事をさがしましょう！</p>
          <p className="mt-1 text-xs text-slate-500">
            受けたい仕事の「この仕事を受ける」を押すと、あなたが担当者になります。一度お取引した企業からは、次回以降あなたを指名できるようになります。
          </p>
        </div>
      </div>

      {done && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          「{done}」を受注しました。
          <Link href="/projects" className="ml-2 font-semibold underline">担当案件を見る</Link>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      )}

      {loading && <div className="text-sm text-slate-400">読み込み中...</div>}

      {!loading && nominated.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-hive-900">
            あなたへの指名
            <span className="ml-2 text-sm font-normal text-slate-400">{nominated.length}件</span>
          </h2>
          <div className="space-y-3">{nominated.map(card)}</div>
        </section>
      )}

      {!loading && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-hive-900">
            募集中の仕事
            <span className="ml-2 text-sm font-normal text-slate-400">{open.length}件</span>
          </h2>
          {open.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
              いま募集中の仕事はありません。新しい依頼が入るとここに並びます。
            </div>
          ) : (
            <div className="space-y-3">{open.map(card)}</div>
          )}
        </section>
      )}
    </div>
  );
}
