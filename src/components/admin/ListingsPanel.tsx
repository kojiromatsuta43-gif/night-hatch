"use client";

/**
 * 管理画面「サイト掲載」: 公開サイト Night HATCH に載るお店の一覧。
 * お店が同意したものを確認して「公開する」。URL名（slug）の変更、今月のLINEボタンのクリック数もここ。
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { STATUS_LABEL, type Listing, type ListingStatus } from "@/lib/listing";

type Row = Listing & { status: ListingStatus; owner_name: string | null; owner_email: string | null; clicks_drink: number; clicks_work: number; video_count: number };

const BADGE: Record<ListingStatus, string> = {
  draft: "bg-hive-200 text-hive-700",
  review: "bg-gold-400 text-ink-900",
  live: "bg-[#06C755] text-white",
};

export default function ListingsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Row[]>("/api/admin/listings").then(setRows).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const patch = async (id: string, body: { admin_published?: boolean; slug?: string }) => {
    setErr("");
    setBusy(id);
    try {
      await api("/api/admin/listings", { method: "PATCH", body: JSON.stringify({ id, ...body }) });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "変更できませんでした");
    } finally {
      setBusy(null);
    }
  };

  if (!rows) return <p className="text-sm text-slate-500">{err || "読み込み中…"}</p>;
  const review = rows.filter((r) => r.status === "review").length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-night-200 bg-night-50/50 p-4 text-sm text-hive-900">
        公開サイト（<a href="/site" target="_blank" rel="noreferrer" className="font-bold text-gold-600 hover:underline">/site</a>）に載るお店です。
        お店が「HPの掲載」で同意すると <b>確認待ち</b> になります。許可・届出、料金の書き方、写真・動画（露出・未成年に見える出演がないか）を見てから「公開する」を押してください。
        {review > 0 && <span className="ml-2 rounded-full bg-gold-400 px-2 py-0.5 text-xs font-black text-ink-900">確認待ち {review} 件</span>}
      </div>
      {err && <p className="text-sm font-bold text-rose-500">{err}</p>}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid items-center gap-3 rounded-xl border border-night-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${BADGE[r.status]}`}>{r.status === "review" ? "確認待ち" : STATUS_LABEL[r.status]}</span>
                <span className="font-bold text-hive-900">{r.store_name || "（店名なし）"}</span>
                <span className="text-xs text-hive-500">{[r.genre, r.area].filter(Boolean).join("・")}</span>
              </div>
              <p className="mt-1 truncate text-xs text-hive-500">
                {r.owner_name ?? "デモ"}{r.owner_email ? `（${r.owner_email}）` : ""} ・ 動画 {r.video_count + r.tiktok_urls.length} 本 ・ 写真 {r.photos.length} 枚 ・ 今月のLINE 予約 {r.clicks_drink}／体入 {r.clicks_work}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-hive-500">
                URL: /site/stores/
                <input
                  defaultValue={r.slug}
                  onBlur={(e) => e.target.value.trim() !== r.slug && patch(r.id, { slug: e.target.value })}
                  className="w-44 rounded border border-night-200 bg-white px-1.5 py-0.5 text-xs text-hive-900"
                  aria-label="URL名"
                />
              </p>
            </div>
            <div className="flex gap-2">
              <a href={`/site/stores/${r.slug}`} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-hive-700 hover:bg-night-50">見る ↗</a>
              {r.admin_published ? (
                <button disabled={busy === r.id} onClick={() => patch(r.id, { admin_published: false })} className="rounded-full border border-rose-400 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 disabled:opacity-50">非公開にする</button>
              ) : (
                <button disabled={busy === r.id || r.status === "draft"} onClick={() => patch(r.id, { admin_published: true })} className="rounded-full bg-night-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-night-600 disabled:opacity-40" title={r.status === "draft" ? "お店の同意と公式LINEのURLが必要です" : ""}>公開する</button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-hive-500">まだ掲載情報はありません。お店が「HPの掲載」を開くと、ここに並びます。</p>}
      </div>
    </div>
  );
}
