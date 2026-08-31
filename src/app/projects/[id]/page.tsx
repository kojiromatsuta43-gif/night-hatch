"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import { PointInline } from "@/components/MascotProvider";
import FileDrop, { UploadedFile } from "@/components/FileDrop";
import MicButton from "@/components/MicButton";
import { STATUSES } from "@/lib/data";

type Deliverable = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  upload_id: string | null;
  upload_name: string | null;
  upload_mime: string | null;
  author_name: string;
  user_id: string;
  created_at: string;
};

type Detail = {
  id: string;
  title: string;
  category: string;
  description: string;
  points: number;
  deadline: string;
  requested_on: string;
  status: string;
  detail: string | null;
  user_id: string;
  owner_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  deliverables: Deliverable[];
  assignees: { id: string; name: string }[];
};

const STATUS_COLOR: Record<string, string> = {
  未公開: "bg-slate-200 text-slate-700",
  募集中: "bg-honey-100 text-honey-700",
  制作待ち: "bg-sky-100 text-sky-700",
  フィードバック: "bg-violet-100 text-violet-700",
  完了: "bg-emerald-100 text-emerald-700",
};

function daysBetween(from: string, to: string) {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * テレアポ案件の架電結果。提出の title に「架電結果 架電/接続/アポ」の形で入れておき、
 * 案件ページの上部で合計を出す（別テーブルを増やさずに済ませる）。
 */
const CALL_RESULT = /^架電結果 (\d+)\/(\d+)\/(\d+)/;
function sumCallResults(items: { kind: string; title: string }[]) {
  const t = { calls: 0, connected: 0, appts: 0, reports: 0 };
  for (const d of items) {
    if (d.kind !== "提出") continue;
    const m = CALL_RESULT.exec(d.title ?? "");
    if (!m) continue;
    t.calls += Number(m[1]); t.connected += Number(m[2]); t.appts += Number(m[3]); t.reports += 1;
  }
  return t;
}

function CallResultSummary({ p }: { p: Detail }) {
  const t = sumCallResults(p.deliverables);
  let target = 0;
  try { target = Number((JSON.parse(p.detail ?? "{}") as Record<string, unknown>)["架電件数"] ?? 0); } catch { /* 無視 */ }
  if (!target) {
    const m = /(\d+)コール/.exec(p.category);
    if (m) target = Number(m[1]);
    else if (p.category === "テレアポ架電") target = 200; // 200コール固定のメニュー
  }
  const pct = target > 0 ? Math.min(100, Math.round((t.calls / target) * 100)) : 0;
  const rate = t.connected > 0 ? `${Math.round((t.appts / t.connected) * 1000) / 10}%` : "-";
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-bold text-hive-900">架電の進み具合</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["架電数", `${t.calls}${target ? ` / ${target}` : ""}件`],
          ["つながった数", `${t.connected}件`],
          ["アポ数", `${t.appts}件`],
          ["アポ率（接続比）", rate],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="text-lg font-bold text-hive-900">{v}</div>
          </div>
        ))}
      </div>
      {target > 0 && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-honey-400" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-500">{pct}% 完了・報告{t.reports}回</div>
        </div>
      )}
    </section>
  );
}

