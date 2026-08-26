"use client";

import { useEffect, useRef, useState } from "react";

/** ブラウザの音声認識。Chrome/Edge/Safariで動く。 */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognitionClass(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

/**
 * 喋った内容を入力欄に足すマイクボタン。
 * 対応していないブラウザでは何も表示しない（邪魔をしない）。
 */
export default function MicButton({
  onText,
  title = "喋って入力",
  className = "",
}: {
  onText: (text: string) => void;
  title?: string;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const ref = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const ok = getRecognitionClass() !== null;
    const t = setTimeout(() => setSupported(ok), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      try {
        ref.current?.stop();
      } catch {}
    };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      try {
        ref.current?.stop();
      } catch {}
      setListening(false);
      return;
    }
    const Ctor = getRecognitionClass();
    if (!Ctor) return;
    const rec = new Ctor();
    ref.current = rec;
    rec.lang = "ja-JP";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      if (text.trim()) onText(text.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "停止する" : title}
      aria-label={listening ? "音声入力を停止" : title}
      aria-pressed={listening}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
        listening
          ? "animate-pulse border-rose-400 bg-rose-500 text-white"
          : "border-slate-300 bg-white text-slate-500 hover:border-honey-400 hover:text-honey-600"
      } ${className}`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8.5 22h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
