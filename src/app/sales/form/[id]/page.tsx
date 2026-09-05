"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { Mascot } from "@/components/MascotProvider";
import CampaignForm, { type Sender } from "@/components/sales/FormCampaignForm";
import LeadCsvImport from "@/components/sales/LeadCsvImport";

type Campaign = {
  id: string; name: string; mode: string; status: string; sender_id: string; subject_text: string; template_text: string; ai_instruction: string;
  daily_limit: number; send_window_start: number; send_window_end: number; weekdays_only: number; sent_count: number; charged_points: number;
};
type Job = { id: number; lead_id: string | null; company_name: string; form_url: string; domain: string; industry: string; is_test: number; status: string; result_text: string; sent_at: string | null; updated_at: string; attempts: number };
type Detail = { campaign: Campaign; sender: Sender | null; counts: Record<string, number>; jobs: Job[]; running: boolean; windowOk: boolean; sentToday: number; statusLabel: Record<string, string>; workerEnabled: boolean };
type JobDetail = Job & { message_used: string; site_url: string; hasShot: boolean };
type Facet = { v: string; n: number };

const box = "rounded rounded-xl border border-food-200 bg-white";
const input = "rounded rounded-xl border border-food-200 px-2 py-1 text-sm bg-white";
const btn = "rounded rounded-xl border border-food-200 px-3 py-1 text-sm font-bold";
const btnY = `${btn} bg-food-500 text-white hover:bg-food-600 disabled:opacity-50`;
const btnW = `${btn} bg-white text-hive-900 hover:bg-food-50 disabled:opacity-50`;
const STATUS_JA: Record<string, string> = { draft: "準備中", running: "実行中", paused: "一時停止", done: "完了" };

function tagClass(s: string) {
  if (s === "sent") return "bg-emerald-100 text-emerald-800";
  if (s === "failed") return "bg-rose-100 text-rose-700";
  if (s === "queued") return "bg-food-100 text-hive-900";
  if (s === "sending") return "bg-sky-100 text-sky-800";
  return "bg-violet-100 text-violet-800";
}

