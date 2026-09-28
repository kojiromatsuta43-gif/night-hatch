"use client";

import BeeLogo from "./BeeLogo";
import BeeGirl from "./BeeGirl";
import HoneyMark from "./HoneyMark";
import { MASCOT, MascotTheme } from "@/lib/mascot";

/** 呼び名・ポイント名などの文言を取り出す（ハッチ固定） */
export const useMascot = (): { mascot: MascotTheme } => ({ mascot: MASCOT });

/** マスコットの絵。BeeLogo と同じ使い方。 */
export function Mascot({ className = "h-8 w-8" }: { className?: string }) {
  return <BeeLogo className={className} />;
}

/**
 * 黒服のハッチとドレスのハッチを並べて出す（あいさつ・ログインなど大きく見せる場所用）。
 * className は1人ぶんの大きさ。ドレスのハッチは少し遅れてふわふわ動く。
 */
export function HatchPair({ className = "h-16 w-16", float = true }: { className?: string; float?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-end" aria-label="黒服のハッチとドレスのハッチ">
      <BeeLogo className={`${className} ${float ? "animate-bee-float" : ""}`} />
      <BeeGirl className={`${className} -ml-[18%] ${float ? "animate-bee-float [animation-delay:0.6s]" : ""}`} />
    </span>
  );
}

/** ポイントのしるし（大きく出す用）。 */
export function PointMark({ className = "h-8 w-8" }: { className?: string }) {
  return <HoneyMark className={`inline-block ${className}`} />;
}

/** 文章の中に混ぜる用。 */
export function PointInline() {
  return <HoneyMark className="inline-block h-[1.1em] w-[1.1em] align-[-0.2em] mx-0.5" />;
}

export default function MascotProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
