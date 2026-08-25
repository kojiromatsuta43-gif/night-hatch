"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { api } from "@/lib/client";
import { Mascot, useMascot } from "@/components/MascotProvider";

type Msg = { role: "user" | "assistant"; content: string };
type AgentSession = { id: string; title: string; createdAt: string; messages: Msg[] };
type BrandProfile = { id: string; name: string };

// ハチにすぐ頼めること（白紙のチャット欄を無くすための入口）
const QUICK_ACTIONS = [
  { label: "台本をつくる", hint: "ショート動画の構成から", prompt: "ショート動画の台本を作りたいです。まず何を教えればいいか質問してください。" },
  { label: "競合を分析する", hint: "伸びてる理由を分解", prompt: "競合アカウントを分析したいです。どんな情報が必要か質問してください。" },
  { label: "発注内容を整理する", hint: "頼み方が分からない時", prompt: "制作を発注したいのですが、依頼内容がまとまっていません。質問しながら整理してください。" },
  { label: "企画を出してもらう", hint: "ネタ切れの時", prompt: "自社のショート動画の企画案を5つ出してください。まず業種と目的を質問してください。" },
];

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
  const { mascot } = useMascot();

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
          className="mb-3 w-full rounded-lg bg-honey-400 px-3 py-2 text-sm font-medium text-hive-900 hover:bg-honey-300"
        >
          ＋ 新しい会話
        </button>
        <div className="space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s)}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                s.id === sessionId ? "bg-honey-50 text-honey-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
          <Mascot className="h-7 w-7 shrink-0" />
          <span className="text-sm font-semibold text-hive-900">{mascot.agentTitle}</span>
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
            <div className="mx-auto mt-8 max-w-2xl text-center">
              <Mascot className="mx-auto h-20 w-20 animate-bee-float" />
              <div className="relative mx-auto mt-4 inline-block rounded-2xl border border-honey-200 bg-honey-50 px-6 py-4">
                <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-honey-200 bg-honey-50" />
                <p className="text-lg font-bold text-hive-900">{mascot.greeting}</p>
                <p className="mt-1 text-sm text-slate-600">何をお手伝いしましょうか？下のボタンから選んでもいいですし、そのまま話しかけてもOKです。</p>
              </div>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {QUICK_ACTIONS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.prompt)}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-honey-400 hover:bg-honey-50"
                  >
                    <Mascot className="h-7 w-7 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-hive-900">{q.label}</span>
                      <span className="block text-xs text-slate-400">{q.hint}</span>
                    </span>
                    <span className="ml-auto text-sm font-semibold text-honey-600 opacity-0 transition-opacity group-hover:opacity-100">→</span>
                  </button>
                ))}
              </div>

              <p className="mt-6 mb-2 text-xs font-semibold text-slate-400">こんな聞き方もできます</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "美容室の新規客向けInstagramリールの台本を作って",
                  "飲食店のTikTok企画を5つ提案して",
                  "LP改善の発注内容を整理したい",
                ].map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-600 transition-colors hover:border-honey-400 hover:bg-honey-50">
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
                  <div className="max-w-[80%] rounded-2xl bg-honey-400 px-4 py-2 text-sm text-hive-900 whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="flex max-w-[92%] gap-2.5">
                    <Mascot className="mt-1 h-8 w-8 shrink-0" />
                    <div className="min-w-0">
                      <div
                        className="prose prose-sm prose-slate max-w-none rounded-2xl rounded-tl-md border border-honey-100 bg-honey-50/60 px-4 py-3 [&_h1]:text-base [&_h2]:text-sm [&_h1]:font-bold [&_h2]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }}
                      />
                      <button onClick={() => saveScript(m.content)} className="mt-1 text-xs font-medium text-honey-600 hover:underline">
                        台本として保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2.5">
                <Mascot className="h-8 w-8 shrink-0 animate-bee-float" />
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-honey-100 bg-honey-50/60 px-4 py-3">
                  <span className="h-2 w-2 animate-bee-dot rounded-full bg-honey-500" />
                  <span className="h-2 w-2 animate-bee-dot rounded-full bg-honey-500 [animation-delay:0.18s]" />
                  <span className="h-2 w-2 animate-bee-dot rounded-full bg-honey-500 [animation-delay:0.36s]" />
                  <span className="ml-1.5 text-xs text-slate-500">{mascot.thinking}</span>
                </div>
              </div>
            )}
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
              placeholder={`${mascot.talkTo} — 例: フィットネスジムの体験申込を増やすリール台本を作って`}
              className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-honey-500 focus:outline-none"
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="rounded-lg bg-honey-400 px-5 text-sm font-medium text-hive-900 disabled:opacity-40 hover:bg-honey-300"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
