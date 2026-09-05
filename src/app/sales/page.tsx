"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import LeadCsvImport from "@/components/sales/LeadCsvImport";
import CompanySearch from "@/components/sales/CompanySearch";
import SalesAgent from "@/components/sales/SalesAgent";

type Lead = {
  id: string;
  user_id: string;
  company: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  prefecture: string;
  industry: string;
  employees: number | null;
  website: string;
  memo: string;
  status: string;
  project_id: string | null;
  project_title: string | null;
  call_count: number;
  last_called_at: string | null;
  last_result: string;
};
type Facet = { v: string; n: number };
type ListRes = { items: Lead[]; total: number; page: number; perPage: number; facets: { prefectures: Facet[]; industries: Facet[]; statuses: Facet[] } };
type Project = { id: string; title: string; category: string; status: string };
type Call = { id: string; result: string; note: string; called_at: string; caller: string | null };

const STATUSES = ["未着手", "不通", "再架電", "資料送付", "アポ", "成約", "断り", "対象外"];
const RESULTS = ["不通", "受付止まり", "担当者と話せた", "資料送付", "アポ獲得", "断られた"];

const STATUS_STYLE: Record<string, string> = {
  未着手: "bg-slate-100 text-slate-600",
  不通: "bg-slate-200 text-slate-700",
  再架電: "bg-food-100 text-hive-900",
  資料送付: "bg-sky-100 text-sky-800",
  アポ: "bg-food-500 text-white",
  成約: "bg-hive-900 text-honey-300",
  断り: "bg-rose-100 text-rose-700",
  対象外: "bg-slate-100 text-slate-400",
};

const box = "rounded rounded-xl border border-food-200 bg-white";
const input = "rounded rounded-xl border border-food-200 px-2 py-1 text-sm bg-white";
const btn = "rounded rounded-xl border border-food-200 px-3 py-1 text-sm font-bold";
const btnY = `${btn} bg-food-500 text-white hover:bg-food-600`;
const btnW = `${btn} bg-white text-hive-900 hover:bg-food-50`;

function fmtDate(v: string | null) {
  if (!v) return "";
  return v.replace("T", " ").slice(5, 16);
}

export default function SalesPage() {
  return (
    <Suspense fallback={null}>
      <SalesInner />
    </Suspense>
  );
}

