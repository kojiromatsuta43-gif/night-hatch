"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type Task = "chat" | "sales" | "extract" | "backstage";
type TaskSetting = { provider: "auto" | "anthropic" | "gemini"; anthropicModel: string; geminiModel: string };
type PlanKey = "light" | "standard" | "premium";
type Settings = {
  tasks: Record<Task, TaskSetting>;
  limits: Record<PlanKey, { chatPerDay: number; genPerMonth: number }>;
  extraUses: number;
  extraPoints: number;
};
type UsageRow = { id: string; name: string; plan: string; role: string; ai_extra: number; chat_today: number; chat_month: number; gen_month: number };
type Data = {
  settings: Settings;
  usage: UsageRow[];
  routing: Record<Task, { provider: "anthropic" | "gemini"; model: string } | null>;
  keys: { anthropic: boolean; gemini: boolean };
  taskLabels: Record<Task, { name: string; desc: string }>;
  planLabels: Record<string, string>;
};

const TASKS: Task[] = ["chat", "sales", "extract", "backstage"];
const PLANS: PlanKey[] = ["light", "standard", "premium"];
const PROVIDER_LABEL = { auto: "自動（Claudeの鍵があればClaude）", anthropic: "Claude", gemini: "Gemini" } as const;

const input = "w-full rounded border-2 border-hive-900 px-2 py-1 text-sm";

