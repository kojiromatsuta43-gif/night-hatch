"use client";

import { useId } from "react";

/** BRIDGE HATCH のマスコット。丸っこい可愛らしいミツバチ。 */
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

      {/* 触角 */}
      <path d="M20 14C18.5 9 16 7.5 13.5 7" stroke="#1C1710" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M28 14C29.5 9 32 7.5 34.5 7" stroke="#1C1710" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="12.8" cy="6.4" r="2.4" fill="#1C1710" />
      <circle cx="35.2" cy="6.4" r="2.4" fill="#1C1710" />

      {/* 羽 */}
      <ellipse cx="9.5" cy="20" rx="8" ry="5.6" fill="#FFFFFF" stroke="#1C1710" strokeWidth="1.6" transform="rotate(-24 9.5 20)" />
      <ellipse cx="38.5" cy="20" rx="8" ry="5.6" fill="#FFFFFF" stroke="#1C1710" strokeWidth="1.6" transform="rotate(24 38.5 20)" />

      {/* からだ（黄色と黒の縞） */}
      <g clipPath={`url(#${bodyClip})`}>
        <rect x="13" y="13" width="22" height="29" fill="#FFC62E" />
        <rect x="13" y="27.5" width="22" height="4.6" fill="#1C1710" />
        <rect x="13" y="36" width="22" height="4.6" fill="#1C1710" />
      </g>
      <rect x="13" y="13" width="22" height="29" rx="11" fill="none" stroke="#1C1710" strokeWidth="2" />

      {/* かお */}
      <circle cx="19.6" cy="21.5" r="2.3" fill="#1C1710" />
      <circle cx="28.4" cy="21.5" r="2.3" fill="#1C1710" />
      <circle cx="20.4" cy="20.7" r="0.8" fill="#FFFFFF" />
      <circle cx="29.2" cy="20.7" r="0.8" fill="#FFFFFF" />
      <path d="M21.6 24.6C22.6 25.8 25.4 25.8 26.4 24.6" stroke="#1C1710" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <circle cx="15.8" cy="24.2" r="1.6" fill="#FF9DA5" opacity="0.75" />
      <circle cx="32.2" cy="24.2" r="1.6" fill="#FF9DA5" opacity="0.75" />
    </svg>
  );
}
