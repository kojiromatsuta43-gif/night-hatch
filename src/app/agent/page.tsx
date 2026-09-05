"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import { api } from "@/lib/client";
import AiUsage from "@/components/AiUsage";
import { Mascot, PointInline, useMascot } from "@/components/MascotProvider";
import MicButton from "@/components/MicButton";
import ClientOnly from "@/components/ClientOnly";
import PlatformIcon from "@/components/PlatformIcon";
import { POINTS_BY_CATEGORY } from "@/lib/data";
import { BRAND } from "@/lib/brand";
import { retryImage, thumbUrl } from "@/lib/client-img";

// ============================================================
//  AIエージェント
//  会話だけでなく、参考動画さがし → 台本 → 発注条件 → 内容確認 → 発注
//  まで、この画面の中で完結する。
// ============================================================

type VideoHit = {
  id: string; caption: string; url: string; hue: number;
  accountName: string; handle: string; followers: number; industry: string;
  views?: number; posted_at?: string;
};
type OrderDraft = {
  category: string; title: string; deadline: string; note: string;
  refUrl: string; refTitle: string; scriptText: string;
};
type Payload =
  | { type: "videos"; keyword: string; items: VideoHit[] }
  | { type: "script"; refUrl: string; refTitle: string }
  | { type: "order_form"; draft: OrderDraft }
  | { type: "order_confirm"; draft: OrderDraft; points: number; balance: number }
  | { type: "order_done"; projectId: string; title: string; points: number };

type Msg = { role: "user" | "assistant"; content: string; payload?: Payload };
type AgentSession = { id: string; title: string; createdAt: string; pinned?: boolean; messages: Msg[] };
type BrandProfile = { id: string; name: string };

// クイック操作とプロンプト集は看板ごと（src/lib/brands/*.ts）
const QUICK_ACTIONS = BRAND.agent.quickActions;
const PROMPT_LIBRARY = BRAND.agent.promptLibrary;

const STAGES = ["発注準備", "台本作成", "発注条件", "内容確認", "発注完了"] as const;

function stageOf(messages: Msg[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const p = messages[i].payload;
    if (!p) continue;
    if (p.type === "order_done") return 4;
    if (p.type === "order_confirm") return 3;
    if (p.type === "order_form") return 2;
    if (p.type === "script") return 1;
    if (p.type === "videos") return 0;
  }
  return 0;
}

const fmtFollowers = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString());

