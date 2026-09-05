"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Illust from "@/components/Illust";
import { api } from "@/lib/client";
import { STATUSES, Status, Project } from "@/lib/data";
import { PointInline, useMascot } from "@/components/MascotProvider";
import { useMe } from "@/components/AppShell";
import HoneyCells, { fillOf } from "@/components/HoneyCells";

/** 状態の言い換え。発注した人の目線で「次に何をすればいいか」が分かる言葉にする */
const STATE_LABEL: Record<Status, string> = {
  "未公開": "下書き",
  "募集中": "担当を待っています",
  "制作待ち": "制作中",
  "フィードバック": "初稿の確認待ち",
  "完了": "納品ずみ",
};
const STATE_STYLE: Record<Status, string> = {
  "未公開": "border-dashed border-hive-500 bg-white text-hive-500",
  "募集中": "border-dashed border-food-200 bg-white text-hive-900",
  "制作待ち": "border-food-200 bg-white text-hive-900",
  "フィードバック": "border-food-200 bg-food-500 text-white",
  "完了": "border-food-200 bg-hive-900 text-honey-300",
};

function daysUntil(deadline: string) {
  const d = new Date(deadline + "T00:00:00").getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today.getTime()) / 86400000);
}
const md = (iso: string) => iso.slice(5).replace("-", "/");

