"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { Mascot } from "@/components/MascotProvider";
import CampaignForm, { type Sender } from "@/components/sales/FormCampaignForm";

type Campaign = {
  id: string; name: string; mode: string; status: string; owner_name: string; sender_label: string | null;
  total: number; sent: number; queued: number; running: boolean; created_at: string;
};
type ListRes = { items: Campaign[]; defaults: { template_text: string; subject_text: string }; ai: string | null; workerEnabled: boolean; pricing: { block: number; points: number } | null };
type Suppression = { id: string; domain: string; reason: string; created_at: string };

const box = "rounded border-2 border-hive-900 bg-white";
const input = "rounded border-2 border-hive-900 px-2 py-1 text-sm bg-white w-full";
const btn = "rounded border-2 border-hive-900 px-3 py-1 text-sm font-bold";
const btnY = `${btn} bg-honey-400 text-hive-900 hover:bg-honey-300 disabled:opacity-50`;
const btnW = `${btn} bg-white text-hive-900 hover:bg-honey-50`;
const STATUS_JA: Record<string, string> = { draft: "準備中", running: "実行中", paused: "一時停止", done: "完了" };

export default function FormOutreachPage() {
  const { me } = useMe();
  const router = useRouter();
  const [data, setData] = useState<ListRes | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [tab, setTab] = useState<"list" | "senders" | "suppress">("list");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<ListRes>("/api/sales/form/campaigns").then(setData).catch((e) => setMsg(e instanceof Error ? e.message : "読み込めませんでした"));
    api<Sender[]>("/api/sales/form/senders").then(setSenders).catch(() => {});
  }, []);
  useEffect(load, [load]);

  if (me?.role === "freelancer") return <div className="text-sm text-slate-500">この機能は発注者向けです。</div>;

  return (
    <div className="max-w-6xl">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Mascot className="h-12 w-12 shrink-0 animate-bee-float" />
          <div>
            <h1 className="text-2xl font-bold">フォーム営業</h1>
            <p className="text-xs text-slate-500">
              営業リストの会社の「お問い合わせフォーム」に、ハッチが営業文を自動で送ります。営業お断り・CAPTCHAのあるサイトは送らずスキップし、同じ会社には90日間再送しません。
              {data?.pricing && ` お客様は${data.pricing.block}通ごとに${data.pricing.points}🍯です。`}
            </p>
          </div>
        </div>
        <Link href="/sales" className={btnW}>← 営業リストへ</Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 text-sm">
        {(["list", "senders", "suppress"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`hex-tab px-4 py-1.5 font-bold ${tab === t ? "bg-honey-400 text-hive-900" : "bg-white text-slate-600"}`}>
            {t === "list" ? "キャンペーン" : t === "senders" ? "送信者（差出人）" : "除外リスト"}
          </button>
        ))}
      </div>
      {msg && <div className="mb-3 text-sm text-rose-600">{msg}</div>}

      {tab === "list" && data && (
        <>
          {data.ai === null && (
            <div className="mb-3 rounded border-2 border-hive-900 bg-honey-50 px-3 py-2 text-xs">AIのAPIキーが設定されていないため、文面はテンプレートのみで送られます（ハイブリッド／AIを選んでも同じ）。</div>
          )}
          {!data.workerEnabled && <div className="mb-3 rounded border-2 border-hive-900 bg-honey-50 px-3 py-2 text-xs">このサーバーでは送信ワーカーが無効です（FORM_OUTREACH=off）。</div>}
          <div className="mb-3">
            <button onClick={() => setCreating((v) => !v)} className={btnY} disabled={senders.length === 0}>{creating ? "閉じる" : "＋ 新しいキャンペーン"}</button>
            {senders.length === 0 && <span className="ml-2 text-xs text-slate-500">先に「送信者（差出人）」を登録してください</span>}
          </div>
          {creating && (
            <CampaignForm senders={senders} defaults={data.defaults} onDone={(id) => router.push(`/sales/form/${id}`)} />
          )}
          <div className={`${box} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-hive-900 text-left text-xs text-slate-500">
                  <th className="px-2 py-2">キャンペーン</th>
                  {me?.role === "admin" && <th className="px-2 py-2">オーナー</th>}
                  <th className="px-2 py-2">差出人</th>
                  <th className="px-2 py-2">文面</th>
                  <th className="px-2 py-2">状態</th>
                  <th className="px-2 py-2 text-right">全件</th>
                  <th className="px-2 py-2 text-right">送信済</th>
                  <th className="px-2 py-2 text-right">待機</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">まだキャンペーンがありません。「＋ 新しいキャンペーン」から始めてください。</td></tr>
                )}
                {data.items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-200">
                    <td className="px-2 py-2"><Link href={`/sales/form/${c.id}`} className="font-bold underline">{c.name}</Link><div className="text-xs text-slate-500">{c.created_at.slice(0, 10)}</div></td>
                    {me?.role === "admin" && <td className="px-2 py-2 text-xs">{c.owner_name}</td>}
                    <td className="px-2 py-2 text-xs">{c.sender_label ?? "—"}</td>
                    <td className="px-2 py-2 text-xs">{c.mode === "hybrid" ? "ハイブリッド" : c.mode === "ai" ? "全文AI" : "テンプレ"}</td>
                    <td className="px-2 py-2"><span className={`rounded px-2 py-0.5 text-xs font-bold ${c.running ? "bg-sky-100 text-sky-800" : c.status === "done" ? "bg-slate-100" : c.status === "running" ? "bg-honey-100" : "bg-white border border-slate-300"}`}>{c.running ? "送信中" : STATUS_JA[c.status] ?? c.status}</span></td>
                    <td className="px-2 py-2 text-right">{c.total}</td>
                    <td className="px-2 py-2 text-right font-bold text-emerald-700">{c.sent}</td>
                    <td className="px-2 py-2 text-right">{c.queued}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "senders" && <SendersPanel senders={senders} onChanged={load} />}
      {tab === "suppress" && <SuppressionsPanel isAdmin={me?.role === "admin"} />}
    </div>
  );
}

const SENDER_FIELDS: { k: keyof Sender; label: string; ph?: string; req?: boolean }[] = [
  { k: "label", label: "ラベル（管理用）", ph: "社内用 / ○○店用", req: true },
  { k: "company", label: "会社名", req: true },
  { k: "industry", label: "業種" },
  { k: "person", label: "担当者名（姓と名の間にスペース）", ph: "松田 幸次郎", req: true },
  { k: "person_kana", label: "ふりがな（カタカナ、姓 名）", ph: "マツダ コウジロウ" },
  { k: "email", label: "メール（フォームに入力する）", req: true },
  { k: "reply_email", label: "返信受付メール（本文に載せる。空なら上と同じ）" },
  { k: "tel", label: "電話（ハイフン区切り）", ph: "03-1234-5678" },
  { k: "postal", label: "郵便番号", ph: "114-0001" },
  { k: "address", label: "住所（都道府県から）" },
  { k: "url", label: "自社URL" },
];

function SendersPanel({ senders, onChanged }: { senders: Sender[]; onChanged: () => void }) {
  const empty = Object.fromEntries(SENDER_FIELDS.map((f) => [f.k, ""])) as unknown as Sender;
  const [edit, setEdit] = useState<Sender>({ ...empty, id: "" });
  const [msg, setMsg] = useState("");
  const save = async () => {
    setMsg("");
    try {
      if (edit.id) await api("/api/sales/form/senders", { method: "PUT", body: JSON.stringify(edit) });
      else await api("/api/sales/form/senders", { method: "POST", body: JSON.stringify(edit) });
      setEdit({ ...empty, id: "" });
      onChanged();
      setMsg("保存しました");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存できませんでした");
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm("この送信者を削除しますか？")) return;
    try {
      await api(`/api/sales/form/senders?id=${id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "削除できませんでした");
    }
  };
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">フォームに入力される差出人です。お客様の送信はお客様ご自身の会社名・担当者名で行います（FOOD HATCH名義では送りません）。</p>
      <div className={`${box} mb-4 overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead><tr className="border-b-2 border-hive-900 text-left text-xs text-slate-500"><th className="px-2 py-2">ラベル</th><th className="px-2 py-2">会社</th><th className="px-2 py-2">担当者</th><th className="px-2 py-2">メール</th><th className="px-2 py-2">電話</th><th className="px-2 py-2"></th></tr></thead>
          <tbody>
            {senders.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">まだありません</td></tr>}
            {senders.map((s) => (
              <tr key={s.id} className="border-b border-slate-200">
                <td className="px-2 py-2 font-bold">{s.label}</td><td className="px-2 py-2">{s.company}</td><td className="px-2 py-2">{s.person}</td><td className="px-2 py-2 text-xs">{s.email}</td><td className="px-2 py-2 text-xs">{s.tel}</td>
                <td className="px-2 py-2 whitespace-nowrap"><button onClick={() => setEdit(s)} className={`${btnW} text-xs`}>編集</button> <button onClick={() => remove(s.id)} className={`${btn} bg-white text-rose-600 text-xs`}>削除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`${box} p-4`}>
        <div className="mb-2 text-sm font-bold">{edit.id ? "送信者を編集" : "送信者を追加"}</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SENDER_FIELDS.map((f) => (
            <label key={f.k} className="text-xs font-bold">{f.label}{f.req && <span className="text-rose-600">＊</span>}
              <input value={edit[f.k] ?? ""} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })} placeholder={f.ph} className={input} />
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={save} className={btnY}>{edit.id ? "保存する" : "追加する"}</button>
          {edit.id && <button onClick={() => setEdit({ ...empty, id: "" })} className="text-xs underline">キャンセル</button>}
          {msg && <span className="text-xs text-slate-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

function SuppressionsPanel({ isAdmin }: { isAdmin: boolean }) {
  const [rows, setRows] = useState<Suppression[]>([]);
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(() => { api<Suppression[]>("/api/sales/form/suppressions").then(setRows).catch(() => {}); }, []);
  useEffect(load, [load]);
  const add = async () => {
    try {
      await api("/api/sales/form/suppressions", { method: "POST", body: JSON.stringify({ domain, reason }) });
      setDomain(""); setReason(""); setMsg("追加しました"); load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "追加できませんでした"); }
  };
  const del = async (id: string) => { await api(`/api/sales/form/suppressions?id=${id}`, { method: "DELETE" }).catch(() => {}); load(); };
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">ここにあるドメインには全キャンペーンで送りません。「営業お断り」を検知した会社は自動で入ります。返信で「今後不要」と言われた会社は必ずここに追加してください。</p>
      <div className={`${box} mb-4 p-3 flex flex-wrap items-end gap-2`}>
        <label className="text-xs font-bold">ドメイン<input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.co.jp" className={`${input} w-56`} /></label>
        <label className="text-xs font-bold">理由<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="返信で停止希望" className={`${input} w-56`} /></label>
        <button onClick={add} className={btnY}>追加</button>
        {msg && <span className="text-xs text-slate-600">{msg}</span>}
      </div>
      <div className={`${box} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead><tr className="border-b-2 border-hive-900 text-left text-xs text-slate-500"><th className="px-2 py-2">ドメイン</th><th className="px-2 py-2">理由</th><th className="px-2 py-2">登録</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">まだありません</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-200"><td className="px-2 py-1.5">{r.domain}</td><td className="px-2 py-1.5 text-xs">{r.reason}</td><td className="px-2 py-1.5 text-xs text-slate-500">{r.created_at.slice(0, 16)}</td>
                <td className="px-2 py-1.5">{isAdmin && <button onClick={() => del(r.id)} className="text-xs underline">削除</button>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
