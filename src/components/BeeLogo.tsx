"use client";

import { useId } from "react";

/**
 * FOOD HATCH のマスコット「ハッチ」— 飲食店仕様。
 * 白いコック帽、赤いバンダナ、小さなエプロン。体の縞は黄×黒をやめて
 * クリーム地×テラコッタ（サイトのテーマ色）にしてある。線は焦げ茶（#2B1410 / 2.2）。
 * BRIDGE HATCH のハッチと同じ骨格（丸い体・大きい目・ほっぺ）なので、同じキャラに見える。
 */
export const HATCH_OUTLINE = "#2B1410";
export const HATCH_BODY = "#FFF1E0";
export const HATCH_STRIPE = "#B84B30";
export const HATCH_BANDANA = "#D9382B";

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

      {/* 触角（帽子の下から横に出る） */}
      <path d="M15.5 12.5C13 10 11 8.5 9 8" stroke={HATCH_OUTLINE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M32.5 12.5C35 10 37 8.5 39 8" stroke={HATCH_OUTLINE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="8.4" cy="7.6" r="2.2" fill={HATCH_OUTLINE} />
      <circle cx="39.6" cy="7.6" r="2.2" fill={HATCH_OUTLINE} />

      {/* 羽 */}
      <ellipse cx="9.5" cy="22" rx="8" ry="5.6" fill="#FFFFFF" stroke={HATCH_OUTLINE} strokeWidth="1.6" transform="rotate(-24 9.5 22)" />
      <ellipse cx="38.5" cy="22" rx="8" ry="5.6" fill="#FFFFFF" stroke={HATCH_OUTLINE} strokeWidth="1.6" transform="rotate(24 38.5 22)" />

      {/* からだ（クリーム地にテラコッタの縞） */}
      <g clipPath={`url(#${bodyClip})`}>
        <rect x="13" y="13" width="22" height="29" fill={HATCH_BODY} />
        <rect x="13" y="30" width="22" height="4.2" fill={HATCH_STRIPE} />
        <rect x="13" y="37" width="22" height="4.2" fill={HATCH_STRIPE} />
      </g>
      <rect x="13" y="13" width="22" height="29" rx="11" fill="none" stroke={HATCH_OUTLINE} strokeWidth="2" />

      {/* エプロン（胸当てのある小さな前掛け） */}
      <path d="M18.5 33.5h11v3.8a5.5 5.5 0 0 1-5.5 5.2 5.5 5.5 0 0 1-5.5-5.2z" fill="#FFFFFF" stroke={HATCH_OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18.5 34.5c-1.6-0.6-2.6-1.2-3.4-2M29.5 34.5c1.6-0.6 2.6-1.2 3.4-2" stroke={HATCH_OUTLINE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* エプロンのワンポイント（はちみつのしずく） */}
      <path d="M24 35.4c-1.1 1.5-1.7 2.4-1.7 3.2a1.7 1.7 0 0 0 3.4 0c0-0.8-0.6-1.7-1.7-3.2z" fill="#FFC62E" stroke={HATCH_OUTLINE} strokeWidth="0.9" />

      {/* バンダナ（首に巻いた赤い布。右に結び目） */}
      <path d="M14.2 27.2c3 2.2 6.4 3.3 9.8 3.3s6.8-1.1 9.8-3.3l-0.6 2.8c-2.8 1.9-5.9 2.9-9.2 2.9s-6.4-1-9.2-2.9z" fill={HATCH_BANDANA} stroke={HATCH_OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M33.4 28.2l3.6-2.4 0.2 3.8-3.2 0.6z" fill={HATCH_BANDANA} stroke={HATCH_OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="18.5" cy="29.7" r="0.7" fill="#FFFFFF" />
      <circle cx="24" cy="30.9" r="0.7" fill="#FFFFFF" />
      <circle cx="29.5" cy="29.7" r="0.7" fill="#FFFFFF" />

      {/* かお */}
      <circle cx="19.6" cy="21" r="2.3" fill={HATCH_OUTLINE} />
      <circle cx="28.4" cy="21" r="2.3" fill={HATCH_OUTLINE} />
      <circle cx="20.4" cy="20.2" r="0.8" fill="#FFFFFF" />
      <circle cx="29.2" cy="20.2" r="0.8" fill="#FFFFFF" />
      <path d="M21.6 24.3C22.6 25.5 25.4 25.5 26.4 24.3" stroke={HATCH_OUTLINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <circle cx="15.9" cy="23.8" r="1.6" fill="#F49A96" opacity="0.8" />
      <circle cx="32.1" cy="23.8" r="1.6" fill="#F49A96" opacity="0.8" />

      {/* コック帽（ふんわりした白いトック） */}
      <path d="M14.5 13.5V10.2a3.2 3.2 0 0 1 3.2-3.2h12.6a3.2 3.2 0 0 1 3.2 3.2v3.3z" fill="#FFFFFF" stroke={HATCH_OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M15.3 8.4C12.6 6.9 12.9 2.9 16.4 2.6c0.4-2.3 3.8-2.9 5.1-1.1 1.2-1.9 4.1-1.9 5.3 0 1.3-1.8 4.7-1.2 5.1 1.1 3.5 0.3 3.8 4.3 1.1 5.8" fill="#FFFFFF" stroke={HATCH_OUTLINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M17.5 13.5V9M30.5 13.5V9" stroke={HATCH_OUTLINE} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
