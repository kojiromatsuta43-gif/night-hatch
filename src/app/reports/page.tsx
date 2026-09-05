"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { PointInline, useMascot } from "@/components/MascotProvider";

type Report = {
  month: string;
  user: { name: string; plan: string; planActive: boolean; points: number };
  production: {
    ordered: number;
    submissions: number;
    accepted: number;
    projects: { id: string; title: string; category: string; points: number; status: string }[];
  };
  honey: {
    granted: number;
    spent: number;
    balance: number;
    expiring: { remaining: number; memo: string; expires_at: string }[];
    detail: { memo: string; amount: number; created_at: string }[];
  };
  ai: { chat: number; gen: number };
  videoGrowth: {
    handle: string;
    followers: number;
    monthViews: number;
    videos: { caption: string; url: string; views: number; growth: number; posted_at: string }[];
  } | null;
};

/** 直近12ヶ月の "YYYY-MM" リスト（新しい順） */
function recentMonths(): string[] {
  const out: string[] = [];
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  for (let i = 0; i < 12; i++) {
    out.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  }
  return out;
}

const num = (n: number) => n.toLocaleString();

function ReportsInner() {
  const { me } = useMe();
  const { mascot } = useMascot();
  const search = useSearchParams();
  const months = useMemo(() => recentMonths(), []);
  const [month, setMonth] = useState(() => {
    const q = search.get("month");
    return q && /^\d{4}-\d{2}$/.test(q) ? q : months[0];
  });
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Report>(`/api/reports?month=${month}`)
      .then((r) => { setReport(r); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗しました"));
  }, [month]);
  useEffect(load, [load]);

  const label = (m: string) => `${Number(m.slice(0, 4))}年${Number(m.slice(5))}月`;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl">ふりかえり</h1><p className="page-sub">先月なにを頼んで、動画がどれだけ伸びたか。月のはじめに自動で届きます。</p></div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg rounded-xl border border-food-200 px-3 py-1.5 text-sm font-bold"
        >
          {months.map((m) => <option key={m} value={m}>{label(m)}</option>)}
        </select>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {mascot.name}が毎月まとめる、制作と{mascot.pointName}のふりかえりです。
      </p>

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
      {!report && !error && <div className="mt-6 text-sm text-slate-400">集計中...</div>}

      {report && (
        <>
          {/* サマリー */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["つくった本数（提出）", `${num(report.production.submissions)}本`],
              ["うち検収OK", `${num(report.production.accepted)}本`],
              ["使った" + mascot.pointName, `${num(report.honey.spent)}pt`],
              ["いまの残高", `${num(report.honey.balance)}pt`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-food-200 bg-white px-4 py-3">
                <div className="text-xs text-slate-500">{k}</div>
                <div className="text-2xl font-black text-hive-900">{v}</div>
              </div>
            ))}
          </div>

          {report.honey.expiring.length > 0 && (
            <div className="mt-4 rounded-xl border border-food-400 bg-food-50 px-4 py-3 text-sm text-hive-900">
              <b>まもなく繰越期限を迎える{mascot.pointName}があります。</b>
              <ul className="mt-1 space-y-0.5 text-xs">
                {report.honey.expiring.map((e, i) => (
                  <li key={i}>{e.remaining}<PointInline /> … {e.expires_at} に失効（{e.memo}）</li>
                ))}
              </ul>
            </div>
          )}

          {/* 動画の伸び */}
          <section className="mt-6 rounded-xl border border-food-200 bg-white p-5">
            <h2 className="font-black text-hive-900">動画の伸び</h2>
            {report.videoGrowth ? (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  {report.videoGrowth.handle}（フォロワー {num(report.videoGrowth.followers)}人）・{label(report.month)}の再生数の伸び 合計 <b className="text-hive-900">{num(report.videoGrowth.monthViews)}回</b>
                </p>
                <div className="mt-3 space-y-1.5">
                  {report.videoGrowth.videos.slice(0, 5).map((v, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-6 shrink-0 text-center font-black text-food-700">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {v.url ? <a href={v.url} target="_blank" rel="noreferrer" className="hover:underline">{v.caption || "（キャプションなし）"}</a> : (v.caption || "（キャプションなし）")}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-500">計 {num(v.views)}回</span>
                      {v.growth > 0 && <span className="shrink-0 font-bold tabular-nums text-emerald-600">+{num(v.growth)}</span>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-400">
                TikTokアカウントを紐付けると、ここに再生数の伸びが表示されます。担当までお知らせください。
              </p>
            )}
          </section>

          {/* 今月の案件 */}
          <section className="mt-4 rounded-xl border border-food-200 bg-white p-5">
            <h2 className="font-black text-hive-900">
              {label(report.month)}の案件
              <span className="ml-2 text-sm font-normal text-slate-400">発注 {report.production.ordered}件</span>
            </h2>
            {report.production.projects.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">この月の案件はありません。</p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100">
                {report.production.projects.map((pj) => (
                  <Link key={pj.id} href={`/projects/${pj.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-food-50">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${pj.status === "完了" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{pj.status}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{pj.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{pj.category}</span>
                    <span className="shrink-0 tabular-nums">{pj.points}<PointInline /></span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ハニーPの動き */}
          <section className="mt-4 rounded-xl border border-food-200 bg-white p-5">
            <h2 className="font-black text-hive-900">{mascot.pointName}の動き</h2>
            <p className="mt-1 text-sm text-slate-500">
              付与 <b className="text-emerald-600">+{num(report.honey.granted)}</b> ／ 利用 <b className="text-rose-500">-{num(report.honey.spent)}</b>
              ／ AI利用 会話{num(report.ai.chat)}回・生成{num(report.ai.gen)}回
            </p>
            {report.honey.detail.length > 0 && (
              <div className="mt-2 divide-y divide-slate-100 text-sm">
                {report.honey.detail.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="min-w-0 flex-1 truncate">{t.memo}</span>
                    <span className="ml-3 shrink-0 font-semibold tabular-nums text-rose-500">{t.amount}<PointInline /></span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {me?.role === "client" && !report.user.planActive && (
            <p className="mt-4 text-xs text-slate-400">
              月額プランをご契約いただくと、毎月{mascot.pointName}が自動で付与されます。詳しくは
              <Link href="/points" className="text-food-700 hover:underline">{mascot.pointName}のページ</Link>へ。
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">読み込み中...</div>}>
      <ReportsInner />
    </Suspense>
  );
}