export default function ProjectsPage() {
  const { mascot } = useMascot();
  const { me } = useMe();
  const [projects, setProjects] = useState<(Project & { revise_count?: number; await_count?: number })[]>([]);
  const [view, setView] = useState<"list" | "board">("board");
  const isFreelancer = me?.role === "freelancer";

  const load = useCallback(() => {
    api<(Project & { revise_count?: number; await_count?: number })[]>("/api/projects").then(setProjects).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const isAdmin = me?.role === "admin";
  const move = async (id: string, status: Status, current: Status) => {
    if (!isAdmin) {
      if (STATUSES.indexOf(status) <= STATUSES.indexOf(current)) return;
      if (!confirm(`「${status}」に進めます。ステータスは戻せませんが、よろしいですか？`)) return;
    }
    await api(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  };

  // 今日やること
  const todo = useMemo(() => {
    const review = projects.filter((p) => p.status === "フィードバック");
    const soon = projects.filter((p) => p.status !== "完了" && p.status !== "未公開" && daysUntil(p.deadline) <= 3);
    const waiting = projects.filter((p) => p.status === "募集中");
    return { review, soon, waiting };
  }, [projects]);

  // 進んでいるものから順に。完了は最後
  const sorted = useMemo(
    () => [...projects].sort((a, b) => {
      const fa = fillOf(a.status), fb = fillOf(b.status);
      if ((fa === 5) !== (fb === 5)) return fa === 5 ? 1 : -1;
      if (fb !== fa) return fb - fa;
      return a.deadline.localeCompare(b.deadline);
    }),
    [projects]
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl text-hive-900">{isFreelancer ? "担当している仕事" : "頼んだもの"}</h1><p className="page-sub">{isFreelancer ? "いま手元にある仕事と、修正のお願いです。" : "頼んだものが、いまどこまで進んでいるか。届いたら「確認する」を押してください。"}</p></div>
        <div className="flex rounded-xl border border-food-200 text-sm font-bold">
          <button onClick={() => setView("board")} className={`px-4 py-1.5 ${view === "board" ? "bg-food-500 text-white" : "bg-white text-hive-500"}`}>ボード</button>
          <button onClick={() => setView("list")} className={`px-4 py-1.5 ${view === "list" ? "bg-food-500 text-white" : "bg-white text-hive-500"}`}>一覧</button>
        </div>
      </div>

      {/* 今日やること */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className={`flex flex-col gap-1 rounded-2xl border border-food-200 px-5 py-4 ${todo.review.length > 0 ? "bg-food-500 text-white" : "bg-white text-hive-900"}`}>
          <span className="text-[11px] font-bold tracking-widest opacity-80">{isFreelancer ? "返事を待っている" : "今日やること"}</span>
          <span className="text-2xl font-black">
            {isFreelancer ? "フィードバック待ち" : "確認待ち"}が {todo.review.length}件
          </span>
          <span className="text-sm opacity-85">
            {todo.review.length > 0
              ? isFreelancer
                ? "初稿を出した案件です。返事が来たら修正に進みます。"
                : "初稿が届いています。見てフィードバックを返すと、はちみつがもう1セル溜まります。"
              : "確認するものはありません。"}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-food-200 bg-white px-5 py-4">
          <span className="text-[11px] font-bold tracking-widest text-hive-500">納期が近い（3日以内）</span>
          <span className="text-2xl font-black text-hive-900">{todo.soon.length}件</span>
          <span className="truncate text-sm text-hive-500">
            {todo.soon[0] ? `${todo.soon[0].title}（${md(todo.soon[0].deadline)}）` : "急ぎのものはありません"}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-food-200 bg-white px-5 py-4">
          <span className="text-[11px] font-bold tracking-widest text-hive-500">{isFreelancer ? "受注できる案件" : "担当を待っている"}</span>
          <span className="text-2xl font-black text-hive-900">{todo.waiting.length}件</span>
          <span className="text-sm text-hive-500">
            {isFreelancer ? <Link href="/jobs" className="font-bold text-food-700 hover:underline">お仕事をさがす →</Link> : todo.waiting.length > 0 ? "フリーランスに通知済み。決まると制作に進みます" : "すべて担当が決まっています"}
          </span>
        </div>
      </div>

      {view === "list" ? (
        <section>
          <div className="mb-2 flex flex-wrap items-baseline gap-3">
            <h2 className="text-lg font-black text-hive-900">すすんでいる案件</h2>
            <span className="text-xs text-hive-500">セルが5つ満ちたら納品。募集 → 制作 → 初稿 → 修正 → 完了</span>
          </div>
          <div className="hidden grid-cols-[150px_minmax(0,1fr)_110px_170px] gap-5 px-5 pb-1 text-[11px] font-bold text-hive-500 md:grid">
            <span>はちみつ</span><span>案件</span><span>納期</span><span>いまの状態</span>
          </div>
          <div className="space-y-2">
            {sorted.map((p) => {
              const days = daysUntil(p.deadline);
              const done = p.status === "完了";
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className={`grid items-center gap-3 border-2 bg-white px-5 py-3.5 transition-colors hover:bg-food-50 md:grid-cols-[150px_minmax(0,1fr)_110px_170px] md:gap-5 ${
                    done ? "border-hive-200" : "border-food-200"
                  }`}
                >
                  <HoneyCells status={p.status} size={26} />
                  <span className="min-w-0">
                    <span className={`block truncate text-[15px] font-bold ${done ? "text-hive-500" : "text-hive-900"}`}>
                      {p.title}
                      {isFreelancer && (p.revise_count ?? 0) > 0 && (
                        <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">修正依頼 {p.revise_count}件</span>
                      )}
                      {!isFreelancer && (p.await_count ?? 0) > 0 && (
                        <span className="ml-2 rounded-full bg-food-500 px-2 py-0.5 text-[10px] font-bold text-white">検収待ち {p.await_count}件</span>
                      )}
                    </span>
                    <span className="block text-xs text-hive-500">
                      {p.category} ・ {p.points}<PointInline />
                    </span>
                  </span>
                  <span className={`text-sm ${!done && days < 0 ? "font-bold text-rose-600" : !done && days <= 3 ? "font-bold text-food-700" : done ? "text-hive-500" : "text-hive-900"}`}>
                    {!done && days < 0 ? `${-days}日超過 ` : !done && days === 0 ? "今日 " : !done && days === 1 ? "明日 " : ""}
                    {md(p.deadline)}
                  </span>
                  <span className={`inline-flex h-7 w-fit items-center border-2 px-2.5 text-xs font-bold ${STATE_STYLE[p.status]}`}>
                    {STATE_LABEL[p.status]}
                  </span>
                </Link>
              );
            })}
            {projects.length === 0 && (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-food-300 bg-white px-5 py-10 text-center">
                <Illust name="empty" className="h-24 w-24" />
                <p className="mt-2 font-display text-lg text-hive-900">まだ何も頼んでいません</p>
                <p className="mt-1 text-sm text-hive-500">{isFreelancer ? "「お仕事をさがす」から受けられます。" : "お品書きから頼むと、ここに並びます。"}</p>
                {!isFreelancer && <Link href="/order" className="mt-4 rounded-full bg-food-500 px-5 py-2 text-sm font-bold text-white hover:bg-food-600">お品書きを見る</Link>}
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-5">
          {STATUSES.map((status) => {
            const items = projects.filter((p) => p.status === status);
            return (
              <div key={status} className="min-h-40 rounded-xl border border-food-200 bg-white p-3">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="text-sm font-black text-hive-900">{status}</span>
                  <span className="bg-hive-900 px-1.5 text-xs font-bold text-honey-300">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <div key={p.id} className="border-2 border-hive-200 bg-white p-3 transition-colors hover:border-food-200">
                      <Link href={`/projects/${p.id}`} className="block">
                        <HoneyCells status={p.status} size={18} className="mb-2" />
                        <div className="text-sm font-bold leading-snug text-hive-900 hover:text-food-700">{p.title}</div>
                        {isFreelancer && (p.revise_count ?? 0) > 0 && (
                          <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">修正依頼 {p.revise_count}件</span>
                        )}
                        {!isFreelancer && (p.await_count ?? 0) > 0 && (
                          <span className="mt-1 inline-block rounded-full bg-food-500 px-2 py-0.5 text-[10px] font-bold text-white">検収待ち {p.await_count}件</span>
                        )}
                        <div className="mt-1 text-xs text-hive-500">{p.category}</div>
                        <div className="mt-2 flex items-center justify-between text-xs text-hive-500">
                          <span>{p.points}<PointInline /></span>
                          <span>納期 {md(p.deadline)}</span>
                        </div>
                      </Link>
                      <select
                        value={p.status}
                        onChange={(e) => move(p.id, e.target.value as Status, p.status)}
                        className="mt-2 w-full border border-hive-200 px-1 py-0.5 text-xs text-hive-500"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} disabled={!isAdmin && STATUSES.indexOf(s) < STATUSES.indexOf(p.status)}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {items.length === 0 && <div className="px-1 py-4 text-center text-xs text-hive-500">なし</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-hive-500">{mascot.pointName}の数字は、その案件で使った分です。</p>
    </div>
  );
}
