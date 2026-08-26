"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import BeeLogo from "./BeeLogo";
import PigLogo from "./PigLogo";
import {
  DEFAULT_MASCOT,
  MASCOTS,
  MASCOT_STORAGE_KEY,
  MASCOT_SWITCHER_ENABLED,
  MascotId,
  MascotTheme,
} from "@/lib/mascot";

type Ctx = { mascot: MascotTheme; setMascot: (id: MascotId) => void };

const MascotCtx = createContext<Ctx>({
  mascot: MASCOTS[DEFAULT_MASCOT],
  setMascot: () => {},
});

export const useMascot = () => useContext(MascotCtx);

/** 現在のキャラクターの絵。BeeLogo と同じ使い方。 */
export function Mascot({ className = "h-8 w-8" }: { className?: string }) {
  const { mascot } = useMascot();
  if (mascot.id === "pig") return <PigLogo className={className} />;
  return <BeeLogo className={className} />;
}

/** ポイントのしるし（大きく出す用）。 */
export function PointMark({ className = "h-8 w-8" }: { className?: string }) {
  const { mascot } = useMascot();
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      {mascot.pointEmoji}
    </span>
  );
}

/** 文章の中に混ぜる用。 */
export function PointInline() {
  const { mascot } = useMascot();
  return <>{mascot.pointEmoji}</>;
}

export default function MascotProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<MascotId>(DEFAULT_MASCOT);

  // 保存済みの選択を読み出す（端末ごとに保持。サーバーには送らない）
  useEffect(() => {
    if (!MASCOT_SWITCHER_ENABLED) return;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(MASCOT_STORAGE_KEY);
    } catch {
      // プライベートモード等では既定値のまま
    }
    if (saved !== "pig" && saved !== "bee") return;
    const next = saved;
    const t = setTimeout(() => setId(next), 0);
    return () => clearTimeout(t);
  }, []);

  const active: MascotId = MASCOT_SWITCHER_ENABLED ? id : DEFAULT_MASCOT;

  // 配色を切り替えるため <html> に印を付ける
  useEffect(() => {
    document.documentElement.dataset.mascot = active;
  }, [active]);

  const setMascot = useCallback((next: MascotId) => {
    setId(next);
    try {
      window.localStorage.setItem(MASCOT_STORAGE_KEY, next);
    } catch {}
  }, []);

  return (
    <MascotCtx.Provider value={{ mascot: MASCOTS[active], setMascot }}>{children}</MascotCtx.Provider>
  );
}
