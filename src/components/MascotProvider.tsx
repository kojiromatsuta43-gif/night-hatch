"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import BeeLogo from "./BeeLogo";
import PigLogo from "./PigLogo";
import TanukiLogo from "./TanukiLogo";
import LemonCanLogo from "./LemonCanLogo";
import {
  DEFAULT_MASCOT,
  FUN_STORAGE_KEY,
  MASCOTS,
  MASCOT_STORAGE_KEY,
  MASCOT_SWITCHER_ENABLED,
  MascotId,
  MascotTheme,
} from "@/lib/mascot";

type Ctx = {
  mascot: MascotTheme;
  setMascot: (id: MascotId) => void;
  /** 合言葉を入れた端末だけ true。false のときは機能ごと存在しない扱い */
  unlocked: boolean;
  /** その場で元に戻す（ハチ固定＋タブを隠す） */
  lock: () => void;
};

const MascotCtx = createContext<Ctx>({
  mascot: MASCOTS[DEFAULT_MASCOT],
  setMascot: () => {},
  unlocked: false,
  lock: () => {},
});

export const useMascot = () => useContext(MascotCtx);

/** 現在のキャラクターの絵。BeeLogo と同じ使い方。 */
export function Mascot({ className = "h-8 w-8" }: { className?: string }) {
  const { mascot } = useMascot();
  if (mascot.id === "pig") return <PigLogo className={className} />;
  if (mascot.id === "tanuki") return <TanukiLogo className={className} />;
  return <BeeLogo className={className} />;
}

/** ポイントのしるし（大きく出す用）。 */
export function PointMark({ className = "h-8 w-8" }: { className?: string }) {
  const { mascot } = useMascot();
  if (mascot.id === "tanuki") return <LemonCanLogo className={className} />;
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      {mascot.pointEmoji}
    </span>
  );
}

/** 文章の中に混ぜる用。文字サイズに追従する。 */
export function PointInline() {
  const { mascot } = useMascot();
  if (mascot.id === "tanuki") {
    return <LemonCanLogo className="inline-block h-[1.3em] w-[1.3em] align-[-0.33em]" />;
  }
  return <>{mascot.pointEmoji}</>;
}

function readStored(): { open: boolean; saved: MascotId } {
  let open = false;
  let saved: MascotId = DEFAULT_MASCOT;
  try {
    open = window.localStorage.getItem(FUN_STORAGE_KEY) === "on";
    const m = window.localStorage.getItem(MASCOT_STORAGE_KEY);
    if (m === "pig" || m === "tanuki" || m === "bee") saved = m;
  } catch {
    // プライベートモード等では既定値のまま
  }
  return { open, saved };
}

export default function MascotProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [id, setId] = useState<MascotId>(DEFAULT_MASCOT);

  useEffect(() => {
    if (!MASCOT_SWITCHER_ENABLED) return;

    // URL の合言葉（?fun=on で表示 / ?fun=off で消す）
    let cmd: "on" | "off" | null = null;
    try {
      const q = new URLSearchParams(window.location.search).get("fun");
      if (q === "on") cmd = "on";
      else if (q === "off") cmd = "off";
    } catch {
      // 何もしない
    }

    let { open, saved } = readStored();

    if (cmd === "on") {
      open = true;
      try {
        window.localStorage.setItem(FUN_STORAGE_KEY, "on");
      } catch {}
    } else if (cmd === "off") {
      open = false;
      saved = DEFAULT_MASCOT;
      try {
        window.localStorage.removeItem(FUN_STORAGE_KEY);
        window.localStorage.removeItem(MASCOT_STORAGE_KEY);
      } catch {}
    }

    // 合言葉をURLから消して、履歴に残さない
    if (cmd) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete("fun");
        window.history.replaceState({}, "", u.pathname + u.search + u.hash);
      } catch {}
    }

    const nextOpen = open;
    const nextId = open ? saved : DEFAULT_MASCOT;
    const t = setTimeout(() => {
      setUnlocked(nextOpen);
      setId(nextId);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const active: MascotId = MASCOT_SWITCHER_ENABLED && unlocked ? id : DEFAULT_MASCOT;

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

  const lock = useCallback(() => {
    setUnlocked(false);
    setId(DEFAULT_MASCOT);
    try {
      window.localStorage.removeItem(FUN_STORAGE_KEY);
      window.localStorage.removeItem(MASCOT_STORAGE_KEY);
    } catch {}
  }, []);

  return (
    <MascotCtx.Provider
      value={{
        mascot: MASCOTS[active],
        setMascot,
        unlocked: MASCOT_SWITCHER_ENABLED && unlocked,
        lock,
      }}
    >
      {children}
    </MascotCtx.Provider>
  );
}