export default function AiSettingsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<Data>("/api/admin/ai")
      .then((d) => {
        setData(d);
        setDraft(d.settings);
      })
      .catch((e) => setMsg(e instanceof Error ? e.message : "読み込めませんでした"));
  }, []);
  useEffect(load, [load]);

  if (!data || !draft) return <p className="text-sm text-slate-500">{msg || "読み込み中..."}</p>;

  const setTask = (t: Task, patch: Partial<TaskSetting>) =>
    setDraft({ ...draft, tasks: { ...draft.tasks, [t]: { ...draft.tasks[t], ...patch } } });
  const setLimit = (p: PlanKey, key: "chatPerDay" | "genPerMonth", v: string) =>
    setDraft({ ...draft, limits: { ...draft.limits, [p]: { ...draft.limits[p], [key]: Math.max(0, Number(v) || 0) } } });

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const d = await api<Data>("/api/admin/ai", { method: "PUT", body: JSON.stringify(draft) });
      setData(d);
      setDraft(d.settings);
      setMsg("保存しました");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <section>
        <h2 className="mb-1 text-base font-bold">APIキーの状態</h2>
        <p className="mb-3 text-xs text-slate-500">鍵は Railway の環境変数（ANTHROPIC_API_KEY / GEMINI_API_KEY）にだけ置きます。この画面には保存されません。</p>
        <div className="flex gap-3 text-sm">
          <span className={`rounded px-3 py-1 ${data.keys.anthropic ? "bg-honey-400 text-hive-900" : "bg-slate-100 text-slate-500"}`}>Claude: {data.keys.anthropic ? "設定済み" : "未設定"}</span>
          <span className={`rounded px-3 py-1 ${data.keys.gemini ? "bg-honey-400 text-hive-900" : "bg-slate-100 text-slate-500"}`}>Gemini: {data.keys.gemini ? "設定済み" : "未設定"}</span>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-base font-bold">用途ごとのモデル</h2>
        <p className="mb-3 text-xs text-slate-500">お客様が見る文章は品質の高いモデル、件数の多い裏方は安いモデル、という分け方が基本です。</p>
        <div className="space-y-3">
          {TASKS.map((t) => {
            const r = data.routing[t];
            return (
              <div key={t} className="rounded border-2 border-hive-900 bg-white p-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="font-bold">{data.taskLabels[t].name}</div>
                    <div className="text-xs text-slate-500">{data.taskLabels[t].desc}</div>
                  </div>
                  <div className="text-xs">
                    いま実際に使うもの: {r ? <span className="rounded bg-honey-100 px-2 py-0.5 font-mono">{r.provider === "anthropic" ? "Claude" : "Gemini"} / {r.model}</span> : <span className="text-rose-600">鍵が無いため使えません</span>}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="text-xs">
                    どちらを使う
                    <select className={input} value={draft.tasks[t].provider} onChange={(e) => setTask(t, { provider: e.target.value as TaskSetting["provider"] })}>
                      {(["auto", "anthropic", "gemini"] as const).map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">
                    Claude のモデル
                    <input className={input} value={draft.tasks[t].anthropicModel} onChange={(e) => setTask(t, { anthropicModel: e.target.value })} />
                  </label>
                  <label className="text-xs">
                    Gemini のモデル
                    <input className={input} value={draft.tasks[t].geminiModel} onChange={(e) => setTask(t, { geminiModel: e.target.value })} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          目安（100万トークンあたり）: Claude Sonnet 5 $2/$10・Haiku 4.5 $1/$5・Opus 5 $5/$25。Gemini 3.6 Flash $0.75/$3.75・3.1 Flash-Lite $0.25/$1.50。画像生成と動画分析は Gemini のみ。
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-base font-bold">プラン別の回数上限</h2>
        <p className="mb-3 text-xs text-slate-500">会話＝AIチャットの自由入力（1日あたり）。生成＝台本づくり・動画分析・資料の読み取り（1ヶ月あたり）。管理者と「無制限」プランは数えません。補助金の480万円契約（24ヶ月前払い）のお客様は「プレミアム」にしてください。</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-hive-900 text-left text-xs text-slate-500">
              <th className="px-2 py-2">プラン</th>
              <th className="px-2 py-2">会話 / 日</th>
              <th className="px-2 py-2">生成 / 月</th>
            </tr>
          </thead>
          <tbody>
            {PLANS.map((p) => (
              <tr key={p} className="border-b border-slate-200">
                <td className="px-2 py-2 font-bold">{data.planLabels[p]}</td>
                <td className="px-2 py-2"><input type="number" min={0} className={input} value={draft.limits[p].chatPerDay} onChange={(e) => setLimit(p, "chatPerDay", e.target.value)} /></td>
                <td className="px-2 py-2"><input type="number" min={0} className={input} value={draft.limits[p].genPerMonth} onChange={(e) => setLimit(p, "genPerMonth", e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="text-xs">
            追加パックの回数
            <input type="number" min={1} className={input} value={draft.extraUses} onChange={(e) => setDraft({ ...draft, extraUses: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <label className="text-xs">
            追加パックの価格（🍯）
            <input type="number" min={1} className={input} value={draft.extraPoints} onChange={(e) => setDraft({ ...draft, extraPoints: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <span className="pb-1 text-xs text-slate-500">＝ 上限に達したお客様は {draft.extraPoints}🍯 で {draft.extraUses} 回追加できます（ハニーP残高から引きます）</span>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-base font-bold">今月の利用状況（ユーザー別）</h2>
        <p className="mb-3 text-xs text-slate-500">AIを1回でも使った人だけ表示。上限はプランで自動的に効いています。</p>
        {data.usage.length === 0 ? (
          <p className="text-sm text-slate-500">今月はまだ利用がありません。</p>
        ) : (
          <table className="w-full max-w-2xl text-sm">
            <thead>
              <tr className="border-b-2 border-hive-900 text-left text-xs text-slate-500">
                <th className="px-2 py-2">ユーザー</th>
                <th className="px-2 py-2">プラン</th>
                <th className="px-2 py-2 text-right">会話 今日</th>
                <th className="px-2 py-2 text-right">会話 今月</th>
                <th className="px-2 py-2 text-right">生成 今月</th>
                <th className="px-2 py-2 text-right">追加残</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.map((u) => (
                <tr key={u.id} className="border-b border-slate-200">
                  <td className="px-2 py-1.5 font-bold">{u.name}{u.role === "admin" && <span className="ml-1 text-xs text-slate-400">(管理)</span>}</td>
                  <td className="px-2 py-1.5 text-xs">{data.planLabels[u.plan] ?? u.plan}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{u.chat_today}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{u.chat_month}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{u.gen_month}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{u.ai_extra > 0 ? `${u.ai_extra}回` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded bg-honey-400 px-5 py-2 text-sm font-bold text-hive-900 disabled:opacity-50">
          {saving ? "保存中..." : "保存する"}
        </button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </div>
  );
}