function AgentPageInner() {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [ngFlags, setNgFlags] = useState<string[]>([]);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptQuery, setPromptQuery] = useState("");
  const [usageKey, setUsageKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { mascot } = useMascot();

  const loadSessions = () => api<AgentSession[]>("/api/agent").then(setSessions).catch(() => {});
  useEffect(() => {
    api<AgentSession[]>("/api/agent").then(setSessions).catch(() => {});
    api<BrandProfile[]>("/api/brand-profiles").then(setProfiles).catch(() => {});
  }, []);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const renameSession = async (s: AgentSession) => {
    setMenuFor(null);
    const title = window.prompt("会話の名前", s.title);
    if (!title || title.trim() === s.title) return;
    await api(`/api/agent/sessions/${s.id}`, { method: "PATCH", body: JSON.stringify({ title }) }).catch(() => {});
    loadSessions();
  };
  const pinSession = async (s: AgentSession) => {
    setMenuFor(null);
    await api(`/api/agent/sessions/${s.id}`, { method: "PATCH", body: JSON.stringify({ pinned: !s.pinned }) }).catch(() => {});
    loadSessions();
  };
  const deleteSession = async (s: AgentSession) => {
    setMenuFor(null);
    if (!window.confirm(`「${s.title}」を削除しますか？`)) return;
    await api(`/api/agent/sessions/${s.id}`, { method: "DELETE" }).catch(() => {});
    if (s.id === sessionId) { setSessionId(null); setMessages([]); }
    loadSessions();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const post = async (body: Record<string, unknown>, optimistic?: Msg) => {
    if (busy) return;
    setError("");
    setNgFlags([]);
    if (optimistic) setMessages((m) => [...m, optimistic]);
    setBusy(true);
    try {
      const res = await api<{ sessionId: string; reply: string; payload: Payload | null; ngFlags?: string[] }>(
        "/api/agent",
        { method: "POST", body: JSON.stringify({ sessionId, brandProfileId: profileId || undefined, ...body }) }
      );
      setSessionId(res.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply, payload: res.payload ?? undefined }]);
      if (res.ngFlags?.length) setNgFlags(res.ngFlags);
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

  const act = (action: Record<string, unknown>, label: string) =>
    post({ action }, { role: "user", content: label });

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

  const stage = stageOf(messages);
  const filteredPrompts = PROMPT_LIBRARY.filter((p) => !promptQuery || p.includes(promptQuery));

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <aside className="w-56 shrink-0 overflow-y-auto">
        <button
          onClick={() => { setSessionId(null); setMessages([]); setError(""); }}
          className="mb-3 w-full rounded-lg bg-food-500 px-3 py-2 text-sm font-medium text-white hover:bg-food-600"
        >
          ＋ 新しい会話
        </button>
        <div className="space-y-1">
          {sessions.map((s) => (
            <div key={s.id} className={`group relative flex items-center rounded-lg ${s.id === sessionId ? "bg-food-50" : "hover:bg-slate-100"}`}>
              <button
                onClick={() => openSession(s)}
                className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${s.id === sessionId ? "text-food-700" : "text-slate-600"}`}
                title={s.title}
              >
                {s.pinned && <span className="mr-1 text-[10px]" aria-label="ピン留め">📌</span>}
                {s.title}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === s.id ? null : s.id); }}
                className={`mr-1 shrink-0 rounded px-1.5 py-1 text-slate-500 hover:bg-white hover:text-hive-900 ${menuFor === s.id ? "" : "opacity-0 group-hover:opacity-100"}`}
                aria-label="会話のメニュー"
              >
                ⋯
              </button>
              {menuFor === s.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                  <div className="absolute right-1 top-9 z-20 w-36 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
                    <button onClick={() => pinSession(s)} className="block w-full px-3 py-1.5 text-left hover:bg-slate-100">{s.pinned ? "ピン留めを外す" : "ピン留め"}</button>
                    <button onClick={() => renameSession(s)} className="block w-full px-3 py-1.5 text-left hover:bg-slate-100">名前を変更</button>
                    <button onClick={() => deleteSession(s)} className="block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50">削除</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
          <Mascot className="h-7 w-7 shrink-0" />
          <span className="text-sm font-semibold text-hive-900">{mascot.agentTitle}</span>
          <div className="hidden sm:block"><AiUsage refreshKey={usageKey} compact /></div>
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

        {/* 進行バー: いま発注のどの段階にいるか */}
        {messages.length > 0 && (
          <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-2">
            {STAGES.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-1">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={`truncate text-center text-[10px] ${i <= stage ? "font-bold text-food-700" : "text-slate-300"}`}>
                    {s}
                  </span>
                  <span className={`h-1 rounded-full ${i < stage ? "bg-food-500" : i === stage ? "bg-food-300" : "bg-slate-100"}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <div className="mx-auto mt-8 max-w-2xl text-center">
              <Mascot className="mx-auto h-20 w-20 animate-bee-float" />
              <div className="relative mx-auto mt-4 inline-block rounded-2xl border border-food-200 bg-food-50 px-6 py-4">
                <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-food-200 bg-food-50" />
                <p className="text-lg font-bold text-hive-900">{mascot.greeting}</p>
                <p className="mt-1 text-sm text-slate-600">
                  参考動画さがし・台本作成から、発注の登録まで会話で進められます。
                </p>
              </div>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {QUICK_ACTIONS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.prompt)}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-food-400 hover:bg-food-50"
                  >
                    <Mascot className="h-7 w-7 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-hive-900">{q.label}</span>
                      <span className="block text-xs text-slate-400">{q.hint}</span>
                    </span>
                    <span className="ml-auto text-sm font-semibold text-food-600 opacity-0 transition-opacity group-hover:opacity-100">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl bg-food-500 px-4 py-2 text-sm text-white whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="flex max-w-[95%] gap-2.5">
                    <Mascot className="mt-1 h-8 w-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="prose prose-sm prose-slate max-w-none rounded-2xl rounded-tl-md border border-food-100 bg-food-50/60 px-4 py-3 [&_h1]:text-base [&_h2]:text-sm [&_h1]:font-bold [&_h2]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }}
                      />
                      {m.payload && (
                        <PayloadView
                          payload={m.payload}
                          isLatest={i === messages.length - 1}
                          busy={busy}
                          act={act}
                          content={m.content}
                        />
                      )}
                      {!m.payload && (
                        <button onClick={() => saveScript(m.content)} className="mt-1 text-xs font-medium text-food-600 hover:underline">
                          台本として保存
                        </button>
                      )}
                      {m.payload?.type === "script" && (
                        <button onClick={() => saveScript(m.content)} className="mt-1 mr-3 text-xs font-medium text-food-600 hover:underline">
                          台本として保存
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2.5">
                <Mascot className="h-8 w-8 shrink-0 animate-bee-float" />
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-food-100 bg-food-50/60 px-4 py-3">
                  <span className="h-2 w-2 animate-bee-dot rounded-full bg-food-500" />
                  <span className="h-2 w-2 animate-bee-dot rounded-full bg-food-500 [animation-delay:0.18s]" />
                  <span className="h-2 w-2 animate-bee-dot rounded-full bg-food-500 [animation-delay:0.36s]" />
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
          {promptOpen && (
            <div className="mb-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              <input
                value={promptQuery}
                onChange={(e) => setPromptQuery(e.target.value)}
                placeholder="プロンプトを検索..."
                className="mb-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-food-500 focus:outline-none"
              />
              <div className="max-h-40 overflow-y-auto">
                {filteredPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setInput(p); setPromptOpen(false); setPromptQuery(""); }}
                    className="block w-full rounded-lg px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-food-50"
                  >
                    {p}
                  </button>
                ))}
                {filteredPrompts.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400">見つかりませんでした</p>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setPromptOpen((v) => !v)}
              className={`mt-1 self-start rounded-lg border px-2.5 py-1.5 text-xs ${promptOpen ? "border-food-400 bg-food-50 text-food-700" : "border-slate-300 text-slate-500 hover:border-food-400"}`}
              title="定型プロンプトから選ぶ"
            >
              📋 プロンプト
            </button>
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
              placeholder={`${mascot.talkTo} — 例: ${BRAND.agent.promptLibrary[0]}`}
              className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-food-500 focus:outline-none"
            />
            <MicButton
              onText={(t) => setInput((v) => (v ? v + t : t))}
              title={`${mascot.name}に喋りかける`}
              className="mt-1 self-start"
            />
            <button
              onClick={() => send()}
              disabled={busy || !input.trim()}
              className="rounded-lg bg-food-500 px-5 text-sm font-medium text-white disabled:opacity-40 hover:bg-food-600"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** メッセージに付いた動画カード・発注フォームなどを描く */
function PayloadView({
  payload, isLatest, busy, act, content,
}: {
  payload: Payload;
  isLatest: boolean;
  busy: boolean;
  act: (action: Record<string, unknown>, label: string) => void;
  content: string;
}) {
  if (payload.type === "videos") {
    if (payload.items.length === 0) return null;
    return (
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {payload.items.map((v) => (
          <div key={v.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div
              className="relative aspect-[9/14] w-full"
              style={{ background: `linear-gradient(160deg, hsl(${v.hue}, 45%, 30%), hsl(${v.hue + 30}, 50%, 15%))` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(v.id)}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={retryImage}
              />
              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-white">
                <PlatformIcon platform="tiktok" className="h-2.5 w-2.5" mono /> TikTok
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-6">
                <span className="line-clamp-2 text-[10px] font-semibold leading-snug text-white">{v.caption}</span>
              </span>
            </div>
            <div className="p-2">
              <div className="truncate text-[10px] font-semibold text-hive-900">{v.accountName}</div>
              <div className="text-[9px] text-slate-400">
                {v.views ? `▶ ${fmtFollowers(v.views)}再生 ・ ` : ""}{fmtFollowers(v.followers)}フォロワー ・ {v.industry}
              </div>
              <div className="mt-1.5 flex gap-1">
                <button
                  onClick={() => act({ type: "make_script", videoId: v.id }, `この動画で台本を作って: ${v.caption.slice(0, 30)}`)}
                  disabled={busy}
                  className="flex-1 rounded-md bg-food-500 py-1 text-[10px] font-bold text-white hover:bg-food-600 disabled:opacity-40"
                >
                  この動画で台本を作る
                </button>
                {v.url && (
                  <a href={v.url} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 px-1.5 py-1 text-[10px] text-slate-500 hover:border-food-400">
                    開く
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (payload.type === "script") {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() =>
            act(
              {
                type: "start_order",
                draft: {
                  category: "ショート動画編集",
                  title: "",
                  deadline: "",
                  note: "",
                  refUrl: payload.refUrl,
                  refTitle: payload.refTitle,
                  scriptText: content,
                },
              },
              "この台本で発注に進む"
            )
          }
          disabled={busy}
          className="rounded-lg bg-food-500 px-4 py-2 text-xs font-bold text-white hover:bg-food-600 disabled:opacity-40"
        >
          この台本で発注に進む →
        </button>
      </div>
    );
  }

  if (payload.type === "order_form") {
    return <OrderForm draft={payload.draft} disabled={!isLatest || busy} act={act} />;
  }

  if (payload.type === "order_confirm") {
    const d = payload.draft;
    const short = payload.points > payload.balance;
    return (
      <div className="mt-2 rounded-xl border border-food-200 bg-white p-4 text-xs">
        <div className="mb-2 text-sm font-bold text-hive-900">発注内容の確認</div>
        <dl className="space-y-1.5">
          {[
            ["件名", d.title],
            ["カテゴリ", d.category],
            ["納期", d.deadline],
            ["参考動画", d.refTitle || "なし"],
            ["台本", d.scriptText ? "あり（作成済みの台本を引き継ぎます）" : "なし"],
            ["補足", d.note || "なし"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-16 shrink-0 text-slate-400">{k}</dt>
              <dd className="min-w-0 text-slate-700">{v}</dd>
            </div>
          ))}
          <div className="flex gap-2 border-t border-slate-100 pt-1.5">
            <dt className="w-16 shrink-0 text-slate-400">消費</dt>
            <dd className="font-bold text-food-700">
              {payload.points}
              <PointInline />（残高 {payload.balance}）
            </dd>
          </div>
        </dl>
        {short ? (
          <Link href="/points" className="mt-3 block rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800 hover:bg-amber-100">
            ハニーPが足りません — 追加購入へ →
          </Link>
        ) : (
          <button
            onClick={() => act({ type: "place_order", draft: d }, "この内容で発注する")}
            disabled={!isLatest || busy}
            className="mt-3 w-full rounded-lg bg-food-500 py-2 text-xs font-bold text-white hover:bg-food-600 disabled:opacity-40"
          >
            この内容で発注する
          </button>
        )}
      </div>
    );
  }

  if (payload.type === "order_done") {
    return (
      <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs">
        <div className="font-bold text-emerald-800">発注が完了しました 🎉</div>
        <p className="mt-1 text-emerald-700">
          「{payload.title}」（{payload.points}
          <PointInline />）を募集中として登録しました。
        </p>
        <Link href={`/projects/${payload.projectId}`} className="mt-2 inline-block font-bold text-emerald-700 underline">
          案件を見る →
        </Link>
      </div>
    );
  }

  return null;
}

/** 発注条件の入力フォーム（チャットの中に出る） */
function OrderForm({
  draft, disabled, act,
}: {
  draft: OrderDraft;
  disabled: boolean;
  act: (action: Record<string, unknown>, label: string) => void;
}) {
  const [category, setCategory] = useState(draft.category || "ショート動画編集");
  const [title, setTitle] = useState(draft.title || (draft.refTitle ? `${draft.refTitle.slice(0, 20)}風ショート動画` : ""));
  // 納期の初期値は2週間後
  const [deadline, setDeadline] = useState(
    () => draft.deadline || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(draft.note);

  const input = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-food-500 focus:outline-none";
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-food-200 bg-white p-4">
      <label className="block">
        <span className="text-[11px] font-semibold text-slate-600">件名</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${input} mt-0.5`} placeholder="例: 新メニュー紹介ショート動画" disabled={disabled} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-600">カテゴリ</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${input} mt-0.5`} disabled={disabled}>
            {BRAND.orderable.map((c) => (
              <option key={c} value={c}>
                {c}（{POINTS_BY_CATEGORY[c]}<PointInline />）
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-600">納期</span>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${input} mt-0.5`} disabled={disabled} />
        </label>
      </div>
      <label className="block">
        <span className="text-[11px] font-semibold text-slate-600">補足・希望（任意）</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${input} mt-0.5 resize-none`} placeholder="例: 字幕は大きめ、明るいトーンで" disabled={disabled} />
      </label>
      <button
        onClick={() =>
          act(
            { type: "confirm_order", draft: { ...draft, category, title, deadline, note } },
            "発注条件を入力した"
          )
        }
        disabled={disabled || !title.trim() || !deadline}
        className="w-full rounded-lg bg-food-500 py-2 text-xs font-bold text-white hover:bg-food-600 disabled:opacity-40"
      >
        内容を確認する →
      </button>
    </div>
  );
}

export default function AgentPage() {
  return (
    <ClientOnly>
      <AgentPageInner />
    </ClientOnly>
  );
}
