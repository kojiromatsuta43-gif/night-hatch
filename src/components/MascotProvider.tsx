"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import BeeLogo from "./BeeLogo";
import PigLogo from "./PigLogo";
import TanukiLogo from "./TanukiLogo";
import LemonCanLogo from "./LemonCanLogo";
import { DEFAULT_MASCOT, MASCOTS, MASCOT_STORAGE_KEY, MascotId, MascotTheme } from "@/lib/mascot";

const Ctx = createContext<{ mascot: MascotTheme; setMascot: (id: MascotId) => void }>({
  mascot: MASCOTS[DEFAULT_MASCOT],
  setMascot: () => {},
});

export const useMascot = () => useContext(Ctx);

/** 現在のキャラクターの絵を出す。BeeLogo と同じ使い方。 */
export function Mascot({ className = "h-8 w-8" }: { className?: string }) {
  const { mascot } = useMascot();
  if (mascot.id === "pig") return <PigLogo className={className} />;
  if (mascot.id === "tanuki") return <TanukiLogo className={className} />;
  return <BeeLogo className={className} />;
}

/** ポイントのしるし。絵があるキャラは絵、無ければ絵文字を大きく出す。 */
export function PointMark({ className = "h-8 w-8" }: { className?: string }) {
  const { mascot } = useMascot();
  if (mascot.id === "tanuki") return <LemonCanLogo className={className} />;
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      {mascot.pointEmoji}
    </span>
  );
}

export default function MascotProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<MascotId>(DEFAULT_MASCOT);

  // 保存済みの選択を読み出す（端末ごとに保持。サーバーには送らない）
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(MASCOT_STORAGE_KEY);
    } catch {
      // プライベートモード等では無視してデフォルトのまま
    }
    if (saved !== "pig" && saved !== "bee") return;
    const t = setTimeout(() => setId(saved), 0);
    return () => clearTimeout(t);
  }, []);

  // 配色を切り替えるため <html> に印を付ける
  useEffect(() => {
    document.documentElement.dataset.mascot = id;
  }, [id]);

  const setMascot = useCallback((next: MascotId) => {
    setId(next);
    try {
      window.localStorage.setItem(MASCOT_STORAGE_KEY, next);
    } catch {
      // 保存できなくても表示は切り替わる
    }
  }, []);

  return <Ctx.Provider value={{ mascot: MASCOTS[id], setMascot }}>{children}</Ctx.Provider>;
}
