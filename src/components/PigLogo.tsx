"use client";

/** キャラクター切替用のぶた。BeeLogo と同じ丸っこい作り。 */
export default function PigLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="ぶたのマーク">
      {/* しっぽ */}
      <path
        d="M37 30c3 0 3.6 2.4 2 3.4-1.5 1-2.6-.6-1.4-1.6"
        stroke="#1C1710"
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
      />
      {/* 耳 */}
      <path d="M14.5 15.5 11.5 5.5 22 10.5Z" fill="#FFB5C8" stroke="#1C1710" strokeWidth="2" strokeLinejoin="round" />
      <path d="M33.5 15.5 36.5 5.5 26 10.5Z" fill="#FFB5C8" stroke="#1C1710" strokeWidth="2" strokeLinejoin="round" />
      {/* からだ */}
      <rect x="10.5" y="11.5" width="27" height="30" rx="13.5" fill="#FFB5C8" stroke="#1C1710" strokeWidth="2" />
      {/* ほっぺ */}
      <circle cx="14.6" cy="28" r="1.9" fill="#FF6F91" opacity="0.55" />
      <circle cx="33.4" cy="28" r="1.9" fill="#FF6F91" opacity="0.55" />
      {/* め */}
      <circle cx="18.8" cy="22" r="2.3" fill="#1C1710" />
      <circle cx="29.2" cy="22" r="2.3" fill="#1C1710" />
      <circle cx="19.6" cy="21.2" r="0.8" fill="#FFFFFF" />
      <circle cx="30" cy="21.2" r="0.8" fill="#FFFFFF" />
      {/* はな */}
      <ellipse cx="24" cy="31.5" rx="7.2" ry="5.2" fill="#FF9DB4" stroke="#1C1710" strokeWidth="1.8" />
      <ellipse cx="21.4" cy="31.5" rx="1.25" ry="1.9" fill="#1C1710" />
      <ellipse cx="26.6" cy="31.5" rx="1.25" ry="1.9" fill="#1C1710" />
    </svg>
  );
}
