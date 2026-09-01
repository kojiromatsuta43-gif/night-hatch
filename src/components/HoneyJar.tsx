"use client";

/**
 * はちみつの瓶。残高が多いほど中身が満ちる（100ptで満タン表示）。
 * 上部ナビの右上に置く。
 */
export default function HoneyJar({ points, className = "h-9 w-8" }: { points: number; className?: string }) {
  const level = Math.max(0.08, Math.min(1, points / 100)); // 0.08 = 空でも底に少し
  const top = 12; // 瓶の中の上端
  const bottom = 42; // 瓶の中の下端
  const y = bottom - (bottom - top) * level;
  return (
    <svg viewBox="0 0 40 48" className={className} role="img" aria-label={`ハニーP 残高 ${points}`}>
      <rect x="11" y="3" width="18" height="6" rx="2" fill="#FFC62E" />
      <path d="M8 12h24v26a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V12z" fill="#FFFFFF" stroke="#FFC62E" strokeWidth="2.5" />
      <clipPath id="jar-inner">
        <path d="M9.5 13.5h21V38a4.5 4.5 0 0 1-4.5 4.5H14A4.5 4.5 0 0 1 9.5 38V13.5z" />
      </clipPath>
      <rect x="9" y={y} width="22" height={44 - y} fill="#FFC62E" clipPath="url(#jar-inner)" />
    </svg>
  );
}
