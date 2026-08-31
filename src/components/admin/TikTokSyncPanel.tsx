"use client";

/**
 * 管理画面「TikTok取り込み」タブ。
 * @ハンドル／検索ワード／#タグ を業種付きで登録し、「今すぐ取り込む」で外部サービスから動画と再生数を入れる。
 * 以後は毎日自動で更新される（サーバー側の定期処理）。
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Query = { id: string; kind: "profile" | "search" | "hashtag"; value: string; industry: string; active: number; last_run_at: string | null; last_result: string };
type Run = { id: string; started_at: string; finished_at: string | null; status: string; queries: number; videos: number; accounts: number; message: string };
type Status = { configured: boolean; syncing: boolean; queries: Query[]; runs: Run[]; lastSync: string | null; totals: { videos: number; synced: number } };

const KIND_LABEL: Record<Query["kind"], string> = { profile: "アカウント", search: "検索ワード", hashtag: "ハッシュタグ" };
const fmt = (iso: string | null) => (iso ? iso.replace("T", " ").slice(0, 16) : "-");

export default function TikTokSyncPanel({ industries }: { industries: string[] }) {
  const [st, setSt] = useState<Status | null>(null);
  const [kind, setKind] = useState<Query["kind"]>("search");
  const [value, setValue] = useState("");
  const [industry, setIndustry] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Status>("/api/admin/tiktok").then(setSt).catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗"));
  }, []);
  useEffect(load, [load]);
  // 実行中は10秒ごとに様子を見る
  useEffect(() => {
    if (!st?.syncing) return;
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [st?.syncing, load]);

  const add = async () => {
    setError("");
    try {
      await api("/api/admin/tiktok", { method: "POST", body: JSON.stringify({ kind, value, industry }) });
      setValue("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗");
    }
  };

  const sync = async (ids?: string[]) => {
    setError("");
    setBusy(true);
    try {
      await api("/api/admin/tiktok/sync", { method: "POST", body: JSON.stringify({ queryIds: ids }) });
      setTimeout(load, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "開始に失敗");
    } finally {
      setBusy(false);
    }
  };

  const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-honey-500 focus:outline-none";

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-4 text-sm ${st?.configured ? "border-honey-200 bg-honey-50/50 text-hive-900" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
        {st === null
          ? "読み込み中…"
          : st.configured
            ? <>登録したアカウント・検索ワードの動画と再生数を、週1回自動で取り込みます（1回あたり設定1件につき最新20本）。手動で入れた動画はそのまま残ります。
                <span className="ml-2 text-xs text-slate-500">最終取り込み {fmt(st.lastSync)}／取り込み済み {st.totals.synced} 本（全 {st.totals.videos} 本）</span></>
            : "取り込みの鍵（APIFY_TOKEN）がまだ設定されていません。Railway の Variables に追加すると使えるようになります。"}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold">取り込み設定を追加</div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as Query["kind"])} className={input}>
            <option value="search">検索ワード</option>
            <option value="profile">アカウント（@ハンドル）</option>
            <option value="hashtag">ハッシュタグ</option>
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === "profile" ? "@handle またはプロフィールURL" : kind === "hashtag" ? "#博多グルメ" : "例: 博多 居酒屋"}
            className={`${input} min-w-[16rem] flex-1`}
          />
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={input}>
            <option value="">業種を選ぶ</option>
            {industries.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button onClick={add} disabled={!value.trim() || !industry} className="rounded-lg bg-honey-400 px-4 py-2 text-sm font-medium text-hive-900 disabled:opacity-40">追加</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          検索ワードで見つかった投稿者は、ここで選んだ業種の参考アカウントとして自動登録されます。1回の取り込みで設定1件あたり最新20本まで。
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <span className="text-sm font-semibold">取り込み設定 {st?.queries.length ?? 0} 件</span>
          <button
            onClick={async () => {
              setError("");
              try {
                const r = await api<{ accounts: number; videos: number }>("/api/admin/tiktok", { method: "POST", body: JSON.stringify({ action: "prune" }) });
                alert(`お手本にならないアカウント ${r.accounts} 件（動画 ${r.videos} 本）を整理しました`);
                load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "整理に失敗");
              }
            }}
            className="mr-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:border-honey-400"
            title="日本語の動画が無い投稿者や、フォロワーが多すぎるテレビ局・芸能人などを取り込み分から外します"
          >
            取り込み分を整理
          </button>
          <button
            onClick={() => sync()}
            disabled={busy || !st?.configured || st?.syncing || (st?.queries.length ?? 0) === 0}
            className="rounded-lg bg-hive-900 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {st?.syncing ? "取り込み中…（数分かかります）" : "今すぐ全部取り込む"}
          </button>
        </div>
        {(st?.queries ?? []).map((q) => (
          <div key={q.id} className={`flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-sm last:border-0 ${q.active ? "" : "opacity-50"}`}>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{KIND_LABEL[q.kind]}</span>
            <span className="font-medium">{q.value}</span>
            <span className="rounded-full bg-honey-50 px-2 py-0.5 text-xs text-hive-900">{q.industry}</span>
            <span className="ml-auto text-xs text-slate-400">
              {q.last_run_at ? `${fmt(q.last_run_at)} ${q.last_result}` : "未実行"}
            </span>
            <button onClick={() => sync([q.id])} disabled={busy || !st?.configured || st?.syncing} className="text-xs text-honey-700 hover:underline disabled:opacity-40">これだけ取り込む</button>
            <button
              onClick={async () => { await api(`/api/admin/tiktok/${q.id}`, { method: "PATCH", body: JSON.stringify({ active: !q.active }) }); load(); }}
              className="text-xs text-slate-500 hover:underline"
            >
              {q.active ? "止める" : "再開"}
            </button>
            <button
              onClick={async () => { if (!confirm(`「${q.value}」を削除しますか？（取り込み済みの動画は残ります）`)) return; await api(`/api/admin/tiktok/${q.id}`, { method: "DELETE" }); load(); }}
              className="text-xs text-rose-500 hover:underline"
            >
              削除
            </button>
          </div>
        ))}
        {st && st.queries.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-400">まだ設定がありません。上のフォームから追加してください。</div>}
      </div>

      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

      {st && st.runs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold">実行の記録</div>
          {st.runs.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2 text-xs last:border-0">
              <span className="text-slate-500">{fmt(r.started_at)}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${r.status === "done" ? "bg-emerald-100 text-emerald-700" : r.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"}`}>
                {r.status === "done" ? "完了" : r.status === "failed" ? "失敗" : "実行中"}
              </span>
              <span className="text-slate-700">{r.message || `設定${r.queries}件`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
