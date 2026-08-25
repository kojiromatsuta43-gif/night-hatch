"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { useMascot } from "@/components/MascotProvider";

type User = { id: string; email: string; name: string; role: string; points: number; created_at: string };
type NgWord = { id: string; word: string };
type MonitorMessage = { id: string; body: string; from_name: string; to_name: string; created_at: string };
type RefAccount = { id: string; name: string; handle: string; industry: string; followers: number; loaded_videos: number };

export default function AdminPage() {
  const { mascot } = useMascot();
  const { me } = useMe();
  const [tab, setTab] = useState<"users" | "ng" | "chats" | "refs">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [ngWords, setNgWords] = useState<NgWord[]>([]);
  const [monitor, setMonitor] = useState<{ messages: MonitorMessage[]; ngWords: string[] }>({ messages: [], ngWords: [] });
  const [newWord, setNewWord] = useState("");
  const [refs, setRefs] = useState<RefAccount[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>("");
  const [refForm, setRefForm] = useState<{ accountId?: string; name: string; handle: string; industry: string; followers: string; bio: string; videos: string }>({ name: "", handle: "", industry: "", followers: "", bio: "", videos: "" });

  const load = useCallback(() => {
    api<User[]>("/api/admin/users").then(setUsers).catch(() => {});
    api<NgWord[]>("/api/admin/ng-words").then(setNgWords).catch(() => {});
    api<{ messages: MonitorMessage[]; ngWords: string[] }>("/api/admin/chats").then(setMonitor).catch(() => {});
    api<RefAccount[]>("/api/ref-accounts").then(setRefs).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (me && me.role !== "admin") {
    return <p className="text-sm text-slate-500">管理者権限が必要です。admin@example.com でログインしてください。</p>;
  }

  const hasNg = (body: string) => monitor.ngWords.some((w) => body.includes(w));

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">管理</h1>
      <div className="mb-6 flex gap-2 text-sm">
        {([["users", "ユーザー管理"], ["ng", "NGワード"], ["chats", "チャット監視"], ["refs", "参考アカウント"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 ${tab === k ? "bg-honey-400 text-hive-900" : "border border-slate-300 text-slate-600"}`}>{label}</button>
        ))}
      </div>

      {tab === "users" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">名前</th>
                <th className="px-4 py-3 font-medium">メール</th>
                <th className="px-4 py-3 font-medium">ロール</th>
                <th className="px-4 py-3 font-medium text-right">{mascot.pointName}</th>
                <th className="px-4 py-3 font-medium">登録日</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{u.role}</span></td>
                  <td className="px-4 py-3 text-right">{u.points}{mascot.pointEmoji}</td>
                  <td className="px-4 py-3">{u.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ng" && (
        <div className="max-w-xl">
          <div className="mb-4 flex gap-2">
            <input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="NGワードを入力" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button
              onClick={async () => { if (!newWord.trim()) return; await api("/api/admin/ng-words", { method: "POST", body: JSON.stringify({ word: newWord.trim() }) }); setNewWord(""); load(); }}
              className="rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900"
            >追加</button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white">
            {ngWords.map((w) => (
              <div key={w.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm last:border-0">
                <span>{w.word}</span>
                <button onClick={async () => { await api("/api/admin/ng-words", { method: "DELETE", body: JSON.stringify({ id: w.id }) }); load(); }} className="text-xs text-slate-400 hover:text-rose-500">削除</button>
              </div>
            ))}
            {ngWords.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-400">NGワードがありません</div>}
          </div>
          <p className="mt-3 text-xs text-slate-400">登録したNGワードは、AIエージェントの台本生成とチャット監視で参照されます。</p>
        </div>
      )}

      {tab === "refs" && (
        <div className="max-w-xl space-y-5">
          <div className="rounded-xl border border-honey-200 bg-honey-50/60 p-5">
            <h3 className="text-sm font-bold">移行元から参考動画を一括インポート</h3>
            <p className="mt-1 text-xs text-slate-600">
              登録済みアカウントに対応する動画（キャプション・サムネイル・TikTok URL）を移行元CMSから取得します。
              既存の動画は置き換えられます。数分かかる場合があります。
            </p>
            <button
              onClick={async () => {
                if (!confirm("移行元から全アカウントの動画を取り込みます。よろしいですか？")) return;
                setImporting(true);
                setImportResult("");
                try {
                  const r = await api<{ importedAccounts: number; importedVideos: number; skippedCount: number }>(
                    "/api/admin/import-videos", { method: "POST" }
                  );
                  setImportResult(`✓ ${r.importedAccounts}アカウント / ${r.importedVideos}本の動画を取り込みました${r.skippedCount ? `（${r.skippedCount}件スキップ）` : ""}`);
                  load();
                } catch (e) {
                  setImportResult(`エラー: ${e instanceof Error ? e.message : "失敗しました"}`);
                } finally {
                  setImporting(false);
                }
              }}
              disabled={importing}
              className="mt-3 rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900 disabled:opacity-40"
            >
              {importing ? "インポート中...（そのままお待ちください）" : "動画を一括インポート"}
            </button>
            {importResult && <p className="mt-2 text-xs font-medium text-slate-700">{importResult}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-bold">既存アカウントに動画を追加</h3>
            <select
              value={refForm.accountId ?? ""}
              onChange={(e) => setRefForm({ ...refForm, accountId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">（新規アカウントを作成する）</option>
              {refs.map((r) => <option key={r.id} value={r.id}>{r.name} {r.handle}</option>)}
            </select>
            {!refForm.accountId && <h3 className="text-sm font-bold pt-2">新規アカウント情報</h3>}
            {!refForm.accountId && ([["name", "アカウント名"], ["handle", "@ハンドル"], ["industry", "業界（美容室・飲食など）"], ["followers", "フォロワー数（数字）"], ["bio", "紹介文"]] as const).map(([k, ph]) => (
              <input
                key={k}
                value={refForm[k]}
                onChange={(e) => setRefForm({ ...refForm, [k]: e.target.value })}
                placeholder={ph}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            ))}
            <textarea
              value={refForm.videos}
              onChange={(e) => setRefForm({ ...refForm, videos: e.target.value })}
              rows={4}
              placeholder={"動画（1行に1本）。TikTokのURLだけ貼ればキャプションとサムネイルは自動取得します。\nhttps://www.tiktok.com/@xxx/video/1234567890\nまたは: キャプション | URL"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={async () => {
                if (!refForm.accountId && !refForm.name.trim()) return;
                await api("/api/ref-accounts", { method: "POST", body: JSON.stringify({ ...refForm, accountId: refForm.accountId || undefined, followers: Number(refForm.followers) || 0 }) });
                setRefForm({ name: "", handle: "", industry: "", followers: "", bio: "", videos: "" });
                load();
              }}
              className="rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900"
            >追加</button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white">
            {refs.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm last:border-0">
                <span><b>{r.name}</b> <span className="text-slate-400">{r.handle} / {r.industry}</span></span>
                <span className="text-xs text-slate-400">
                  {r.followers.toLocaleString()}フォロワー・
                  <b className={r.loaded_videos ? "text-emerald-600" : "text-slate-400"}>{r.loaded_videos}本</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "chats" && (
        <div className="rounded-xl border border-slate-200 bg-white">
          {monitor.messages.map((m) => (
            <div key={m.id} className={`border-b border-slate-100 px-4 py-3 text-sm last:border-0 ${hasNg(m.body) ? "bg-rose-50" : ""}`}>
              <div className="mb-0.5 flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-slate-600">{m.from_name}</span>→<span className="font-medium text-slate-600">{m.to_name}</span>
                <span>{m.created_at.slice(0, 16)}</span>
                {hasNg(m.body) && <span className="rounded bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-600">NGワード検出</span>}
              </div>
              {m.body}
            </div>
          ))}
          {monitor.messages.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">メッセージがありません</div>}
        </div>
      )}
    </div>
  );
}
