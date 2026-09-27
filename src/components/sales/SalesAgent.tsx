"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { api } from "@/lib/client";
import { Mascot, PointInline, useMascot } from "@/components/MascotProvider";
import AiUsage from "@/components/AiUsage";

type Sample = { name: string; prefecture: string | null; industry: string | null; employees: number | null; phoneMasked: string | null };
type Payload =
  | { type: "list_preview"; query: string; description: string; total: number; withPhone: number; sample: Sample[]; count: number; cost: number; unit: string }
  | { type: "list_done"; added: number; skipped: number; charged: number }
  | { type: "list_unavailable" }
  | { type: "sales_script" };
type Msg = { role: "user" | "assistant"; content: string; payload?: Payload | null };
type Session = { id: string; title: string; createdAt: string; messages: Msg[] };
type BrandProfile = { id: string; name: string };

const QUICK = [
  { label: "テレアポ台本を作る", prompt: "テレアポ用のトークスクリプトを作ってください。\n商材: \nターゲット（業種・規模・地域）: \n取りたいゴール（アポ／資料送付）: \n強み・実績: " },
  { label: "営業リストを取得", prompt: "東京都港区の会社で、従業員30人以上、電話番号ありの会社を200社ほしい" },
  { label: "切り返しだけ", prompt: "「今は必要ない」「資料だけ送って」「他社を使っている」と言われたときの切り返しを、それぞれ3パターンずつ作ってください。商材: " },
];

const btn = "rounded rounded-xl border border-night-200 px-3 py-1 text-sm font-bold";
const btnY = `${btn} bg-night-500 text-white hover:bg-night-600 disabled:opacity-40`;
const btnW = `${btn} bg-white text-hive-900 hover:bg-night-50 disabled:opacity-40`;

