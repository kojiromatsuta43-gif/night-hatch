"use client";

import { useId } from "react";

/** ハッチ嬢: リボンをつけた女の子のハチ（発注トップのあいさつ枠だけに登場） */
export default function BeeGirl({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const bodyClip = `bee-girl-body-${uid}`;
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="ハッチ嬢">
      <defs>
        <clipPath id={bodyClip}>
          <rect x="13" y="13" width="22" height="29" rx="11" />
        </clipPath>
      </defs>
      {/* 触角 */}
      <path d="M20 14C18.5 9 16 7.5 13.5 7" stroke="#1C1710" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M28 14C29.5 9 32 7.5 34.5 7" stroke="#1C1710" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="12.8" cy="6.4" r="2.4" fill="#1C1710" />
      <circle cx="35.2" cy="6.4" r="2.4" fill="#1C1710" />
      {/* 羽 */}
      <ellipse cx="9.5" cy="20" rx="8" ry="5.6" fill="#FFFFFF" stroke="#1C1710" strokeWidth="1.6" transform="rotate(-24 9.5 20)" />
      <ellipse cx="38.5" cy="20" rx="8" ry="5.6" fill="#FFFFFF" stroke="#1C1710" strokeWidth="1.6" transform="rotate(24 38.5 20)" />
      {/* からだ */}
      <g clipPath={`url(#${bodyClip})`}>
        <rect x="13" y="13" width="22" height="29" fill="#FFC62E" />
        <rect x="13" y="27.5" width="22" height="4.6" fill="#1C1710" />
        <rect x="13" y="36" width="22" height="4.6" fill="#1C1710" />
      </g>
      <rect x="13" y="13" width="22" height="29" rx="11" fill="none" stroke="#1C1710" strokeWidth="2" />
      {/* かお（まつ毛つき） */}
      <circle cx="19.6" cy="21.5" r="2.3" fill="#1C1710" />
      <circle cx="28.4" cy="21.5" r="2.3" fill="#1C1710" />
      <circle cx="20.4" cy="20.7" r="0.8" fill="#FFFFFF" />
      <circle cx="29.2" cy="20.7" r="0.8" fill="#FFFFFF" />
      <path d="M16.9 19.4l-1.6-1.2M17.6 18.3l-1.1-1.6" stroke="#1C1710" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M31.1 19.4l1.6-1.2M30.4 18.3l1.1-1.6" stroke="#1C1710" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M21.6 24.6C22.6 25.8 25.4 25.8 26.4 24.6" stroke="#1C1710" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <circle cx="15.8" cy="24.2" r="1.9" fill="#FF9DA5" opacity="0.85" />
      <circle cx="32.2" cy="24.2" r="1.9" fill="#FF9DA5" opacity="0.85" />
      {/* リボン */}
      <g transform="translate(29 11) rotate(18)">
        <path d="M0 0L-7 -4.2Q-8.6 0 -7 4.2Z" fill="#FF5C7A" stroke="#1C1710" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M0 0L7 -4.2Q8.6 0 7 4.2Z" fill="#FF5C7A" stroke="#1C1710" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="0" cy="0" r="2" fill="#FF8AA0" stroke="#1C1710" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
