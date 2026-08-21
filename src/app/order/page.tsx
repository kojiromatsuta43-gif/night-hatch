"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AGREEMENTS,
  CATEGORIES,
  DURATION_OPTIONS,
  ELEMENT_OPTIONS,
  FORMAT_OPTIONS,
  MEDIA_OPTIONS,
  POINTS_BY_CATEGORY,
  PURPOSE_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/data";
import { useProjects } from "@/lib/store";

function CheckGroup({
  label,
  options,
  values,
  onChange,
  required,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold mb-2">
        {label}
        {required && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = values.includes(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(on ? values.filter((v) => v !== opt) : [...values, opt])}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function OrderPage() {
  const router = useRouter();
  const { add } = useProjects();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [duration, setDuration] = useState<string[]>([]);
  const [purpose, setPurpose] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [emotion, setEmotion] = useState("");
  const [format, setFormat] = useState<string[]>([]);
  const [tone, setTone] = useState<string[]>([]);
  const [elements, setElements] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [ngWords, setNgWords] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [agreed, setAgreed] = useState(false);

  const points = useMemo(() => (category ? POINTS_BY_CATEGORY[category] ?? 10 : 0), [category]);
  const isScript = category === "台本作成";

  const step1Ok = category && title.trim() && description.trim() && deadline;
  const step2Ok = !isScript || (media.length && duration.length && purpose.length && target.trim() && emotion.trim() && format.length && tone.length && elements.length);

  const submit = () => {
    add({
      id: crypto.randomUUID(),
      title,
      category,
      description,
      points,
      deadline,
      createdAt: new Date().toISOString().slice(0, 10),
      status: "募集中",
      detail: { media, duration, purpose, target, emotion, format, tone, elements, keywords, ngWords, refUrl },
    });
    router.push("/projects");
  };

  const steps = ["基本情報", "詳細ヒアリング", "確認・登録"];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">案件登録</h1>

      <ol className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                i < step ? "bg-indigo-600 text-white" : i === step ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm ${i === step ? "font-semibold text-slate-900" : "text-slate-500"}`}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-slate-300" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <div className="text-sm font-semibold mb-2">案件の種類</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    category === c ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:border-indigo-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-semibold">タイトル（案件名）</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 企業紹介動画の台本"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">概要説明（最大2000文字）</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold">希望納期</span>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <div className="block">
              <span className="text-sm font-semibold">消費ポイント</span>
              <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-indigo-700">{points || "-"} pt</div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              disabled={!step1Ok}
              onClick={() => setStep(1)}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-indigo-500"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          {isScript ? (
            <>
              <CheckGroup label="使用媒体（複数選択可）" options={MEDIA_OPTIONS} values={media} onChange={setMedia} required />
              <CheckGroup label="想定動画の尺（完成後）" options={DURATION_OPTIONS} values={duration} onChange={setDuration} required />
              <CheckGroup label="動画の目的" options={PURPOSE_OPTIONS} values={purpose} onChange={setPurpose} required />
              <label className="block">
                <span className="text-sm font-semibold">想定ターゲット（年齢・性別・悩み・属性など）</span>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="例: 30代女性、産後ダイエットに悩む主婦"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">動画を見た人にどう感じてほしいか？（感情）</span>
                <input
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  placeholder="例:「自分に当てはまる！」「今すぐ申し込みたい」"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </label>
              <CheckGroup label="台本の形式（複数選択可）" options={FORMAT_OPTIONS} values={format} onChange={setFormat} required />
              <CheckGroup label="トーンや雰囲気の希望（複数可）" options={TONE_OPTIONS} values={tone} onChange={setTone} required />
              <CheckGroup label="盛り込みたい要素（複数選択可）" options={ELEMENT_OPTIONS} values={elements} onChange={setElements} required />
              <label className="block">
                <span className="text-sm font-semibold">絶対に入れてほしいキーワードや表現（任意）</span>
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">避けてほしい表現・NGワード（任意）</span>
                <input value={ngWords} onChange={(e) => setNgWords(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">参考URL（任意）</span>
                <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="https://" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
              </label>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              このカテゴリの詳細ヒアリングフォームは今後追加予定です。「次へ」で確認画面に進んでください。
            </p>
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="rounded-lg border border-slate-300 px-5 py-2 text-sm hover:bg-slate-100">
              戻る
            </button>
            <button
              disabled={!step2Ok}
              onClick={() => setStep(2)}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-indigo-500"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-slate-500">カテゴリ</dt><dd className="font-medium">{category}</dd></div>
            <div><dt className="text-slate-500">タイトル</dt><dd className="font-medium">{title}</dd></div>
            <div><dt className="text-slate-500">希望納期</dt><dd className="font-medium">{deadline}</dd></div>
            <div><dt className="text-slate-500">消費ポイント</dt><dd className="font-medium">{points}pt</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-500">概要</dt><dd className="font-medium whitespace-pre-wrap">{description}</dd></div>
          </dl>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm font-semibold mb-2">同意事項</div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
              {AGREEMENTS.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              上記すべてに同意します
            </label>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-lg border border-slate-300 px-5 py-2 text-sm hover:bg-slate-100">
              戻る
            </button>
            <button
              disabled={!agreed}
              onClick={submit}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-indigo-500"
            >
              案件を登録する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
