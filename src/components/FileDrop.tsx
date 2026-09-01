"use client";

import { useRef, useState } from "react";

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  url: string;
};

/** 分割アップロードの1かけら（サーバー側 UPLOAD_CHUNK_BYTES と同じ） */
const CHUNK = 8 * 1024 * 1024;

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
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
  const [progress, setProgress] = useState<{ name: string; sent: number; total: number } | null>(null);
  const [error, setError] = useState("");

  /** 8MB を超えるファイルは分割して送る（動画の納品向け。途中経過も出す） */
  const uploadLarge = async (file: File): Promise<UploadedFile[]> => {
    const id = crypto.randomUUID();
    const total = Math.ceil(file.size / CHUNK);
    for (let i = 0; i < total; i++) {
      const blob = file.slice(i * CHUNK, Math.min(file.size, (i + 1) * CHUNK));
      let lastErr = "";
      let done = false;
      for (let attempt = 0; attempt < 3 && !done; attempt++) {
        const res = await fetch("/api/uploads/chunk", {
          method: "POST",
          headers: {
            "x-upload-id": id,
            "x-chunk-index": String(i),
            "x-chunk-total": String(total),
            "x-file-size": String(file.size),
            "x-file-name": encodeURIComponent(file.name),
            "x-file-mime": file.type || "application/octet-stream",
          },
          body: blob,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          done = true;
          if (i === total - 1) return data.files as UploadedFile[];
        } else {
          lastErr = data.error ?? `HTTP ${res.status}`;
          // 400（容量オーバーなど）と 409（続きが合わない）はやり直しても直らない
          if (res.status === 400 || res.status === 409) throw new Error(lastErr);
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      if (!done) throw new Error(lastErr || "アップロードに失敗しました");
      setProgress({ name: file.name, sent: Math.min(file.size, (i + 1) * CHUNK), total: file.size });
    }
    return [];
  };

  const upload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError("");
    setBusy(true);
    try {
      const files = Array.from(list);
      const small = files.filter((f) => f.size <= CHUNK);
      const large = files.filter((f) => f.size > CHUNK);
      let added: UploadedFile[] = [];
      if (small.length > 0) {
        const body = new FormData();
        small.forEach((f) => body.append("file", f));
        // FormData のときは Content-Type をブラウザに任せる（境界文字列が必要なため）
        const res = await fetch("/api/uploads", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
        added = [...added, ...(data.files as UploadedFile[])];
      }
      for (const f of large) {
        setProgress({ name: f.name, sent: 0, total: f.size });
        added = [...added, ...(await uploadLarge(f))];
      }
      onChange([...value, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setBusy(false);
      setProgress(null);
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
        {progress ? (
          <div className="mx-auto mt-2 max-w-xs">
            <div className="h-2 w-full overflow-hidden rounded bg-slate-200">
              <div className="h-full bg-honey-400 transition-[width]" style={{ width: `${Math.round((progress.sent / progress.total) * 100)}%` }} />
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {progress.name} — {prettySize(progress.sent)} / {prettySize(progress.total)}（この画面を閉じないでください）
            </div>
          </div>
        ) : (
          <div className="mt-1 text-xs text-slate-500">またはクリックしてファイルを選択（1ファイル2GBまで。動画もそのまま入れられます）</div>
        )}
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
