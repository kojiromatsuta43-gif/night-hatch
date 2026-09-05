"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { parseCsv, guessMapping, LEAD_FIELD_LABELS, type LeadField } from "@/lib/csv";

const FIELDS: LeadField[] = ["company", "contact_name", "phone", "email", "address", "prefecture", "industry", "employees", "website", "form_url", "memo"];
const box = "rounded rounded-xl border border-food-200 bg-white";
const input = "rounded rounded-xl border border-food-200 px-2 py-1 text-sm bg-white";
const btnY = "rounded rounded-xl border border-food-200 px-3 py-1 text-sm font-bold bg-food-500 text-white hover:bg-food-600";

type FormResult = { added: number; excluded: number; suppressed: number; duplicated: number; noUrl: number; withUrl: number };

/**
 * CSV取り込み: ファイル → 列の対応 → プレビュー → 取り込み。
 * 営業リストに入れ、campaignId（または選択したキャンペーン）があればフォーム営業にもそのまま追加する。
 */
export default function LeadCsvImport({
  campaignId,
  campaigns = [],
  onDone,
}: {
  campaignId?: string;
  campaigns?: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [rows, setRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [map, setMap] = useState<Partial<Record<LeadField, number>>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [target, setTarget] = useState(campaignId ?? "");

  const headers = hasHeader ? rows[0] ?? [] : (rows[0] ?? []).map((_, i) => `${i + 1}列目`);
  const body = hasHeader ? rows.slice(1) : rows;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setMsg("");
    setFileName(f.name);
    const buf = await f.arrayBuffer();
    // Excel の CSV は Shift_JIS のことが多いので、UTF-8 で化けたら Shift_JIS で読み直す
    let text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (text.includes("�")) {
      try {
        text = new TextDecoder("shift_jis").decode(buf);
      } catch {
        /* そのまま */
      }
    }
    const parsed = parseCsv(text);
    setRows(parsed);
    setMap(guessMapping(parsed[0] ?? []));
  };

  const toLeads = () =>
    body.map((r) => {
      const o: Record<string, string> = {};
      for (const f of FIELDS) {
        const idx = map[f];
        if (idx !== undefined && idx >= 0) o[f] = r[idx] ?? "";
      }
      return o;
    });

  const submit = async () => {
    if (map.company === undefined) {
      setMsg("「会社名」にあたる列を選んでください");
      return;
    }
    if (target && map.form_url === undefined && map.website === undefined) {
      setMsg("フォーム営業に入れるには「問い合わせフォームURL」か「URL」の列が必要です");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await api<{ added: number; skipped: number; form?: FormResult }>("/api/sales/leads", {
        method: "POST",
        body: JSON.stringify({ rows: toLeads(), source: fileName, campaignId: target || undefined }),
      });
      let m = `${r.added}件を営業リストに取り込みました${r.skipped ? `（重複・空欄 ${r.skipped}件は飛ばしました）` : ""}`;
      if (r.form) m += ` ／ フォーム営業に追加 ${r.form.added}件（除外 ${r.form.excluded + r.form.suppressed}・重複/90日以内 ${r.form.duplicated}・URL無し ${r.form.noUrl}）`;
      setMsg(m);
      setTimeout(onDone, 1200);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "取り込めませんでした");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${box} mb-4 p-4`}>
      <div className="mb-2 text-sm font-bold">CSVを取り込む</div>
      <p className="mb-3 text-xs text-slate-500">
        Excel で「CSV（UTF-8）」または「CSV」形式で保存したファイルを選んでください。列の並びは自由です（企業DBの書き出しもそのまま読めます）。同じ電話番号の会社は重複として飛ばします。
        フォーム営業に使うには「問い合わせフォームURL」か「URL」の列を対応付けてください。
      </p>
      <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
      {rows.length > 0 && (
        <div className="mt-4">
          <label className="mb-2 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            1行目は見出し
          </label>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FIELDS.map((f) => (
              <label key={f} className="text-xs">
                {LEAD_FIELD_LABELS[f]}{f === "company" && <span className="text-rose-600">＊</span>}
                <select
                  value={map[f] ?? -1}
                  onChange={(e) => setMap({ ...map, [f]: Number(e.target.value) < 0 ? undefined : Number(e.target.value) })}
                  className={`${input} block w-full`}
                >
                  <option value={-1}>（使わない）</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `${i + 1}列目`}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="mb-2 text-xs font-bold">プレビュー（先頭5件 / 全{body.length}件）</div>
          <div className="overflow-x-auto rounded border border-slate-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  {FIELDS.filter((f) => map[f] !== undefined).map((f) => <th key={f} className="px-2 py-1">{LEAD_FIELD_LABELS[f]}</th>)}
                </tr>
              </thead>
              <tbody>
                {toLeads().slice(0, 5).map((o, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    {FIELDS.filter((f) => map[f] !== undefined).map((f) => <td key={f} className="px-2 py-1 max-w-48 truncate">{o[f]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!campaignId && campaigns.length > 0 && (
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={input}>
                <option value="">営業リストだけに入れる</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>フォーム営業「{c.name}」にも追加</option>)}
              </select>
            )}
            <button onClick={submit} disabled={busy} className={`${btnY} disabled:opacity-50`}>
              {busy ? "取り込み中..." : `${body.length}件を取り込む${target ? "（フォーム営業にも追加）" : ""}`}
            </button>
            {msg && <span className="text-sm text-slate-600">{msg}</span>}
          </div>
        </div>
      )}
      {rows.length === 0 && msg && <div className="mt-2 text-sm text-slate-600">{msg}</div>}
    </div>
  );
}
