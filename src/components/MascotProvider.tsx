"use client";

import BeeLogo from "./BeeLogo";
import { MASCOT, MascotTheme } from "@/lib/mascot";

/** 呼び名・ポイント名などの文言を取り出す（ハチ固定） */
export const useMascot = (): { mascot: MascotTheme } => ({ mascot: MASCOT });

/** マスコットの絵。BeeLogo と同じ使い方。 */
export function Mascot({ className = "h-8 w-8" }: { className?: string }) {
  return <BeeLogo className={className} />;
}

/** ポイントのしるし（大きく出す用）。 */
export function PointMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      {MASCOT.pointEmoji}
    </span>
  );
}

/** 文章の中に混ぜる用。 */
export function PointInline() {
  return <>{MASCOT.pointEmoji}</>;
}

export default function MascotProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
