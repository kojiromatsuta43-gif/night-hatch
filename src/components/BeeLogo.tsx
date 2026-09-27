"use client";

import { useId } from "react";

/**
 * NIGHT HATCH のマスコット「ハッチ」— 夜のお店仕様。
 * BRIDGE / FOOD のハッチと同じ骨格（丸い体・大きい目・ほっぺ・触角・羽）のまま、
 * 白シャツの襟・黒いベスト・金の蝶ネクタイを着せ、体の縞は黒×シャンパンゴールドにした。
 * 額には小さな金の三日月。
 * 暗い地に沈まないよう、シルエットの外側にごく薄い生成りの縁（ステッカー風）を敷いてある。
 */
export const HATCH_OUTLINE = "#1C1522";
export const HATCH_FACE = "#F4E6C6"; // 顔まわりの明るいシャンパン
export const HATCH_GOLD = "#D4AF6A"; // シャンパンゴールド
export const HATCH_DEEP_GOLD = "#B8903F";
export const HATCH_BLACK = "#1C1522";
const HALO = "#F3EDE2";

export default function BeeLogo({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const bodyClip = `bee-body-${uid}`;

  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="ハッチのマーク">
      <defs>
        <clipPath id={bodyClip}>
          <rect x="13" y="13" width="22" height="29" rx="11" />
        </clipPath>
      </defs>

      {/* 下敷き: 暗い地でも輪郭が見えるように、シルエットより少し太い生成りの縁 */}
      <g opacity="0.92" fill={HALO} stroke={HALO} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13.5C16 10 13.5 8.2 11 7.8" strokeWidth="5" fill="none" />
        <path d="M30 13.5C32 10 34.5 8.2 37 7.8" strokeWidth="5" fill="none" />
        <circle cx="10.4" cy="7.6" r="3.6" strokeWidth="0" />
        <circle cx="37.6" cy="7.6" r="3.6" strokeWidth="0" />
        <ellipse cx="9.5" cy="22" rx="8" ry="5.6" strokeWidth="3.8" transform="rotate(-24 9.5 22)" />
        <ellipse cx="38.5" cy="22" rx="8" ry="5.6" strokeWidth="3.8" transform="rotate(24 38.5 22)" />
        <rect x="13" y="13" width="22" height="29" rx="11" strokeWidth="4.4" />
      </g>

      {/* 触角 */}
      <path d="M18 13.5C16 10 13.5 8.2 11 7.8" stroke={HATCH_OUTLINE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M30 13.5C32 10 34.5 8.2 37 7.8" stroke={HATCH_OUTLINE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="10.4" cy="7.6" r="2.2" fill={HATCH_GOLD} stroke={HATCH_OUTLINE} strokeWidth="1.3" />
      <circle cx="37.6" cy="7.6" r="2.2" fill={HATCH_GOLD} stroke={HATCH_OUTLINE} strokeWidth="1.3" />

      {/* 羽（ほんのりラベンダーの透け感） */}
      <ellipse cx="9.5" cy="22" rx="8" ry="5.6" fill="#EFEAF7" stroke={HATCH_OUTLINE} strokeWidth="1.6" transform="rotate(-24 9.5 22)" />
      <ellipse cx="38.5" cy="22" rx="8" ry="5.6" fill="#EFEAF7" stroke={HATCH_OUTLINE} strokeWidth="1.6" transform="rotate(24 38.5 22)" />
      <path d="M5.5 22.5c2 -1.8 4.6 -2.6 7.4 -2.4M42.5 22.5c-2 -1.8 -4.6 -2.6 -7.4 -2.4" stroke="#C9C0DA" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* からだ: 顔まわりは明るいシャンパン、下は黒×シャンパンゴールドの縞 */}
      <g clipPath={`url(#${bodyClip})`}>
        <rect x="13" y="13" width="22" height="29" fill={HATCH_FACE} />
        <rect x="13" y="28.6" width="22" height="14" fill={HATCH_GOLD} />
        <rect x="13" y="31.2" width="22" height="3.4" fill={HATCH_BLACK} />
        <rect x="13" y="37.4" width="22" height="3.4" fill={HATCH_BLACK} />

        {/* 黒いベスト（V字の襟元から白シャツがのぞく） */}
        <path d="M17.6 28.4H21.3L24 34.6L26.7 28.4H30.4V43H17.6Z" fill={HATCH_BLACK} />
        <path d="M21.3 28.4L24 34.6L26.7 28.4Z" fill="#FFFFFF" />
        <path d="M17.6 28.4H21.3L24 34.6L26.7 28.4H30.4" stroke={HATCH_GOLD} strokeWidth="0.7" fill="none" strokeLinejoin="round" opacity="0.9" />
        <circle cx="24" cy="36.9" r="0.75" fill={HATCH_GOLD} />
        <circle cx="24" cy="39.6" r="0.75" fill={HATCH_GOLD} />
      </g>
      <rect x="13" y="13" width="22" height="29" rx="11" fill="none" stroke={HATCH_OUTLINE} strokeWidth="2" />

      {/* 白シャツの襟 */}
      <path d="M19.2 27.2L24 29.4L22 31.4Z" fill="#FFFFFF" stroke={HATCH_OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M28.8 27.2L24 29.4L26 31.4Z" fill="#FFFFFF" stroke={HATCH_OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />

      {/* 金の蝶ネクタイ */}
      <path d="M24 29.6L19.9 27.6Q19.2 29.6 19.9 31.6Z" fill={HATCH_GOLD} stroke={HATCH_OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M24 29.6L28.1 27.6Q28.8 29.6 28.1 31.6Z" fill={HATCH_GOLD} stroke={HATCH_OUTLINE} strokeWidth="1.1" strokeLinejoin="round" />
      <rect x="22.8" y="28.5" width="2.4" height="2.2" rx="0.8" fill={HATCH_DEEP_GOLD} stroke={HATCH_OUTLINE} strokeWidth="1" />

      {/* 額の三日月 */}
      <path d="M25.6 14.9a2.5 2.5 0 1 0 0 4.2a2 2 0 1 1 0 -4.2z" fill={HATCH_DEEP_GOLD} stroke={HATCH_OUTLINE} strokeWidth="0.6" strokeLinejoin="round" />

      {/* かお */}
      <circle cx="19.6" cy="22" r="2.3" fill={HATCH_OUTLINE} />
      <circle cx="28.4" cy="22" r="2.3" fill={HATCH_OUTLINE} />
      <circle cx="20.4" cy="21.2" r="0.8" fill="#FFFFFF" />
      <circle cx="29.2" cy="21.2" r="0.8" fill="#FFFFFF" />
      <path d="M21.6 25.1C22.6 26.2 25.4 26.2 26.4 25.1" stroke={HATCH_OUTLINE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="15.9" cy="24.6" r="1.6" fill="#F08BA4" opacity="0.8" />
      <circle cx="32.1" cy="24.6" r="1.6" fill="#F08BA4" opacity="0.8" />
    </svg>
  );
}
