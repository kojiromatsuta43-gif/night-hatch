"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { api } from "@/lib/client";

type Msg = { role: "user" | "assistant"; content: string };
type AgentSession = { id: string; title: string; createdAt: string; messages: Msg[] };
type BrandProfile = { id: string; name: string };

export default function AgentPage() {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [ngFlags, setNgFlags] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<AgentSession[]>("/api/agent").then(setSessions).catch(() => {});
    api<BrandProfile[]>("/api/brand-profiles").then(setProfiles).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    setError("");
    setNgFlags([]);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await api<{ sessionId: string; reply: string; ngFlags: string[] }>("/api/agent", {
        method: "POST",
        body: JSON.stringify({ sessionId, message, brandProfileId: profileId || undefined }),
      });
      setSessionId(res.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setNgFlags(res.ngFlags);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  const saveScript = async (content: string) => {
    const title = window.prompt("台本のタイトル", "無題の台本");
    if (!title) return;
    await api("/api/scripts", { method: "POST", body: JSON.stringify({ title, content }) });
    alert("保存しました。「保存済み台本」から確認できます。");
  };

  const openSession = (s: AgentSession) => {
    setSessionId(s.id);
    setMessages(s.messages);
    setError("");
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <aside className="w-56 shrink-0 overflow-y-auto">
        <button
          onClick={() => { setSessionId(null); setMessages([]); setError(""); }}
          className="mb-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          ＋ 新しい会話
        </button>
        <div className="space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s)}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                s.id === sessionId ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
          <span className="text-sm font-semibold">AIエージェント</span>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="ml-auto rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600"
          >
            <option value="">ブランドプロファイルなし</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <div className="mt-16 text-center">
              <p className="text-lg font-semibold">何をお手伝いしましょうか？</p>
              <p className="mt-1 text-sm text-slate-500">台本作成・構成案・発注内容の整理・競合分析まで会話で進められます。</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "美容室の新規客向けInstagramリールの台本を作って",
                  "飲食店のTikTok企画を5つ提案して",
                  "LP改善の発注内容を整理したい",
                ].map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:border-indigo-400">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl bg-indigo-600 px-4 py-2 text-sm text-white whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="max-w-[90%]">
                    <div
                      className="prose prose-sm prose-slate max-w-none rounded-2xl bg-slate-50 px-4 py-3 [&_h1]:text-base [&_h2]:text-sm [&_h1]:font-bold [&_h2]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }}
                    />
                    <button onClick={() => saveScript(m.content)} className="mt-1 text-xs text-indigo-500 hover:underline">
                      台本として保存
                    </button>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="text-sm text-slate-400">考え中...</div>}
            {ngFlags.length > 0 && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                ⚠ NGワード検出: {ngFlags.join("、")} — 表現の見直しを推奨します
              </div>
            )}
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="例: フィットネスジムの体験申込を増やすリール台本を作って"
              className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="rounded-lg bg-indigo-600 px-5 text-sm font-medium text-white disabled:opacity-40 hover:bg-indigo-500"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