export default function FormCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<{ company: string; industry: string; subject: string; message: string; aiUsed: boolean } | null>(null);
  const [openJob, setOpenJob] = useState<JobDetail | null>(null);
  const [testUrl, setTestUrl] = useState("");
  const [testCompany, setTestCompany] = useState("テスト株式会社");
  const [ignoreWindow, setIgnoreWindow] = useState(false);
  const [facets, setFacets] = useState<{ industries: Facet[]; prefectures: Facet[] }>({ industries: [], prefectures: [] });
  const [addIndustry, setAddIndustry] = useState("");
  const [addPref, setAddPref] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const load = useCallback(() => {
    api<Detail>(`/api/sales/form/campaigns/${id}`).then(setD).catch((e) => setMsg(e instanceof Error ? e.message : "読み込めませんでした"));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    api<Sender[]>("/api/sales/form/senders").then(setSenders).catch(() => {});
    api<{ facets: { industries: Facet[]; prefectures: Facet[] } }>("/api/sales/leads?page=1").then((r) => setFacets(r.facets)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!d?.running) return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [d?.running, load]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setMsg("");
    try {
      await fn();
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "失敗しました");
    } finally {
      setBusy("");
    }
  };
  const openJobDetail = (jid: number) => api<JobDetail>(`/api/sales/form/jobs/${jid}`).then(setOpenJob).catch(() => {});

  if (!d) return <div className="text-sm text-slate-500">{msg || "読み込み中..."}</div>;
  const c = d.campaign;
  const cnt = (s: string) => d.counts[s] ?? 0;
  const total = Object.values(d.counts).reduce((a, b) => a + b, 0);
  const skipped = cnt("skip_no_form") + cnt("skip_refused") + cnt("skip_captcha") + cnt("skip_suppressed") + cnt("skip_duplicate");

  return (
    <div className="max-w-6xl">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Mascot className={`h-12 w-12 shrink-0 ${d.running ? "animate-bee-float" : ""}`} />
          <div>
            <h1 className="text-2xl font-bold">
              {c.name}
              <span className={`ml-2 align-middle rounded px-2 py-0.5 text-xs font-bold ${d.running ? "bg-sky-100 text-sky-800" : "bg-food-100"}`}>{d.running ? "ハッチが送信中" : STATUS_JA[c.status] ?? c.status}</span>
            </h1>
            <p className="text-xs text-slate-500">
              差出人: {d.sender ? `${d.sender.company} ${d.sender.person}` : "—"} ／ 文面: {c.mode === "hybrid" ? "ハイブリッド" : c.mode === "ai" ? "全文AI" : "テンプレ"} ／ {c.send_window_start}〜{c.send_window_end}時{c.weekdays_only ? "（平日）" : ""} ／ 1日 {c.daily_limit}件まで（本日 {d.sentToday}件）
              {!d.windowOk && <b className="ml-1 text-amber-700">いまは送信時間帯外</b>}
              {me?.role !== "admin" && c.charged_points > 0 && ` ／ 消費 ${c.charged_points}🍯`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing((v) => !v)} className={btnW} disabled={d.running}>{editing ? "閉じる" : "設定を変更"}</button>
          <Link href="/sales/form" className={btnW}>← 一覧</Link>
        </div>
      </div>
      {msg && <div className="mb-3 rounded rounded-xl border border-food-200 bg-food-50 px-3 py-2 text-sm">{msg}</div>}
      {editing && (
        <CampaignForm senders={senders} defaults={{ template_text: c.template_text, subject_text: c.subject_text }} initial={c as unknown as Record<string, unknown>} onDone={() => { setEditing(false); load(); }} />
      )}

      {/* 件数 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[["全件", total, ""], ["待機", cnt("queued"), ""], ["送信済", cnt("sent"), "text-emerald-700"], ["失敗", cnt("failed"), "text-rose-700"], ["フォーム無し", cnt("skip_no_form"), ""], ["お断り", cnt("skip_refused"), ""], ["CAPTCHA", cnt("skip_captcha"), ""], ["除外・重複", cnt("skip_suppressed") + cnt("skip_duplicate"), ""]].map(([l, v, cls]) => (
          <div key={String(l)} className={`${box} min-w-24 px-3 py-2`}><div className="text-[11px] text-slate-500">{l}</div><div className={`text-xl font-bold ${cls}`}>{v}</div></div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1 リスト追加 */}
        <div className={`${box} p-4`}>
          <div className="mb-1 text-sm font-bold">1. 営業リストから会社を追加</div>
          <p className="mb-2 text-xs text-slate-500">「営業リスト」で会社を選んで「フォーム営業に追加」でも入れられます。問い合わせフォームURLか企業URLのある会社が対象で、除外リスト・90日以内送信済み・官公庁は自動で振り分けます。</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs">業種<select value={addIndustry} onChange={(e) => setAddIndustry(e.target.value)} className={`${input} block`}><option value="">すべて</option>{facets.industries.map((f) => <option key={f.v} value={f.v}>{f.v}（{f.n}）</option>)}</select></label>
            <label className="text-xs">都道府県<select value={addPref} onChange={(e) => setAddPref(e.target.value)} className={`${input} block`}><option value="">すべて</option>{facets.prefectures.map((f) => <option key={f.v} value={f.v}>{f.v}（{f.n}）</option>)}</select></label>
            <button
              disabled={busy !== ""}
              onClick={() => run("add", async () => {
                const r = await api<{ picked: number; added: number; excluded: number; suppressed: number; duplicated: number; noUrl: number }>(`/api/sales/form/campaigns/${id}/leads`, { method: "POST", body: JSON.stringify({ all: true, industry: addIndustry, prefecture: addPref }) });
                setMsg(`${r.picked}社を確認 → 追加 ${r.added} ／ 除外 ${r.excluded + r.suppressed} ／ 重複・90日以内 ${r.duplicated} ／ URL無し ${r.noUrl}`);
              })}
              className={btnY}
            >
              {busy === "add" ? "追加中..." : "条件に合う会社を追加"}
            </button>
            <button onClick={() => setCsvOpen((v) => !v)} className={btnW}>{csvOpen ? "CSVを閉じる" : "CSVから追加"}</button>
          </div>
          {csvOpen && <div className="mt-3"><LeadCsvImport campaignId={id} onDone={() => { setCsvOpen(false); load(); }} /></div>}
        </div>

        {/* 2 文面確認 */}
        <div className={`${box} p-4`}>
          <div className="mb-1 text-sm font-bold">2. 文面を確認</div>
          <p className="mb-2 text-xs text-slate-500">待機中の先頭の会社向けに、実際に送る文面を作って表示します（送信はしません）。</p>
          <button disabled={busy !== ""} onClick={() => run("preview", async () => setPreview(await api(`/api/sales/form/campaigns/${id}/preview`, { method: "POST", body: "{}" })))} className={btnW}>
            {busy === "preview" ? "作成中..." : "先頭の1社でプレビュー"}
          </button>
          {preview && (
            <div className="mt-3">
              <div className="text-xs text-slate-500">{preview.company}（{preview.industry}）向け ・ {preview.aiUsed ? "AI生成あり" : "テンプレのみ"}</div>
              <div className="text-xs"><b>件名:</b> {preview.subject}</div>
              <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-food-50 p-2 text-xs">{preview.message}</pre>
            </div>
          )}
        </div>

        {/* 3 テスト */}
        <div className={`${box} p-4`}>
          <div className="mb-1 text-sm font-bold">3. テスト送信（自社のフォームで動作確認）</div>
          <p className="mb-2 text-xs text-slate-500">まず「入力だけ試す」で、項目が正しく埋まるかスクリーンショットで確認してから、実際に送信してみてください。</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="https://自社サイト/contact/" className={`${input} w-full`} />
            <input value={testCompany} onChange={(e) => setTestCompany(e.target.value)} placeholder="会社名（差し込み確認用）" className={`${input} w-full`} />
          </div>
          <div className="mt-2 flex gap-2">
            {[["dry", "入力だけ試す", btnW], ["send", "実際に送信する", btnY]].map(([k, l, cls]) => (
              <button
                key={k}
                disabled={busy !== "" || !testUrl}
                className={cls}
                onClick={() => run(k, async () => {
                  const r = await api<{ jobId: number; status: string; detail: string }>(`/api/sales/form/campaigns/${id}/test`, { method: "POST", body: JSON.stringify({ url: testUrl, company: testCompany, dry: k === "dry" }) });
                  setMsg(`${k === "dry" ? "入力テスト" : "テスト送信"}: ${d.statusLabel[r.status] ?? r.status} — ${r.detail}`);
                  openJobDetail(r.jobId);
                })}
              >
                {busy === k ? "実行中..." : l}
              </button>
            ))}
          </div>
        </div>

        {/* 4 本送信 */}
        <div className={`${box} p-4`}>
          <div className="mb-1 text-sm font-bold">4. 本送信</div>
          <p className="mb-2 text-xs text-slate-500">送信時間帯・1日の上限を守って、1社ずつ8〜15秒あけて送ります。時間帯外に開始した場合は時間になると自動で始まります。</p>
          {d.running || c.status === "running" ? (
            <button disabled={busy !== ""} onClick={() => run("pause", () => api(`/api/sales/form/campaigns/${id}`, { method: "PATCH", body: JSON.stringify({ action: "pause" }) }))} className={`${btn} bg-white text-rose-600`}>一時停止</button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={busy !== "" || cnt("queued") === 0} onClick={() => run("start", () => api(`/api/sales/form/campaigns/${id}`, { method: "PATCH", body: JSON.stringify({ action: "start", ignoreWindow }) }))} className={btnY}>
                開始する（{cnt("queued")}件）
              </button>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={ignoreWindow} onChange={(e) => setIgnoreWindow(e.target.checked)} />時間帯を無視して今すぐ送る</label>
            </div>
          )}
          {c.status === "done" && <div className="mt-2 text-xs text-emerald-700">完了: {cnt("sent")}件送信・{skipped}件スキップ・{cnt("failed")}件失敗</div>}
          {!d.workerEnabled && <div className="mt-2 text-xs text-amber-700">このサーバーでは送信ワーカーが無効です</div>}
        </div>
      </div>

      {/* 一覧 */}
      <h2 className="mt-6 mb-2 text-base font-bold">送信一覧（最新300件）</h2>
      <div className={`${box} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-food-200 text-left text-xs text-slate-500">
              <th className="px-2 py-2">会社</th><th className="px-2 py-2">業種</th><th className="px-2 py-2">状態</th><th className="px-2 py-2">結果</th><th className="px-2 py-2">送信</th><th></th>
            </tr>
          </thead>
          <tbody>
            {d.jobs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">まだ会社がありません。「1. 営業リストから会社を追加」から始めてください。</td></tr>}
            {d.jobs.map((j) => (
              <tr key={j.id} className="border-b border-slate-200">
                <td className="px-2 py-1.5"><button onClick={() => openJobDetail(j.id)} className="font-bold underline">{j.company_name}</button>{j.is_test ? <span className="ml-1 rounded bg-slate-100 px-1 text-[10px]">test</span> : null}<div className="text-[11px] text-slate-500">{j.domain}</div></td>
                <td className="px-2 py-1.5 text-xs">{j.industry}</td>
                <td className="px-2 py-1.5"><span className={`rounded px-2 py-0.5 text-xs font-bold ${tagClass(j.status)}`}>{d.statusLabel[j.status] ?? j.status}</span></td>
                <td className="px-2 py-1.5 text-xs text-slate-600">{j.result_text}</td>
                <td className="px-2 py-1.5 text-xs text-slate-500">{(j.sent_at ?? "").replace("T", " ").slice(5, 16)}</td>
                <td className="px-2 py-1.5">{(j.status === "failed" || j.status === "skip_no_form") && (
                  <button disabled={busy !== ""} onClick={() => run(`retry${j.id}`, () => api(`/api/sales/form/jobs/${j.id}`, { method: "POST" }))} className={`${btnW} text-xs`}>{busy === `retry${j.id}` ? "..." : "再試行"}</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {me?.role === "admin" && c.status !== "running" && (
        <div className="mt-4 text-right">
          <button onClick={() => run("del", async () => { if (!window.confirm("このキャンペーンを削除しますか？")) return; await api(`/api/sales/form/campaigns/${id}`, { method: "DELETE" }); router.push("/sales/form"); })} className="text-xs text-rose-600 underline">キャンペーンを削除</button>
        </div>
      )}

      {openJob && <JobModal job={openJob} statusLabel={d.statusLabel} onClose={() => setOpenJob(null)} onChanged={() => { load(); openJobDetail(openJob.id); }} />}
    </div>
  );
}

function JobModal({ job, statusLabel, onClose, onChanged }: { job: JobDetail; statusLabel: Record<string, string>; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const suppress = async () => {
    if (!window.confirm(`${job.domain} を除外リストに入れますか？（全キャンペーンで今後送りません）`)) return;
    await api("/api/sales/form/suppressions", { method: "POST", body: JSON.stringify({ domain: job.domain, reason: `手動（${job.company_name}）` }) }).catch(() => {});
  };
  const retry = async () => {
    setBusy(true);
    try { await api(`/api/sales/form/jobs/${job.id}`, { method: "POST" }); onChanged(); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-hive-900/40 p-4" onClick={onClose}>
      <div className={`${box} w-full max-w-5xl p-4`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <div className="text-lg font-bold">{job.company_name} <span className={`ml-1 rounded px-2 py-0.5 text-xs ${tagClass(job.status)}`}>{statusLabel[job.status] ?? job.status}</span></div>
            <div className="text-xs text-slate-500">
              <a href={job.form_url} target="_blank" rel="noreferrer" className="underline">{job.form_url}</a> ／ 試行 {job.attempts}回 ／ 送信 {job.sent_at ?? "—"}
            </div>
          </div>
          <button onClick={onClose} className={btnW}>閉じる</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-bold">結果・ログ</div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-food-50 p-2 text-[11px]">{job.result_text}</pre>
            <div className="mt-2 flex gap-2">
              <button onClick={retry} disabled={busy} className={btnW}>{busy ? "..." : "再試行"}</button>
              <button onClick={suppress} className={`${btn} bg-white text-rose-600`}>このドメインを除外</button>
            </div>
            <div className="mt-3 mb-1 text-xs font-bold">送った文面</div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-food-50 p-2 text-xs">{job.message_used || "（未生成）"}</pre>
          </div>
          <div>
            <div className="mb-1 text-xs font-bold">スクリーンショット</div>
            {job.hasShot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/sales/form/jobs/${job.id}/shot?t=${job.updated_at}`} alt="送信時の画面" className="w-full rounded border border-slate-300" />
            ) : (
              <div className="text-xs text-slate-500">なし</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
