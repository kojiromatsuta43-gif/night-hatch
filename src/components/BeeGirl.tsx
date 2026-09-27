"use client";

import { useId } from "react";

/**
 * ハッチ嬢: 金のリボンをつけた女の子のハチ（通常版の発注トップのあいさつ枠だけに登場）。
 * NIGHT HATCH 仕様: 体の縞は黒×シャンパンゴールド、暗い地でも沈まないよう生成りの縁を敷く。
 */
export default function BeeGirl({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const bodyClip = `bee-girl-body-${uid}`;
  const O = "#1C1522";
  const HALO = "#F3EDE2";
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="ハッチ嬢">
      <defs>
        <clipPath id={bodyClip}>
          <rect x="13" y="13" width="22" height="29" rx="11" />
        </clipPath>
      </defs>
      {/* 下敷きの縁 */}
      <g opacity="0.92" fill={HALO} stroke={HALO} strokeLinejoin="round">
        <ellipse cx="9.5" cy="20" rx="8" ry="5.6" strokeWidth="3.8" transform="rotate(-24 9.5 20)" />
        <ellipse cx="38.5" cy="20" rx="8" ry="5.6" strokeWidth="3.8" transform="rotate(24 38.5 20)" />
        <rect x="13" y="13" width="22" height="29" rx="11" strokeWidth="4.4" />
      </g>
      {/* 触角 */}
      <path d="M20 14C18.5 9 16 7.5 13.5 7" stroke={O} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M28 14C29.5 9 32 7.5 34.5 7" stroke={O} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="12.8" cy="6.4" r="2.4" fill="#D4AF6A" stroke={O} strokeWidth="1.2" />
      <circle cx="35.2" cy="6.4" r="2.4" fill="#D4AF6A" stroke={O} strokeWidth="1.2" />
      {/* 羽 */}
      <ellipse cx="9.5" cy="20" rx="8" ry="5.6" fill="#EFEAF7" stroke={O} strokeWidth="1.6" transform="rotate(-24 9.5 20)" />
      <ellipse cx="38.5" cy="20" rx="8" ry="5.6" fill="#EFEAF7" stroke={O} strokeWidth="1.6" transform="rotate(24 38.5 20)" />
      {/* からだ */}
      <g clipPath={`url(#${bodyClip})`}>
        <rect x="13" y="13" width="22" height="29" fill="#F4E6C6" />
        <rect x="13" y="27.5" width="22" height="16" fill="#D4AF6A" />
        <rect x="13" y="30" width="22" height="4" fill={O} />
        <rect x="13" y="37" width="22" height="4" fill={O} />
      </g>
      <rect x="13" y="13" width="22" height="29" rx="11" fill="none" stroke={O} strokeWidth="2" />
      {/* かお（まつ毛つき） */}
      <circle cx="19.6" cy="21.5" r="2.3" fill={O} />
      <circle cx="28.4" cy="21.5" r="2.3" fill={O} />
      <circle cx="20.4" cy="20.7" r="0.8" fill="#FFFFFF" />
      <circle cx="29.2" cy="20.7" r="0.8" fill="#FFFFFF" />
      <path d="M16.9 19.4l-1.6-1.2M17.6 18.3l-1.1-1.6" stroke={O} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M31.1 19.4l1.6-1.2M30.4 18.3l1.1-1.6" stroke={O} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M21.6 24.6C22.6 25.8 25.4 25.8 26.4 24.6" stroke={O} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <circle cx="15.8" cy="24.2" r="1.9" fill="#F08BA4" opacity="0.85" />
      <circle cx="32.2" cy="24.2" r="1.9" fill="#F08BA4" opacity="0.85" />
      {/* 金のリボン */}
      <g transform="translate(29 11) rotate(18)">
        <path d="M0 0L-7 -4.2Q-8.6 0 -7 4.2Z" fill="#D4AF6A" stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M0 0L7 -4.2Q8.6 0 7 4.2Z" fill="#D4AF6A" stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="0" cy="0" r="2" fill="#B23A62" stroke={O} strokeWidth="1.2" />
      </g>
    </svg>
  );
}
