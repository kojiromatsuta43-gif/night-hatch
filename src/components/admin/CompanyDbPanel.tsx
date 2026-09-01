"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

type Status = { phase: "empty" | "uploading" | "uploaded" | "ingesting" | "ready" | "error"; total: number; message: string; updatedAt: string; columns: string[]; uploadedBytes: number; fileSize: number };
type Facet = { v: string; n: number };
type Data = {
  status: Status;
  disk: { parquet: number; db: number; part: number };
  summary: { total: number; facets: { prefectures: Facet[]; industries: Facet[]; sources: Facet[]; withPhone: number; withEmail: number; withForm: number } } | null;
};

const CHUNK = 8 * 1024 * 1024;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(0)}MB`;
const PHASE_LABEL: Record<Status["phase"], string> = {
  empty: "未取り込み",
  uploading: "アップロード中",
  uploaded: "アップロード済み（取り込み待ち）",
  ingesting: "取り込み中",
  ready: "使えます",
  error: "エラー",
};

export default function CompanyDbPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<Data>("/api/admin/companydb").then(setData).catch((e) => setMsg(e instanceof Error ? e.message : "読み込めませんでした"));
  }, []);
  useEffect(load, [load]);
  // 取り込み中は自動で更新
  useEffect(() => {
    if (data?.status.phase !== "ingesting") return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [data?.status.phase, load]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.parquet$/i.test(file.name)) {
      setMsg("Parquet ファイル（.parquet）を選んでください");
      return;
    }
    setMsg("");
    const id = crypto.randomUUID();
    const total = Math.ceil(file.size / CHUNK);
    setProgress({ sent: 0, total: file.size });
    try {
      for (let i = 0; i < total; i++) {
        const blob = file.slice(i * CHUNK, Math.min(file.size, (i + 1) * CHUNK));
        let ok = false;
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          const res = await fetch("/api/admin/companydb/upload", {
            method: "POST",
            headers: { "x-upload-id": id, "x-chunk-index": String(i), "x-chunk-total": String(total), "x-file-size": String(file.size) },
            body: blob,
          });
          if (res.ok) ok = true;
          else if (attempt === 2) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error ?? `HTTP ${res.status}`);
          } else await new Promise((r) => setTimeout(r, 2000));
        }
        setProgress({ sent: Math.min(file.size, (i + 1) * CHUNK), total: file.size });
      }
      setMsg("アップロードが終わりました。「取り込みを開始」を押してください。");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const act = async (action: "ingest" | "reset") => {
    if (action === "reset" && !window.confirm("企業DBを全部消します（営業リストに追加済みの会社はそのまま残ります）。よろしいですか？")) return;
    setMsg("");
    try {
      await api("/api/admin/companydb", { method: "POST", body: JSON.stringify({ action }) });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "失敗しました");
    }
  };

  if (!data) return <p className="text-sm text-slate-500">{msg || "読み込み中..."}</p>;
  const st = data.status;

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded border-2 border-hive-900 bg-white p-4">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-bold">企業データベース</h2>
          <span className={`rounded px-2 py-0.5 text-xs font-bold ${st.phase === "ready" ? "bg-honey-400 text-hive-900" : st.phase === "error" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
            {PHASE_LABEL[st.phase]}
          </span>
          {st.phase === "ready" && <span className="text-sm">{st.total.toLocaleString()} 社</span>}
        </div>
        <p className="text-xs text-slate-500">
          Mac の DuckDB から書き出した Parquet を入れると、営業リスト画面の「企業DBから探す」で条件検索してリストに追加できるようになります。
          容量: DB {mb(data.disk.db)}{data.disk.parquet ? ` / Parquet ${mb(data.disk.parquet)}` : ""}{data.disk.part ? ` / 途中ファイル ${mb(data.disk.part)}` : ""}
        </p>
        {st.message && st.phase !== "uploading" && <p className={`mt-2 text-sm ${st.phase === "error" ? "text-rose-600" : "text-slate-700"}`}>{st.message}</p>}
      </section>

      <section className="rounded border-2 border-hive-900 bg-white p-4">
        <h3 className="mb-2 text-sm font-bold">1. Mac で Parquet を書き出す（ターミナルに貼り付け）</h3>
        <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{`cd ~/zerotel-export && duckdb ブリッジハッチ営業リスト.duckdb -c "COPY (SELECT * FROM 全企業 ORDER BY 都道府県, 大業界) TO '全企業.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)"`}</pre>
        <p className="mt-1 text-xs text-slate-500">数分かかります。~/zerotel-export/全企業.parquet ができます（数百MB）。</p>
      </section>

      <section className="rounded border-2 border-hive-900 bg-white p-4">
        <h3 className="mb-2 text-sm font-bold">2. ここにアップロード</h3>
        <input ref={fileRef} type="file" accept=".parquet" disabled={!!progress || st.phase === "ingesting"} onChange={(e) => upload(e.target.files?.[0])} className="text-sm" />
        {progress && (
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-honey-400" style={{ width: `${Math.round((progress.sent / progress.total) * 100)}%` }} />
            </div>
            <div className="mt-1 text-xs text-slate-500">{mb(progress.sent)} / {mb(progress.total)}（この画面を閉じないでください）</div>
          </div>
        )}
      </section>

      <section className="rounded border-2 border-hive-900 bg-white p-4">
        <h3 className="mb-2 text-sm font-bold">3. 取り込み</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => act("ingest")} disabled={!(st.phase === "uploaded" || st.phase === "error") || !!progress} className="rounded border-2 border-hive-900 bg-honey-400 px-4 py-1.5 text-sm font-bold text-hive-900 disabled:opacity-40">
            取り込みを開始
          </button>
          <button onClick={() => act("reset")} disabled={st.phase === "ingesting" || !!progress} className="rounded border-2 border-hive-900 bg-white px-4 py-1.5 text-sm text-rose-600 disabled:opacity-40">
            全部消してやり直す
          </button>
          {st.phase === "ingesting" && <span className="text-xs text-slate-500">5秒ごとに自動で確認しています…</span>}
        </div>
        <p className="mt-2 text-xs text-slate-500">重複（法人番号が同じ会社）は充足率の高い出典を残して1件にまとめます。取り込みが終わると Parquet は消して容量を空けます。</p>
        {msg && <p className="mt-2 text-sm text-slate-700">{msg}</p>}
      </section>

      {data.summary && (
        <section className="rounded border-2 border-hive-900 bg-white p-4 text-sm">
          <h3 className="mb-2 text-sm font-bold">内訳</h3>
          <div className="mb-3 flex flex-wrap gap-4 text-xs">
            <span>電話あり {data.summary.facets.withPhone.toLocaleString()}</span>
            <span>メールあり {data.summary.facets.withEmail.toLocaleString()}</span>
            <span>問合せフォームあり {data.summary.facets.withForm.toLocaleString()}</span>
            {data.summary.facets.sources.map((s) => <span key={s.v}>{s.v} {s.n.toLocaleString()}</span>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <div className="mb-1 font-bold">都道府県（上位）</div>
              {data.summary.facets.prefectures.slice(0, 12).map((f) => <div key={f.v} className="flex justify-between border-b border-slate-100 py-0.5"><span>{f.v}</span><span>{f.n.toLocaleString()}</span></div>)}
            </div>
            <div>
              <div className="mb-1 font-bold">業界（上位）</div>
              {data.summary.facets.industries.slice(0, 12).map((f) => <div key={f.v} className="flex justify-between border-b border-slate-100 py-0.5"><span>{f.v}</span><span>{f.n.toLocaleString()}</span></div>)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