/** 発注フォームの入力内容を読みやすく並べる */
function DetailList({ raw }: { raw: string | null }) {
  let data: Record<string, unknown> = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return null;
  }
  const entries = Object.entries(data).filter(([, v]) => {
    if (v == null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">詳細ヒアリングの入力はありません。</p>;
  }
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[180px_1fr]">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-sm text-slate-500">{k}</dt>
          <dd className="text-sm font-medium">
            {Array.isArray(v) ? (
              v.every((x) => typeof x === "object" && x !== null && "url" in (x as object)) ? (
                <span className="flex flex-wrap gap-2">
                  {(v as { name: string; url: string }[]).map((f) => (
                    <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs hover:border-honey-400">
                      📎 {f.name}
                    </a>
                  ))}
                </span>
              ) : (
                (v as unknown[]).join("、")
              )
            ) : (
              <span className="whitespace-pre-wrap">{String(v)}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useMe();
  const [p, setP] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [pickedKind, setPickedKind] = useState<"提出" | "フィードバック">("提出");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState(false);
  // テレアポ案件の架電結果（提出のときだけ使う）
  const [calls, setCalls] = useState("");
  const [connected, setConnected] = useState("");
  const [appts, setAppts] = useState("");

  const load = useCallback(() => {
    api<Detail>(`/api/projects/${id}`)
      .then((d) => { setP(d); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "読み込みに失敗しました"));
  }, [id]);
  useEffect(load, [load]);

  // 出せるものは立場で決まる。
  // 作る人（担当者）は「提出」、発注した人は「フィードバック」。
  // 管理者だけは動作確認のため両方使える。
  const isOwner = Boolean(me && p && p.user_id === me.id);
  const isAssignee = Boolean(me && p && p.assignee_id === me.id);
  const allowedKinds: ("提出" | "フィードバック")[] =
    me?.role === "admin"
      ? ["提出", "フィードバック"]
      : isAssignee
        ? ["提出"]
        : isOwner
          ? ["フィードバック"]
          : [];
  const kind = allowedKinds.includes(pickedKind) ? pickedKind : (allowedKinds[0] ?? "提出");
  // 担当者が決まる前は、発注側にフィードバックの出しどころがない
  const waitingForAssignee = isOwner && !isAssignee && !p?.assignee_id && me?.role !== "admin";
  const isCallJob = /架電|テレアポ営業/.test(p?.category ?? "");
  const callResultTitle =
    isCallJob && kind === "提出" && (calls || connected || appts)
      ? `架電結果 ${Number(calls) || 0}/${Number(connected) || 0}/${Number(appts) || 0}`
      : "";

  const patch = async (payload: Record<string, unknown>) => {
    await api(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    load();
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/deliverables`, {
        method: "POST",
        body: JSON.stringify({ kind, body, url, upload_id: files[0]?.id ?? null, title: callResultTitle }),
      });
      setBody(""); setUrl(""); setFiles([]);
      setCalls(""); setConnected(""); setAppts("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  if (error && !p) {
    return (
      <div className="max-w-3xl">
        <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-700">← 案件一覧</Link>
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      </div>
    );
  }
  if (!p) return <div className="text-sm text-slate-400">読み込み中...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const left = daysBetween(today, p.deadline);
  const elapsed = p.requested_on ? daysBetween(p.requested_on, today) : null;
  const canEdit = isOwner || me?.role === "admin";

  return (
    <div className="max-w-4xl">
      <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-700">← 案件一覧</Link>

      {/* 見出し */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {p.category} ／ 発注者 {p.owner_name}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_COLOR[p.status] ?? "bg-slate-200 text-slate-700"}`}>
          {p.status}
        </span>
      </div>

      {/* 要点 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">依頼日</div>
          <div className="mt-0.5 font-bold">{p.requested_on || "—"}</div>
          {elapsed !== null && <div className="text-xs text-slate-400">{elapsed}日経過</div>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">納期</div>
          <div className="mt-0.5 font-bold">{p.deadline}</div>
          <div className={`text-xs ${left < 0 ? "font-semibold text-rose-600" : left <= 5 ? "font-semibold text-amber-600" : "text-slate-400"}`}>
            {left < 0 ? `${-left}日超過` : left === 0 ? "本日まで" : `あと${left}日`}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">消費ポイント</div>
          <div className="mt-0.5 font-bold">{p.points}<PointInline /></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">担当者</div>
          {canEdit ? (
            <select
              value={p.assignee_id ?? ""}
              onChange={(e) => patch({ assignee_id: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="">未割当</option>
              {p.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <div className="mt-0.5 font-bold">{p.assignee_name ?? "未割当"}</div>
          )}
        </div>
      </div>

      {/* ステータス操作 */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <span className="mr-1 text-sm font-semibold">進行状況</span>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => patch({ status: s })}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              p.status === s
                ? "border-honey-500 bg-honey-400 text-hive-900"
                : "border-slate-300 bg-white text-slate-600 hover:border-honey-400"
            }`}
          >
            {s}
          </button>
        ))}
        <Link href="/chat" className="ml-auto text-sm font-medium text-honey-600 hover:underline">
          この案件のチャットを開く →
        </Link>
      </div>

      {/* 発注内容 */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-hive-900">発注内容</h2>
        <p className="mb-4 whitespace-pre-wrap text-sm">{p.description}</p>
        <div className="border-t border-slate-100 pt-4">
          <DetailList raw={p.detail} />
        </div>
      </section>

      {isCallJob && <CallResultSummary p={p} />}

      {/* 提出物とフィードバック */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-hive-900">
          提出物とフィードバック
          <span className="ml-2 text-sm font-normal text-slate-400">{p.deliverables.length}件</span>
        </h2>

        {p.deliverables.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            {kind === "提出"
              ? "まだ提出物がありません。完成したら下のフォームから提出してください。"
              : "まだ提出物がありません。担当者から提出されると、ここに表示されます。"}
          </div>
        )}

        <div className="space-y-3">
          {p.deliverables.map((d) => (
            <div key={d.id} className={`rounded-xl border p-4 ${d.kind === "提出" ? "border-sky-200 bg-sky-50/40" : "border-honey-200 bg-honey-50/40"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 font-bold ${d.kind === "提出" ? "bg-sky-200 text-sky-800" : "bg-honey-200 text-hive-900"}`}>
                  {d.kind}
                </span>
                <span className="font-medium text-slate-600">{d.author_name}</span>
                <span className="text-slate-400">{d.created_at.slice(0, 16).replace("T", " ")}</span>
                {d.user_id === me?.id && (
                  <button
                    onClick={async () => {
                      if (!confirm("削除しますか？")) return;
                      await api(`/api/projects/${id}/deliverables?itemId=${d.id}`, { method: "DELETE" });
                      load();
                    }}
                    className="ml-auto text-slate-400 hover:text-rose-500"
                  >
                    削除
                  </button>
                )}
              </div>
              {d.title && CALL_RESULT.test(d.title) && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {(() => { const m = CALL_RESULT.exec(d.title)!; return [["架電", m[1]], ["接続", m[2]], ["アポ", m[3]]]; })().map(([k, v]) => (
                    <span key={k} className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-sky-800 ring-1 ring-sky-200">{k} {v}件</span>
                  ))}
                </div>
              )}
              {d.body && (
                <div
                  className="prose prose-sm prose-slate mt-2 max-w-none"
                  dangerouslySetInnerHTML={{ __html: marked.parse(d.body) as string }}
                />
              )}
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-honey-600 hover:underline">
                  🔗 {d.url}
                </a>
              )}
              {d.upload_id && (
                <div className="mt-2">
                  {d.upload_mime?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/uploads/${d.upload_id}`} alt={d.upload_name ?? ""} className="max-h-64 rounded-lg border border-slate-200" />
                  ) : (
                    <a href={`/api/uploads/${d.upload_id}`} className="inline-block rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:border-honey-400">
                      📎 {d.upload_name ?? "ファイル"}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 投稿フォーム */}
        {allowedKinds.length === 0 ? null : waitingForAssignee ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            まだ担当者が決まっていません。決まりしだい、ここで提出物のやり取りができます。
          </div>
        ) : (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <MicButton onText={(t) => setBody((v) => (v ? v + t : t))} className="order-last ml-auto" />
            {allowedKinds.length > 1 ? (
              allowedKinds.map((k) => (
                <button
                  key={k}
                  onClick={() => setPickedKind(k)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${kind === k ? "border-honey-500 bg-honey-400 text-hive-900" : "border-slate-300 text-slate-600 hover:border-honey-400"}`}
                >
                  {k}
                </button>
              ))
            ) : (
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${kind === "提出" ? "bg-sky-200 text-sky-800" : "bg-honey-200 text-hive-900"}`}
              >
                {kind === "提出" ? "制作物を提出する" : "フィードバックを送る"}
              </span>
            )}
          </div>
          {isCallJob && kind === "提出" && (
            <div className="mb-2 grid grid-cols-3 gap-2">
              {[["今回の架電数", calls, setCalls], ["つながった数", connected, setConnected], ["アポ数", appts, setAppts]].map(([label, v, set]) => (
                <label key={label as string} className="block">
                  <span className="text-xs font-semibold text-slate-600">{label as string}</span>
                  <input
                    type="number"
                    min={0}
                    value={v as string}
                    onChange={(e) => (set as (s: string) => void)(e.target.value)}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-honey-500 focus:outline-none"
                  />
                </label>
              ))}
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={
              isCallJob && kind === "提出"
                ? "本日の架電レポート。アポ先の会社名・日時・担当者、次回の課題など。リストはファイルで添付してください。"
                : kind === "提出" ? "初稿ができました。ご確認をお願いします。" : "冒頭3秒のテンポをもう少し速くしてください。"
            }
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-honey-500 focus:outline-none"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="動画URL（ギガファイル便・YouTube限定公開など）"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-honey-500 focus:outline-none"
          />
          <div className="mt-3">
            <FileDrop label="ファイルを添付" hint="動画・画像・資料など" value={files} onChange={setFiles} />
          </div>
          {error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
          <button
            onClick={submit}
            disabled={busy}
            className="mt-3 rounded-lg bg-honey-400 px-6 py-2 text-sm font-bold text-hive-900 hover:bg-honey-300 disabled:opacity-40"
          >
            {busy ? "送信中..." : `${kind}を送る`}
          </button>
        </div>
        )}
      </section>
    </div>
  );
}