export default function SalesAgent({ isAdmin, onListChanged }: { isAdmin: boolean; onListChanged: () => void }) {
  const { mascot } = useMascot();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [usageKey, setUsageKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Session[]>("/api/sales/agent").then(setSessions).catch(() => {});
    api<BrandProfile[]>("/api/brand-profiles").then(setProfiles).catch(() => {});
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const post = async (body: Record<string, unknown>, optimistic?: Msg) => {
    if (busy) return;
    setError("");
    if (optimistic) setMessages((m) => [...m, optimistic]);
    setBusy(true);
    try {
      const res = await api<{ sessionId: string; reply: string; payload: Payload | null }>("/api/sales/agent", {
        method: "POST",
        body: JSON.stringify({ sessionId, brandProfileId: profileId || undefined, ...body }),
      });
      setSessionId(res.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply, payload: res.payload }]);
      if (res.payload?.type === "list_done") onListChanged();
      if (!sessionId) api<Session[]>("/api/sales/agent").then(setSessions).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      if (optimistic) setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
      setUsageKey((k) => k + 1);
    }
  };

  const send = (text?: string) => {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput("");
    post({ message }, { role: "user", content: message });
  };

  const saveScript = async (content: string) => {
    const title = window.prompt("台本のタイトル", "テレアポ台本");
    if (!title) return;
    await api("/api/scripts", { method: "POST", body: JSON.stringify({ title, content } ) });
    alert("保存しました。「保存済み台本」から確認できます。");
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-14rem)] min-h-[420px]">
      <aside className="hidden w-48 shrink-0 overflow-y-auto md:block">
        <button onClick={() => { setSessionId(null); setMessages([]); setError(""); }} className={`${btnY} mb-2 w-full`}>＋ 新しい会話</button>
        <div className="space-y-1">
          {sessions.map((s) => (
            <button key={s.id} onClick={() => { setSessionId(s.id); setMessages(s.messages); setError(""); }} className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${s.id === sessionId ? "bg-night-100 text-hive-900" : "text-slate-600 hover:bg-slate-100"}`}>
              {s.title}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded rounded-xl border border-night-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b-2 border-night-200 px-4 py-2">
          <Mascot className="h-7 w-7 shrink-0" />
          <span className="text-sm font-bold text-hive-900">営業AI</span>
          <div className="hidden sm:block"><AiUsage refreshKey={usageKey} compact /></div>
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className="ml-auto rounded rounded-xl border border-night-200 px-2 py-1 text-xs">
            <option value="">ブランドプロファイルなし</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                テレアポのトークスクリプトを作ったり、{isAdmin ? "企業データベース（775万社）から" : "企業データベースから"}条件に合う会社を営業リストに取得できます。
                {!isAdmin && <> リストの取得は200社ごとに20<PointInline />です。</>}
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK.map((q) => (
                  <button key={q.label} onClick={() => setInput(q.prompt)} className={btnW}>{q.label}</button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl bg-night-500 px-4 py-2 text-sm text-white whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="flex max-w-[95%] gap-2.5">
                    <Mascot className="mt-1 h-8 w-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="prose prose-sm prose-slate max-w-none rounded-2xl rounded-tl-md border border-night-100 bg-night-50/60 px-4 py-3 [&_h1]:text-base [&_h2]:text-sm [&_h1]:font-bold [&_h2]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }}
                      />
                      {m.payload?.type === "list_preview" && (
                        <ListPreview p={m.payload} latest={i === messages.length - 1} busy={busy} onAcquire={(count) => post({ action: { type: "acquire", query: (m.payload as { query: string }).query, count } })} />
                      )}
                      {m.payload?.type === "sales_script" && (
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => saveScript(m.content)} className={btnW}>保存済み台本に保存</button>
                          <button onClick={() => navigator.clipboard.writeText(m.content)} className={btnW}>コピー</button>
                        </div>
                      )}
                      {m.payload?.type === "list_done" && (
                        <a href="/sales" className={`${btnY} mt-2 inline-block`}>営業リストを開く</a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2.5">
                <Mascot className="h-8 w-8 shrink-0 animate-bee-float" />
                <div className="rounded-2xl border border-night-100 bg-night-50/60 px-4 py-2 text-xs text-slate-500">{mascot.thinking}</div>
              </div>
            )}
            {error && <div className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t-2 border-night-200 p-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
              rows={3}
              placeholder="例: 福岡県の美容室で従業員5人以下を300社ほしい ／ 貸切・二次会を案内するテレアポ台本を作って"
              className="flex-1 rounded rounded-xl border border-night-200 px-3 py-2 text-sm"
            />
            <button onClick={() => send()} disabled={busy || !input.trim()} className={btnY}>送信</button>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">⌘/Ctrl + Enter で送信</div>
        </div>
      </div>
    </div>
  );
}

function ListPreview({ p, latest, busy, onAcquire }: { p: Extract<Payload, { type: "list_preview" }>; latest: boolean; busy: boolean; onAcquire: (count: number) => void }) {
  const [count, setCount] = useState(String(p.count));
  const n = Math.min(1000, Math.max(1, Number(count) || 1));
  const cost = p.cost === 0 ? 0 : Math.ceil(n / 200) * 20;
  if (p.total === 0) return null;
  return (
    <div className="mt-2 rounded rounded-xl border border-night-200 bg-white p-3 text-sm">
      <div className="mb-2 text-xs text-slate-500">{p.description}</div>
      <table className="mb-3 w-full text-xs">
        <tbody>
          {p.sample.map((s, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-1 font-bold">{s.name}</td>
              <td className="py-1 text-slate-500">{s.prefecture}</td>
              <td className="py-1 text-slate-500">{s.industry}</td>
              <td className="py-1 text-slate-500">{s.employees ? `${s.employees}人` : ""}</td>
              <td className="py-1 font-mono text-slate-400">{s.phoneMasked ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {latest && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" className="w-20 rounded rounded-xl border border-night-200 px-2 py-1 text-sm" />
          <span className="text-xs">社（最大1,000）</span>
          <button onClick={() => { if (window.confirm(`${n} 社を営業リストに取得します${cost ? `（${cost}🍯）` : ""}。よろしいですか？`)) onAcquire(n); }} disabled={busy} className={btnY}>
            営業リストに取得{cost ? <>（{cost}<PointInline />）</> : "（無料）"}
          </button>
          <span className="text-xs text-slate-500">{p.unit}</span>
        </div>
      )}
    </div>
  );
}
