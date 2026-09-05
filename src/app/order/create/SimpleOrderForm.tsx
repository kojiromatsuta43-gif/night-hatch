"use client";

/**
 * 店舗向けの発注フォーム（FOOD HATCH）。
 * 通常版と違い、カテゴリはメニュー画面で選んでから来る前提で、
 * 「お店のこと → 内容 → 納期」を1画面で入力し、確認して発注する2段階だけ。
 * 件名は店名とメニュー名から自動で付ける。
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND, catalogItem, clampQuantity, pointsFor, type CatalogItem, type Question } from "@/lib/brand";
import { agreementsFor, DEFAULT_VIDEO_CATEGORY } from "@/lib/data";
import { api } from "@/lib/client";
import { useMe } from "@/components/AppShell";
import type { UploadedFile } from "@/components/FileDrop";
import { PlatformRow } from "@/components/PlatformIcons";
import MicButton from "@/components/MicButton";
import { PointInline, useMascot } from "@/components/MascotProvider";
import MenuPicker from "@/components/order/MenuPicker";
import { inputClass, QuestionField, answerText, answered, MissingNotice } from "@/components/order/fields";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-base font-bold text-hive-900">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function SimpleForm({ item, refUrl, refTitle, scriptId }: { item: CatalogItem; refUrl: string; refTitle: string; scriptId: string }) {
  const router = useRouter();
  const { refresh } = useMe();
  const { mascot } = useMascot();
  const [step, setStep] = useState<0 | 1>(0);
  // 参考動画ページから来たときは、そのURLを「参考」欄に入れておく
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    refUrl && (item.questions ?? []).some((q) => q.key === "参考") ? { 参考: refUrl } : {}
  );
  const setAnswer = (key: string, v: unknown) => setAnswers((a) => ({ ...a, [key]: v }));
  const [qty, setQty] = useState(0);
  // 納期の初期値は2週間後
  const [deadline, setDeadline] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [note, setNote] = useState(refTitle ? `参考動画「${refTitle}」のような雰囲気で。` : "");
  const [showAssignee, setShowAssignee] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [freelancers, setFreelancers] = useState<{ id: string; name: string; done_count: number; worked_count: number }[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ id: string; name: string; done_count: number; worked_count: number }[]>("/api/freelancers").then(setFreelancers).catch(() => {});
  }, []);
  // 保存済み台本から来たときは、その台本をひとことに貼っておく
  useEffect(() => {
    if (!scriptId) return;
    api<{ title: string; content: string }>(`/api/scripts/${scriptId}`)
      .then((sc) => setNote((v) => v || `保存済み台本「${sc.title}」をもとに作ってください。\n\n${sc.content}`))
      .catch(() => {});
  }, [scriptId]);

  const quantity = item.quantity;
  const qtyValue = quantity ? clampQuantity(item, qty || quantity.min) : 0;
  const points = pointsFor(item.name, quantity ? { [quantity.key]: qtyValue } : undefined);
  const questions: Question[] = item.questions ?? [];
  const allQuestions: Question[] = [...BRAND.commonQuestions, ...questions];
  const agreements = item.agreements ?? agreementsFor(item.name);

  const missing = [
    ...allQuestions.filter((q) => q.required && !answered(q, answers[q.key])).map((q) => q.label),
    ...(!deadline ? ["希望納期"] : []),
  ];
  const storeName = typeof answers["店名"] === "string" ? (answers["店名"] as string).trim() : "";
  const title = `${storeName ? `${storeName}の` : ""}${item.name}`;

  const detail = (): Record<string, unknown> => {
    const d: Record<string, unknown> = {};
    for (const q of allQuestions) {
      const v = answers[q.key];
      if (!answered(q, v)) continue;
      d[q.key] = Array.isArray(v) && typeof v[0] === "object" ? (v as UploadedFile[]).map((f) => ({ name: f.name, url: f.url })) : v;
    }
    if (quantity) d[quantity.key] = qtyValue;
    return d;
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title,
          category: item.name,
          description: note.trim() || `「${item.name}」をお願いします。詳しい内容は下の入力内容のとおりです。`,
          points,
          deadline,
          detail: detail(),
          assignee_id: assigneeId || null,
        }),
      });
      refresh();
      router.push("/projects");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const nextBtn = "rounded-xl bg-food-500 px-6 py-3 text-base font-bold text-white hover:bg-food-600 disabled:opacity-40";
  const backBtn = "rounded-xl border border-slate-300 px-5 py-3 text-sm hover:bg-slate-100";

  return (
    <div className="max-w-2xl space-y-4">
      {/* 何を頼むか（決まっている） */}
      <div className="flex items-center gap-4 rounded-2xl border-2 border-food-300 bg-food-50 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-food-700">頼むもの</div>
          <div className="flex items-center gap-2 text-xl font-bold text-hive-900">
            {item.name}
            <span className="text-hive-900"><PlatformRow category={item.name} className="h-4 w-4" /></span>
          </div>
          <div className="mt-0.5 text-sm text-slate-600">
            {item.size}・目安 {item.days}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold text-food-700">
            {points}
            <PointInline />
            {item.monthly && <span className="text-xs font-medium text-slate-500">／月</span>}
          </div>
          <Link href={`/order/menu?group=${encodeURIComponent(item.group)}`} className="text-xs text-slate-500 underline hover:text-hive-900">
            別のものにする
          </Link>
        </div>
      </div>

      {step === 0 && (
        <>
          {quantity && (
            <Block title={quantity.key}>
              <label className="block">
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={quantity.min}
                    max={quantity.max}
                    step={quantity.step}
                    value={qty || quantity.min}
                    onChange={(e) => setQty(Number(e.target.value))}
                    onBlur={() => setQty(clampQuantity(item, qty || quantity.min))}
                    className={`${inputClass} max-w-[10rem] text-lg`}
                  />
                  <span className="mt-1 text-sm text-slate-500">{quantity.unit}</span>
                </span>
                <p className="mt-1 text-xs text-slate-500">{quantity.hint}</p>
              </label>
            </Block>
          )}

          {BRAND.commonQuestions.length > 0 && (
            <Block title="お店のこと">
              {BRAND.commonQuestions.map((q) => (
                <QuestionField key={q.key} q={q} value={answers[q.key]} onChange={(v) => setAnswer(q.key, v)} />
              ))}
            </Block>
          )}

          {questions.length > 0 && (
            <Block title={`${item.name}について`}>
              {questions.map((q) => (
                <QuestionField key={q.key} q={q} value={answers[q.key]} onChange={(v) => setAnswer(q.key, v)} />
              ))}
            </Block>
          )}

          <Block title="納期とひとこと">
            <label className="block">
              <span className="flex items-center gap-2 text-sm font-semibold">
                いつまでにほしいか
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>
              </span>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${inputClass} max-w-[14rem]`} />
              <p className="mt-1 text-xs text-slate-500">目安は {item.days}。急ぎのときはひとことに書いてください。</p>
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-sm font-semibold">
                ひとこと（任意）
                <MicButton onText={(t) => setNote((v) => (v ? v + t : t))} />
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="例: 常連さん向けに落ち着いた感じで。写真は追って送ります。"
                className={inputClass}
              />
            </label>
            {!showAssignee ? (
              <button type="button" onClick={() => setShowAssignee(true)} className="text-xs text-slate-500 underline hover:text-hive-900">
                前に頼んだ人を指名する（任意）
              </button>
            ) : (
              <div>
                <span className="text-sm font-semibold">担当を指名する</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAssigneeId("")}
                    className={`rounded-lg border px-3 py-2 text-sm ${assigneeId === "" ? "border-food-500 bg-food-500 text-white" : "border-slate-300 bg-white hover:border-food-400"}`}
                  >
                    おまかせ
                  </button>
                  {freelancers.map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setAssigneeId(f.id)}
                      className={`rounded-lg border px-3 py-2 text-sm ${assigneeId === f.id ? "border-food-500 bg-food-500 text-white" : "border-slate-300 bg-white hover:border-food-400"}`}
                    >
                      {f.name}
                    </button>
                  ))}
                  {freelancers.length === 0 && <span className="text-sm text-slate-400">まだ指名できる方はいません。初回は「おまかせ」で募集します。</span>}
                </div>
              </div>
            )}
          </Block>

          <MissingNotice items={missing} />
          <div className="flex justify-end">
            <button disabled={missing.length > 0} onClick={() => setStep(1)} className={nextBtn}>
              確認画面へ
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <Block title="この内容で発注します">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">件名</dt>
                <dd className="font-medium">{title}</dd>
              </div>
              <div>
                <dt className="text-slate-500">いつまでに</dt>
                <dd className="font-medium">{deadline}</dd>
              </div>
              <div>
                <dt className="text-slate-500">消費する{mascot.pointName}</dt>
                <dd className="font-medium">
                  {points}
                  <PointInline />
                </dd>
              </div>
              {quantity && (
                <div>
                  <dt className="text-slate-500">{quantity.key}</dt>
                  <dd className="font-medium">
                    {qtyValue}
                    {quantity.unit}
                  </dd>
                </div>
              )}
              {allQuestions
                .filter((q) => answered(q, answers[q.key]))
                .map((q) => (
                  <div key={q.key} className={q.type === "textarea" ? "sm:col-span-2" : ""}>
                    <dt className="text-slate-500">{q.label}</dt>
                    <dd className="font-medium whitespace-pre-wrap break-words">{answerText(answers[q.key])}</dd>
                  </div>
                ))}
              {note.trim() && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">ひとこと</dt>
                  <dd className="font-medium whitespace-pre-wrap">{note}</dd>
                </div>
              )}
            </dl>
          </Block>

          <Block title="おねがい">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              {agreements.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="h-4 w-4 accent-food-500" />
              確認しました
            </label>
          </Block>

          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}
          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className={backBtn}>
              戻る
            </button>
            <button disabled={!agreed || busy} onClick={submit} className={nextBtn}>
              {busy ? "送信中..." : "発注する"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SimpleOrderForm() {
  const search = useSearchParams();
  const scriptId = search.get("script") ?? "";
  const category = search.get("category") || (scriptId ? DEFAULT_VIDEO_CATEGORY : "");
  const item = catalogItem(category);
  if (!item) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold text-hive-900">頼む内容を書いてください</h1>
        <MenuPicker />
      </div>
    );
  }
  return <SimpleForm key={item.name} item={item} refUrl={search.get("ref") ?? ""} refTitle={search.get("refTitle") ?? ""} scriptId={scriptId} />;
}
