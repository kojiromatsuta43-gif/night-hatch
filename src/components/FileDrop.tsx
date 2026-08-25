"use client";

import { useRef, useState } from "react";

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  url: string;
};

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileDrop({
  label,
  hint,
  accept,
  value,
  onChange,
  required,
}: {
  label: string;
  hint?: string;
  accept?: string;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError("");
    setBusy(true);
    try {
      const body = new FormData();
      Array.from(list).forEach((f) => body.append("file", f));
      // FormData のときは Content-Type をブラウザに任せる（境界文字列が必要なため）
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
      onChange([...value, ...(data.files as UploadedFile[])]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    onChange(value.filter((f) => f.id !== id));
    try {
      await fetch(`/api/uploads/${id}`, { method: "DELETE" });
    } catch {
      // 画面上は消えているので黙って無視
    }
  };

  return (
    <div className="block">
      <div className="text-sm font-semibold">
        {label}
        {required && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-600">必須</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`mt-2 cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? "border-honey-500 bg-honey-50" : "border-slate-300 bg-slate-50 hover:border-honey-400"
        }`}
      >
        <div className="text-sm font-medium text-slate-700">
          {busy ? "アップロード中..." : "ドラッグ＆ドロップでアップロード"}
        </div>
        <div className="mt-1 text-xs text-slate-500">またはクリックしてファイルを選択（1ファイル50MBまで）</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {value.length > 0 && (
        <ul className="mt-2 space-y-1">
          {value.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 truncate text-honey-700 hover:underline"
              >
                {f.name}
              </a>
              <span className="shrink-0 text-xs text-slate-400">{prettySize(f.size)}</span>
              <button
                type="button"
                onClick={() => void remove(f.id)}
                className="shrink-0 text-xs text-slate-400 hover:text-rose-600"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
