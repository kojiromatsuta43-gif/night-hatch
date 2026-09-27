"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";

type ChatUser = { id: string; name: string; role: string; last_seen_at: string | null };
type ChatProject = { id: string; title: string };
type Message = {
  id: string;
  from_id: string;
  to_id: string;
  body: string;
  created_at: string;
  project_id: string | null;
  project_title: string | null;
  upload_id: string | null;
  upload_name: string | null;
  upload_mime: string | null;
};

/** スレッドを表す値。null は「全般」 */
type ThreadKey = string | null;
const GENERAL = "__general__";

/** 5分以内にアクセスがあればオンラインとみなす */
function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  const t = Date.parse(lastSeen.replace(" ", "T") + "Z");
  return Number.isFinite(t) && Date.now() - t < 5 * 60 * 1000;
}

export default function ChatPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [me, setMe] = useState("");
  const [peer, setPeer] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadKey>(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [attach, setAttach] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 5秒ごとの取得で内容が変わっていないときは state を触らない（一覧の再描画と自動スクロールが走らないように）
  const lastRef = useRef<{ users: string; projects: string; messages: string }>({ users: "", projects: "", messages: "" });
  const load = useCallback(() => {
    api<{ users: ChatUser[]; projects: ChatProject[]; messages: Message[]; me: string }>("/api/chat")
      .then((res) => {
        const uKey = JSON.stringify(res.users);
        const pKey = JSON.stringify(res.projects);
        const mKey = res.messages.length + ":" + (res.messages[res.messages.length - 1]?.id ?? "");
        if (uKey !== lastRef.current.users) {
          lastRef.current.users = uKey;
          setUsers(res.users);
        }
        if (pKey !== lastRef.current.projects) {
          lastRef.current.projects = pKey;
          setProjects(res.projects);
        }
        if (mKey !== lastRef.current.messages) {
          lastRef.current.messages = mKey;
          setMessages(res.messages);
        }
        setMe((cur) => (cur === res.me ? cur : res.me));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // 新しいメッセージが増えたとき・相手を切り替えたときだけ一番下へ
  const countRef = useRef(0);
  useEffect(() => {
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      bottomRef.current?.scrollIntoView();
    }
  }, [messages]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [peer, thread]);

  /** 相手とのやりとり全部 */
  const withPeer = useMemo(
    () => messages.filter((m) => (m.from_id === peer && m.to_id === me) || (m.from_id === me && m.to_id === peer)),
    [messages, peer, me]
  );

  /** この相手とのスレッド一覧（全般 ＋ 会話に出てきた案件 ＋ 自分の案件） */
  const threads = useMemo(() => {
    const map = new Map<string, string>();
    withPeer.forEach((m) => {
      if (m.project_id) map.set(m.project_id, m.project_title ?? "（削除された案件）");
    });
    projects.forEach((p) => map.set(p.id, p.title));
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [withPeer, projects]);

  const shown = withPeer
    .filter((m) => (thread === null ? !m.project_id : m.project_id === thread))
    .filter((m) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return m.body.toLowerCase().includes(q) || (m.upload_name ?? "").toLowerCase().includes(q);
    });

  const unreadCountFor = (userId: string) =>
    messages.filter((m) => m.from_id === userId && m.to_id === me).length;

  // 検索: 相手の名前か、その人とのメッセージ本文に当たれば残す
  const shownUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      if (u.name.toLowerCase().includes(q)) return true;
      return messages.some(
        (m) =>
          (m.from_id === u.id || m.to_id === u.id) &&
          (m.body.toLowerCase().includes(q) || (m.upload_name ?? "").toLowerCase().includes(q))
      );
    });
  }, [users, messages, query]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
      setAttach({ id: data.files[0].id, name: data.files[0].name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const send = async () => {
    if ((!input.trim() && !attach) || !peer) return;
    const body = input;
    const uploadId = attach?.id ?? null;
    setInput("");
    setAttach(null);
    try {
      await api("/api/chat", {
        method: "POST",
        body: JSON.stringify({ to: peer, body, projectId: thread, uploadId }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    }
    load();
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-slate-200">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="mb-2 text-sm font-semibold">メッセージ</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前・本文で検索"
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-night-500 focus:outline-none"
          />
        </div>
        {query.trim() && shownUsers.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            「{query}」に一致する相手・メッセージはありません
          </div>
        )}
        {shownUsers.map((u) => (
          <button
            key={u.id}
            onClick={() => {
              setPeer(u.id);
              setThread(null);
            }}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 ${peer === u.id ? "bg-night-50" : ""}`}
          >
            <span className="relative shrink-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-night-300 to-night-500 text-sm font-bold text-hive-900">
                {u.name[0]}
              </span>
              {isOnline(u.last_seen_at) && (
                <span
                  title="オンライン"
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-800 bg-emerald-500"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{u.name}</span>
              <span className="block text-xs text-slate-400">
                {isOnline(u.last_seen_at) ? (
                  <span className="font-medium text-emerald-600">オンライン</span>
                ) : (
                  (u.role === "freelancer" ? "フリーランス" : "クライアント")
                )}
                {unreadCountFor(u.id) > 0 && <span className="ml-1 text-night-700">・{unreadCountFor(u.id)}件</span>}
              </span>
            </span>
          </button>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!peer ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            左のリストから会話を選んでください
          </div>
        ) : (
          <>
            {/* スレッド切替 */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-500">スレッド</span>
              <button
                onClick={() => setThread(null)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  thread === null
                    ? "border-night-500 bg-night-500 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-night-400"
                }`}
              >
                全般
              </button>
              {threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThread(t.id)}
                  className={`max-w-[16rem] truncate rounded-full border px-3 py-1 text-xs transition-colors ${
                    thread === t.id
                      ? "border-night-500 bg-night-500 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-night-400"
                  }`}
                  title={t.title}
                >
                  {t.title}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              {shown.length === 0 && (
                <p className="pt-10 text-center text-sm text-slate-400">
                  {thread === null ? "まだメッセージがありません" : "この案件のやりとりはまだありません"}
                </p>
              )}
              {shown.map((m) => {
                const mine = m.from_id === me;
                const isImage = (m.upload_mime ?? "").startsWith("image/");
                return (
                  <div key={m.id} className={mine ? "flex justify-end" : "flex"}>
                    <div
                      className={`max-w-[70%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                        mine ? "bg-night-500 text-white" : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {m.body}
                      {m.upload_id && !m.upload_name && (
                        <span className={`mt-1 block text-xs ${mine ? "text-hive-700" : "text-slate-400"}`}>
                          （添付の動画は30日を過ぎたため削除されました）
                        </span>
                      )}
                      {m.upload_id && m.upload_name && (
                        <a
                          href={`/api/uploads/${m.upload_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-1 block ${mine ? "text-hive-900" : "text-slate-700"}`}
                        >
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/uploads/${m.upload_id}`}
                              alt={m.upload_name ?? "添付画像"}
                              className="max-h-48 rounded-lg border border-black/10"
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-white/60 px-2 py-1 text-xs font-medium underline">
                              📎 {m.upload_name ?? "添付ファイル"}
                            </span>
                          )}
                        </a>
                      )}
                      <div className={`mt-1 text-right text-[10px] ${mine ? "text-hive-700" : "text-slate-400"}`}>
                        {m.created_at.slice(11, 16)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && <p className="px-4 pb-1 text-xs text-rose-600">{error}</p>}
            {attach && (
              <div className="flex items-center gap-2 px-4 pb-1 text-xs text-slate-600">
                <span className="truncate rounded-lg bg-slate-100 px-2 py-1">📎 {attach.name}</span>
                <button onClick={() => setAttach(null)} className="text-slate-400 hover:text-rose-600">
                  取り消す
                </button>
              </div>
            )}

            <div className="border-t border-slate-200 px-4 pt-2 text-[11px] text-slate-400">
              ⚠ チャットに添付した動画は、送信から30日を過ぎると自動で削除されます。必要な動画は期限内にダウンロードして保存してください（案件の納品ファイルは対象外）。
            </div>
            <div className="flex items-center gap-2 p-3">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="ファイルを添付"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-night-400 hover:text-night-700 disabled:opacity-40"
              >
                {uploading ? "…" : "📎"}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => void upload(e.target.files)} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) void send();
                }}
                placeholder={thread === null ? "メッセージを入力" : "この案件についてのメッセージ"}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-night-500 focus:outline-none"
              />
              <button
                onClick={() => void send()}
                disabled={!input.trim() && !attach}
                className="rounded-lg bg-night-500 px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-night-600"
              >
                送信
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
