"use client";

/**
 * 発注フォームの部品。看板ごとの質問（src/lib/brands/*.ts）をここで描く。
 * 通常版（BRIDGE）と店舗向けの簡単版（FOOD）の両方から使う。
 */
import type { Question } from "@/lib/brand";
import FileDrop, { UploadedFile } from "@/components/FileDrop";
import MicButton from "@/components/MicButton";

export const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-honey-500 focus:outline-none";

export function CheckGroup({
  label,
  options,
  values,
  onChange,
  required,
  hint,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold mb-2">
        {label}
        {required && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>}
      </legend>
      {hint && <p className="-mt-1 mb-2 text-xs text-slate-500">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = values.includes(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(on ? values.filter((v) => v !== opt) : [...values, opt])}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                on
                  ? "border-honey-500 bg-honey-400 text-hive-900"
                  : "border-slate-300 bg-white text-slate-700 hover:border-honey-400"
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

export function RadioGroup({
  label,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold mb-2">
        {label}
        {required && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              value === opt
                ? "border-honey-500 bg-honey-400 text-hive-900"
                : "border-slate-300 bg-white text-slate-700 hover:border-honey-400"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-honey-100 text-xs font-bold text-honey-700">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** 看板ごとの質問（src/lib/brands/*.ts）を1問ぶん描く。答えは detail に見出し付きで保存される */
export function QuestionField({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <span className="flex items-center gap-2 text-sm font-semibold">
      {q.label}
      {q.required && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>}
    </span>
  );
  const hint = q.hint ? <p className="mt-1 text-xs text-slate-500">{q.hint}</p> : null;
  if (q.type === "multi") {
    return (
      <div>
        <CheckGroup label={q.label} options={q.options ?? []} values={(value as string[]) ?? []} onChange={onChange} required={q.required} hint={q.hint} />
      </div>
    );
  }
  if (q.type === "select") {
    return (
      <div>
        <RadioGroup label={q.label} options={q.options ?? []} value={(value as string) ?? ""} onChange={onChange} required={q.required} />
        {hint}
      </div>
    );
  }
  if (q.type === "file") {
    const files = (value as UploadedFile[]) ?? [];
    return (
      <div>
        {label}
        <div className="mt-1">
          <FileDrop label="ファイルを選ぶ" hint={q.hint} value={files} onChange={onChange} required={q.required} />
        </div>
      </div>
    );
  }
  if (q.type === "textarea") {
    return (
      <label className="block">
        <span className="flex items-center gap-2">
          {label}
          <MicButton onText={(t) => onChange(((value as string) ?? "") + t)} />
        </span>
        <textarea value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={q.placeholder} className={inputClass} />
        {hint}
      </label>
    );
  }
  return (
    <label className="block">
      {label}
      <input
        type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.placeholder}
        className={inputClass}
      />
      {hint}
    </label>
  );
}

/** 生の答えを、確認画面や案件詳細で読める形にする */
export function answerText(v: unknown): string {
  if (Array.isArray(v)) {
    if (v.length === 0) return "";
    if (typeof v[0] === "object" && v[0] && "name" in (v[0] as object)) return `ファイル${v.length}件`;
    return (v as string[]).join("、");
  }
  if (v === undefined || v === null) return "";
  return String(v);
}

export function answered(q: Question, v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === "string" ? v.trim().length > 0 : v !== undefined && v !== null && v !== "";
}

/**
 * 「次へ」が押せないときに、何が足りないのかを名前で見せる。
 * ボタンが暗いだけでは、どこまで戻ればいいのか分からないため。
 * numbered が true のときは、項目名の頭の数字を見出し番号のバッジとして出す。
 */
export function MissingNotice({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-sm font-bold text-amber-900">
        あと{items.length}つ入力すると次へ進めます
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          const m = numbered ? item.match(/^(\d+)\s+(.+)$/) : null;
          return (
            <li key={item} className="flex items-center gap-2 text-sm text-amber-900">
              <span aria-hidden="true" className="text-amber-500">・</span>
              {m ? (
                <>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-200 text-[11px] font-bold">
                    {m[1]}
                  </span>
                  <span>{m[2]}</span>
                </>
              ) : (
                <span>{item}</span>
              )}
            </li>
          );
        })}
      </ul>
      {numbered && (
        <p className="mt-2 text-xs text-amber-800">
          数字は上の見出し番号です。その項目まで戻って入力してください。
        </p>
      )}
    </div>
  );
}

