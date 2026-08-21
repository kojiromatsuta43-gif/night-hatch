"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

type ChatUser = { id: string; name: string; role: string };
type Message = { id: string; from_id: string; to_id: string; body: string; created_at: string };

export default function ChatPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [me, setMe] = useState("");
  const [peer, setPeer] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ users: ChatUser[]; messages: Message[]; me: string }>("/api/chat")
      .then((res) => { setUsers(res.users); setMessages(res.messages); setMe(res.me); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages, peer]);

  const thread = messages.filter((m) => (m.from_id === peer && m.to_id === me) || (m.from_id === me && m.to_id === peer));

  const send = async () => {
    if (!input.trim() || !peer) return;
    const body = input;
    setInput("");
    await api("/api/chat", { method: "POST", body: JSON.stringify({ to: peer, body }) });
    load();
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <aside className="w-60 shrink-0 border-r border-slate-200 overflow-y-auto">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">メッセージ</div>
        {users.map((u) => (
          <button key={u.id} onClick={() => setPeer(u.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 ${peer === u.id ? "bg-indigo-50" : ""}`}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white">{u.name[0]}</span>
            <span>
              <span className="block text-sm font-medium">{u.name}</span>
              <span className="block text-xs text-slate-400">{u.role === "freelancer" ? "フリーランス" : "クライアント"}</span>
            </span>
          </button>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {!peer ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">左のリストから会話を選んでください</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {thread.map((m) => (
                <div key={m.id} className={m.from_id === me ? "flex justify-end" : "flex"}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.from_id === me ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                    {m.body}
                    <div className={`mt-1 text-right text-[10px] ${m.from_id === me ? "text-indigo-200" : "text-slate-400"}`}>{m.created_at.slice(11, 16)}</div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-slate-200 p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) send(); }}
                placeholder="メッセージを入力"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button onClick={send} disabled={!input.trim()} className="rounded-lg bg-indigo-600 px-5 text-sm font-medium text-white disabled:opacity-40">送信</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
