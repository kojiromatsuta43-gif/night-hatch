"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
};

/** SQLite の datetime('now') は UTC なので、日本時間に直して表示する */
function toDate(sqlDatetime: string) {
  return new Date(sqlDatetime.replace(" ", "T") + "Z");
}

function formatWhen(sqlDatetime: string) {
  const d = toDate(sqlDatetime);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function isToday(sqlDatetime: string) {
  const d = toDate(sqlDatetime);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
}

const KIND_COLOR: Record<string, string> = {
  deadline: "bg-amber-500",
  status: "bg-emerald-500",
};

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "read">("unread");
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // 前回と同じ内容なら state を触らない（30秒ごとの再描画で画面が重くならないように）
  const lastRef = useRef("");
  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Notification[]; unread: number }>("/api/notifications");
      const key = data.unread + ":" + data.items.map((n) => n.id + (n.read_at ? "r" : "u")).join(",");
      if (key === lastRef.current) return;
      lastRef.current = key;
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // 未ログイン時などは黙って何もしない
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    // 画面が見えているときだけ取りに行く（裏タブ・スマホのバックグラウンドでは動かさない）
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 45000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // パネルの外側をクリックしたら閉じる
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAll = async () => {
    await api("/api/notifications", { method: "POST", body: JSON.stringify({ all: true }) });
    void load();
  };

  const openItem = async (n: Notification) => {
    if (!n.read_at) {
      await api("/api/notifications", { method: "POST", body: JSON.stringify({ id: n.id }) });
      void load();
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const shown = items.filter((n) => (tab === "unread" ? !n.read_at : Boolean(n.read_at)));
  const todays = shown.filter((n) => isToday(n.created_at));
  const earlier = shown.filter((n) => !isToday(n.created_at));

  const list = (group: Notification[]) =>
    group.map((n) => (
      <button
        key={n.id}
        onClick={() => void openItem(n)}
        className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
      >
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_COLOR[n.kind] ?? "bg-honey-500"}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-slate-400">{formatWhen(n.created_at)}</span>
          <span className="block text-sm font-medium text-slate-900">{n.title}</span>
          {n.body && <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>}
        </span>
      </button>
    ));

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `通知 ${unread}件の未読` : "通知"}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-bold text-slate-900">通知</span>
            <button onClick={() => void markAll()} className="text-xs text-honey-700 hover:underline disabled:text-slate-300" disabled={unread === 0}>
              すべて既読にする
            </button>
          </div>

          <div className="flex gap-1 border-b border-slate-200 px-3 py-2">
            {(["unread", "read"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  tab === t ? "bg-honey-400 text-hive-900" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {t === "unread" ? `新しい通知${unread > 0 ? ` (${unread})` : ""}` : "確認済"}
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {shown.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                {tab === "unread" ? "新しい通知はありません" : "確認済の通知はありません"}
              </p>
            )}
            {todays.length > 0 && (
              <>
                <div className="bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-500">今日</div>
                {list(todays)}
              </>
            )}
            {earlier.length > 0 && (
              <>
                <div className="bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-500">その前</div>
                {list(earlier)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