function SalesInner() {
  const { me } = useMe();
  const sp = useSearchParams();
  const isFreelancer = me?.role === "freelancer";
  const isAdmin = me?.role === "admin";

  const [q, setQ] = useState("");
  const [pref, setPref] = useState("");
  const [industry, setIndustry] = useState("");
  const [status, setStatus] = useState("");
  const [project, setProject] = useState(sp.get("project") ?? "");
  const [empMin, setEmpMin] = useState("");
  const [empMax, setEmpMax] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListRes | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(sp.get("import") === "1");
  const [msg, setMsg] = useState("");
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [bulkProject, setBulkProject] = useState("");
  const [formCampaigns, setFormCampaigns] = useState<{ id: string; name: string; status: string }[]>([]);
  const [bulkForm, setBulkForm] = useState("");
  const [mode, setMode] = useState<"list" | "db" | "agent">(sp.get("mode") === "db" ? "db" : sp.get("mode") === "agent" ? "agent" : "list");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (pref) p.set("pref", pref);
    if (industry) p.set("industry", industry);
    if (status) p.set("status", status);
    if (project) p.set("project", project);
    if (empMin) p.set("empMin", empMin);
    if (empMax) p.set("empMax", empMax);
    p.set("page", String(page));
    return p.toString();
  }, [q, pref, industry, status, project, empMin, empMax, page]);

  const load = useCallback(() => {
    api<ListRes>(`/api/sales/leads?${query}`).then(setData).catch((e) => setMsg(e instanceof Error ? e.message : "読み込めませんでした"));
  }, [query]);
  useEffect(load, [load]);
  useEffect(() => {
    api<Project[]>("/api/projects").then((ps) => setProjects(ps.filter((p) => /架電|テレアポ/.test(p.category)))).catch(() => {});
    api<{ items: { id: string; name: string; status: string }[] }>("/api/sales/form/campaigns").then((r) => setFormCampaigns(r.items.filter((c) => c.status !== "done"))).catch(() => {});
  }, []);

  const callProjects = projects;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allOnPage = data?.items.map((l) => l.id) ?? [];
  const allSelected = allOnPage.length > 0 && allOnPage.every((id) => selected.has(id));

  const bulk = async (body: Record<string, unknown>, confirmText?: string) => {
    if (selected.size === 0) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setMsg("");
    try {
      const r = await api<{ changed: number }>("/api/sales/leads/bulk", { method: "POST", body: JSON.stringify({ ids: [...selected], ...body }) });
      setMsg(`${r.changed}件を更新しました`);
      setSelected(new Set());
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "操作できませんでした");
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      await api(`/api/sales/leads/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "更新できませんでした");
    }
  };

  const total = data?.total ?? 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const statusCount = (s: string) => data?.facets.statuses.find((f) => f.v === s)?.n ?? 0;
  const allCount = data?.facets.statuses.reduce((a, f) => a + f.n, 0) ?? 0;

  return (
    <div className="max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">営業リスト</h1>
          <p className="text-xs text-slate-500">
            {isFreelancer ? "担当している架電案件に紐付いたリストが表示されます。架電したら結果を記録してください。" : "CSVを取り込んで、絞り込み → 架電案件に紐付け → 架電結果の記録まで、ここで回します。"}
          </p>
        </div>
        <div className="flex gap-2">
          {!isFreelancer && mode === "list" && (
            <button onClick={() => setImportOpen((v) => !v)} className={btnY}>
              {importOpen ? "取り込みを閉じる" : "＋ CSVを取り込む"}
            </button>
          )}
          {mode === "list" && (
            <a href={`/api/sales/leads/export?${query}`} className={btnW}>
              CSVで書き出す
            </a>
          )}
        </div>
      </div>

      {!isFreelancer && (
        <div className="mb-4 flex flex-wrap gap-1 text-sm">
          <button onClick={() => setMode("list")} className={`hex-tab px-4 py-1.5 font-bold ${mode === "list" ? "bg-food-500 text-white" : "bg-white text-slate-600"}`}>自分のリスト</button>
          <button onClick={() => setMode("agent")} className={`hex-tab px-4 py-1.5 font-bold ${mode === "agent" ? "bg-food-500 text-white" : "bg-white text-slate-600"}`}>営業AI（台本・リスト取得）</button>
          {isAdmin && (
            <button onClick={() => setMode("db")} className={`hex-tab px-4 py-1.5 font-bold ${mode === "db" ? "bg-food-500 text-white" : "bg-white text-slate-600"}`}>企業DBから探す（社内専用）</button>
          )}
        </div>
      )}

      {mode === "db" && isAdmin && <CompanySearch isAdmin onAdded={load} />}
      {mode === "agent" && !isFreelancer && <SalesAgent isAdmin={isAdmin} onListChanged={load} />}
      {(mode === "db" && isAdmin) || (mode === "agent" && !isFreelancer) ? null : (
      <>

      {importOpen && !isFreelancer && <LeadCsvImport campaigns={formCampaigns} onDone={() => { setImportOpen(false); load(); }} />}

      {/* 状態の内訳 */}
      <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
        <button onClick={() => { setStatus(""); setPage(1); }} className={`rounded rounded-xl border border-food-200 px-2 py-0.5 ${status === "" ? "bg-hive-900 text-white" : "bg-white"}`}>
          すべて {allCount}
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`rounded rounded-xl border border-food-200 px-2 py-0.5 ${status === s ? "bg-hive-900 text-white" : STATUS_STYLE[s]}`}>
            {s} {statusCount(s)}
          </button>
        ))}
      </div>

      {/* 絞り込み */}
      <div className={`${box} mb-3 flex flex-wrap items-end gap-2 p-3`}>
        <label className="text-xs">
          キーワード
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="社名・担当者・電話・メモ" className={`${input} block w-48`} />
        </label>
        <label className="text-xs">
          都道府県
          <select value={pref} onChange={(e) => { setPref(e.target.value); setPage(1); }} className={`${input} block`}>
            <option value="">すべて</option>
            {data?.facets.prefectures.map((f) => <option key={f.v} value={f.v}>{f.v}（{f.n}）</option>)}
          </select>
        </label>
        <label className="text-xs">
          業種
          <select value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1); }} className={`${input} block max-w-40`}>
            <option value="">すべて</option>
            {data?.facets.industries.map((f) => <option key={f.v} value={f.v}>{f.v}（{f.n}）</option>)}
          </select>
        </label>
        <label className="text-xs">
          従業員数
          <div className="flex items-center gap-1">
            <input value={empMin} onChange={(e) => { setEmpMin(e.target.value); setPage(1); }} inputMode="numeric" placeholder="下限" className={`${input} w-16`} />
            〜
            <input value={empMax} onChange={(e) => { setEmpMax(e.target.value); setPage(1); }} inputMode="numeric" placeholder="上限" className={`${input} w-16`} />
          </div>
        </label>
        <label className="text-xs">
          架電案件
          <select value={project} onChange={(e) => { setProject(e.target.value); setPage(1); }} className={`${input} block max-w-52`}>
            <option value="">すべて</option>
            {!isFreelancer && <option value="none">未紐付け</option>}
            {callProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        {(q || pref || industry || status || project || empMin || empMax) && (
          <button onClick={() => { setQ(""); setPref(""); setIndustry(""); setStatus(""); setProject(""); setEmpMin(""); setEmpMax(""); setPage(1); }} className="text-xs underline">
            条件をクリア
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{total.toLocaleString()} 件</span>
      </div>

      {/* まとめて操作 */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded rounded-xl border border-food-200 bg-food-50 px-3 py-2 text-sm">
          <span className="font-bold">{selected.size}件を選択中</span>
          {!isFreelancer && (
            <>
              <select value={bulkProject} onChange={(e) => setBulkProject(e.target.value)} className={input}>
                <option value="">案件を選ぶ…</option>
                {callProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <button onClick={() => bulk({ type: "assign", projectId: bulkProject || null })} className={btnY} disabled={!bulkProject && selected.size === 0}>
                {bulkProject ? "この案件に紐付ける" : "紐付けを外す"}
              </button>
            </>
          )}
          {!isFreelancer && (
            <>
              <select value={bulkForm} onChange={(e) => setBulkForm(e.target.value)} className={input}>
                <option value="">フォーム営業に追加…</option>
                {formCampaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                disabled={!bulkForm}
                onClick={async () => {
                  setMsg("");
                  try {
                    const r = await api<{ picked: number; added: number; excluded: number; suppressed: number; duplicated: number; noUrl: number }>(`/api/sales/form/campaigns/${bulkForm}/leads`, { method: "POST", body: JSON.stringify({ leadIds: [...selected] }) });
                    setMsg(`フォーム営業に追加 ${r.added}件（除外 ${r.excluded + r.suppressed} ／ 重複・90日以内 ${r.duplicated} ／ URL無し ${r.noUrl}）`);
                    setSelected(new Set());
                  } catch (e) {
                    setMsg(e instanceof Error ? e.message : "追加できませんでした");
                  }
                }}
                className={`${btnY} disabled:opacity-40`}
              >
                追加
              </button>
            </>
          )}
          <select onChange={(e) => { if (e.target.value) bulk({ type: "status", status: e.target.value }); e.target.value = ""; }} className={input} defaultValue="">
            <option value="">状態をまとめて変更…</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {!isFreelancer && (
            <button onClick={() => bulk({ type: "delete" }, `${selected.size}件をリストから削除します。よろしいですか？`)} className={`${btn} bg-white text-rose-600`}>
              削除
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="text-xs underline">選択解除</button>
        </div>
      )}
      {msg && <div className="mb-3 text-sm text-slate-600">{msg}</div>}

      {/* 一覧 */}
      <div className={`${box} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-food-200 text-left text-xs text-slate-500">
              <th className="px-2 py-2"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(allOnPage))} /></th>
              <th className="px-2 py-2">会社名 / 担当者</th>
              <th className="px-2 py-2">電話</th>
              <th className="px-2 py-2">エリア / 業種 / 規模</th>
              <th className="px-2 py-2">状態</th>
              <th className="px-2 py-2">架電</th>
              <th className="px-2 py-2">案件</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                  {allCount === 0
                    ? isFreelancer
                      ? "紐付いたリストはまだありません。発注者が案件にリストを紐付けると表示されます。"
                      : "まだリストがありません。「＋ CSVを取り込む」から始めてください。"
                    : "条件に合う会社がありません。"}
                </td>
              </tr>
            )}
            {data?.items.map((l) => (
              <LeadRow
                key={l.id}
                lead={l}
                checked={selected.has(l.id)}
                onToggle={() => toggle(l.id)}
                open={openLead === l.id}
                onOpen={() => setOpenLead(openLead === l.id ? null : l.id)}
                onPatch={(b) => patch(l.id, b)}
                onChanged={load}
              />
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={`${btnW} disabled:opacity-40`}>前へ</button>
          <span>{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={`${btnW} disabled:opacity-40`}>次へ</button>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function LeadRow({
  lead, checked, onToggle, open, onOpen, onPatch, onChanged,
}: {
  lead: Lead; checked: boolean; onToggle: () => void; open: boolean; onOpen: () => void;
  onPatch: (b: Record<string, unknown>) => void; onChanged: () => void;
}) {
  return (
    <>
      <tr className={`border-b border-slate-200 ${open ? "bg-food-50" : ""}`}>
        <td className="px-2 py-2 align-top"><input type="checkbox" checked={checked} onChange={onToggle} /></td>
        <td className="px-2 py-2 align-top">
          <div className="font-bold">{lead.company}</div>
          <div className="text-xs text-slate-500">{lead.contact_name}{lead.email && ` ・ ${lead.email}`}</div>
        </td>
        <td className="px-2 py-2 align-top whitespace-nowrap">
          {lead.phone ? <a href={`tel:${lead.phone}`} className="underline">{lead.phone}</a> : <span className="text-slate-400">—</span>}
        </td>
        <td className="px-2 py-2 align-top text-xs">
          <div>{lead.prefecture || <span className="text-slate-400">エリア不明</span>}</div>
          <div className="text-slate-500">{lead.industry}{lead.employees ? ` ・ ${lead.employees}人` : ""}</div>
        </td>
        <td className="px-2 py-2 align-top">
          <select value={lead.status} onChange={(e) => onPatch({ status: e.target.value })} className={`rounded rounded-xl border border-food-200 px-1.5 py-0.5 text-xs ${STATUS_STYLE[lead.status] ?? ""}`}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        <td className="px-2 py-2 align-top text-xs whitespace-nowrap">
          {lead.call_count > 0 ? (
            <>
              <div>{lead.call_count}回 ・ {lead.last_result}</div>
              <div className="text-slate-500">{fmtDate(lead.last_called_at)}</div>
            </>
          ) : (
            <span className="text-slate-400">未架電</span>
          )}
        </td>
        <td className="px-2 py-2 align-top text-xs">
          {lead.project_id ? <Link href={`/projects/${lead.project_id}`} className="underline">{lead.project_title ?? "案件"}</Link> : <span className="text-slate-400">—</span>}
        </td>
        <td className="px-2 py-2 align-top whitespace-nowrap">
          <button onClick={onOpen} className={`${btn} ${open ? "bg-hive-900 text-white" : "bg-food-500 text-white"}`}>
            {open ? "閉じる" : "架電を記録"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b-2 border-food-200 bg-food-50">
          <td colSpan={8} className="px-4 py-3">
            <CallPanel lead={lead} onPatch={onPatch} onChanged={onChanged} />
          </td>
        </tr>
      )}
    </>
  );
}

function CallPanel({ lead, onPatch, onChanged }: { lead: Lead; onPatch: (b: Record<string, unknown>) => void; onChanged: () => void }) {
  const [result, setResult] = useState(RESULTS[0]);
  const [note, setNote] = useState("");
  const [memo, setMemo] = useState(lead.memo);
  const [calls, setCalls] = useState<Call[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadCalls = useCallback(() => {
    api<Call[]>(`/api/sales/leads/${lead.id}/calls`).then(setCalls).catch(() => {});
  }, [lead.id]);
  useEffect(loadCalls, [loadCalls]);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/sales/leads/${lead.id}/calls`, { method: "POST", body: JSON.stringify({ result, note }) });
      setNote("");
      loadCalls();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "記録できませんでした");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <div className="mb-1 text-xs font-bold">架電結果を記録</div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {RESULTS.map((r) => (
            <button key={r} onClick={() => setResult(r)} className={`rounded rounded-xl border border-food-200 px-2 py-0.5 text-xs ${result === r ? "bg-hive-900 text-white" : "bg-white"}`}>{r}</button>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="話した内容、次に電話する日など" className={`${input} w-full`} />
        <div className="mt-2 flex items-center gap-2">
          <button onClick={submit} disabled={busy} className={`${btnY} disabled:opacity-50`}>{busy ? "記録中..." : "この結果で記録"}</button>
          {err && <span className="text-xs text-rose-600">{err}</span>}
        </div>
        <div className="mt-3">
          <div className="mb-1 text-xs font-bold">会社メモ</div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={() => memo !== lead.memo && onPatch({ memo })} rows={2} className={`${input} w-full`} placeholder="決裁者・営業時間・注意点など（欄を離れると保存）" />
          {lead.address && <div className="mt-1 text-xs text-slate-500">{lead.address}</div>}
          {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs underline">{lead.website}</a>}
        </div>
      </div>
      <div>
        <div className="mb-1 text-xs font-bold">これまでの架電（{calls.length}件）</div>
        {calls.length === 0 && <div className="text-xs text-slate-500">まだありません</div>}
        <ul className="space-y-1 text-xs">
          {calls.map((c) => (
            <li key={c.id} className="rounded border border-slate-300 bg-white px-2 py-1">
              <span className="font-bold">{c.result}</span> <span className="text-slate-500">{fmtDate(c.called_at)}{c.caller ? ` ・ ${c.caller}` : ""}</span>
              {c.note && <div className="text-slate-700">{c.note}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
