"use client";

import { useState } from "react";
import { api } from "@/lib/client";

export type Sender = { id: string; label: string; company: string; industry: string; person: string; person_kana: string; email: string; reply_email: string; tel: string; postal: string; address: string; url: string };

const box = "rounded border-2 border-hive-900 bg-white";
const input = "rounded border-2 border-hive-900 px-2 py-1 text-sm bg-white w-full";
const btnY = "rounded border-2 border-hive-900 px-3 py-1 text-sm font-bold bg-honey-400 text-hive-900 hover:bg-honey-300 disabled:opacity-50";

/** フォーム営業キャンペーンの作成・編集フォーム */
export default function CampaignForm({
  senders, defaults, initial, onDone,
}: {
  senders: Sender[];
  defaults: { template_text: string; subject_text: string };
  initial?: Record<string, unknown>;
  onDone: (id: string) => void;
}) {
  const [f, setF] = useState({
    name: String(initial?.name ?? ""),
    sender_id: String(initial?.sender_id ?? senders[0]?.id ?? ""),
    mode: String(initial?.mode ?? "hybrid"),
    subject_text: String(initial?.subject_text ?? defaults.subject_text),
    template_text: String(initial?.template_text ?? defaults.template_text),
    ai_instruction: String(initial?.ai_instruction ?? ""),
    daily_limit: Number(initial?.daily_limit ?? 300),
    send_window_start: Number(initial?.send_window_start ?? 9),
    send_window_end: Number(initial?.send_window_end ?? 18),
    weekdays_only: initial?.weekdays_only === undefined ? true : Boolean(initial.weekdays_only),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f, v: unknown) => setF((o) => ({ ...o, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      if (initial?.id) {
        await api(`/api/sales/form/campaigns/${initial.id}`, { method: "PATCH", body: JSON.stringify({ action: "update", ...f }) });
        onDone(String(initial.id));
      } else {
        const r = await api<{ id: string }>("/api/sales/form/campaigns", { method: "POST", body: JSON.stringify(f) });
        onDone(r.id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存できませんでした");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${box} mb-4 p-4 space-y-3`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">キャンペーン名<input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="福岡 飲食 9月" className={input} /></label>
        <label className="text-xs font-bold">送信者（差出人）
          <select value={f.sender_id} onChange={(e) => set("sender_id", e.target.value)} className={input}>
            {senders.map((s) => <option key={s.id} value={s.id}>{s.label}（{s.company} {s.person}）</option>)}
          </select>
        </label>
      </div>
      <label className="block text-xs font-bold">文面の作り方
        <select value={f.mode} onChange={(e) => set("mode", e.target.value)} className={input}>
          <option value="hybrid">ハイブリッド — テンプレの {"{{AI冒頭}}"} だけ会社ごとにハッチがAIで書く（おすすめ）</option>
          <option value="template">テンプレートのみ — 差し込みだけ、AIは使わない</option>
          <option value="ai">全文AI — テンプレを「伝えたいこと」として、会社ごとに全文を書く</option>
        </select>
      </label>
      <label className="block text-xs font-bold">件名（件名欄があるフォーム用）<input value={f.subject_text} onChange={(e) => set("subject_text", e.target.value)} className={input} /></label>
      <label className="block text-xs font-bold">本文テンプレート
        <div className="text-[11px] font-normal text-slate-500">使える差し込み: {"{{会社名}} {{代表者}} {{業種}} {{都道府県}} {{自社名}} {{担当者}} {{自社メール}} {{自社電話}} {{自社URL}} {{AI冒頭}}"}</div>
        <textarea value={f.template_text} onChange={(e) => set("template_text", e.target.value)} rows={14} className={`${input} font-mono text-xs`} />
      </label>
      <label className="block text-xs font-bold">AIへの追加指示（任意）<input value={f.ai_instruction} onChange={(e) => set("ai_instruction", e.target.value)} placeholder="例: 採用課題に寄せる／飲食店向けに集客の話をする" className={input} /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">1日の上限件数<input type="number" value={f.daily_limit} onChange={(e) => set("daily_limit", Number(e.target.value))} className={input} /></label>
        <label className="text-xs font-bold">送信時間帯（時）
          <div className="flex items-center gap-1">
            <input type="number" min={0} max={23} value={f.send_window_start} onChange={(e) => set("send_window_start", Number(e.target.value))} className={input} />
            〜
            <input type="number" min={1} max={24} value={f.send_window_end} onChange={(e) => set("send_window_end", Number(e.target.value))} className={input} />
          </div>
        </label>
        <label className="text-xs font-bold">曜日
          <select value={f.weekdays_only ? "1" : "0"} onChange={(e) => set("weekdays_only", e.target.value === "1")} className={input}>
            <option value="1">平日のみ</option>
            <option value="0">土日も送る</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={busy} className={btnY}>{busy ? "保存中..." : initial?.id ? "保存する" : "作成する"}</button>
        {err && <span className="text-xs text-rose-600">{err}</span>}
      </div>
    </div>
  );
}
