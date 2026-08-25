"use client";

import { useId } from "react";

/** キャラクター切替用のたぬき。BeeLogo / PigLogo と同じ丸っこい作り。 */
export default function TanukiLogo({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const tailClip = `tanuki-tail-${uid}`;

  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="たぬきのマーク">
      <defs>
        <clipPath id={tailClip}>
          <ellipse cx="39" cy="32" rx="5" ry="7.6" transform="rotate(28 39 32)" />
        </clipPath>
      </defs>

      {/* しっぽ（からだの後ろ・しま模様） */}
      <g>
        <ellipse cx="39" cy="32" rx="5" ry="7.6" transform="rotate(28 39 32)" fill="#C89B6A" />
        <g clipPath={`url(#${tailClip})`}>
          <rect x="31" y="33.5" width="18" height="3.4" fill="#4E351D" transform="rotate(28 39 32)" />
          <rect x="31" y="27.5" width="18" height="3.4" fill="#4E351D" transform="rotate(28 39 32)" />
        </g>
        <ellipse cx="39" cy="32" rx="5" ry="7.6" transform="rotate(28 39 32)" fill="none" stroke="#1C1710" strokeWidth="1.8" />
      </g>

      {/* みみ */}
      <path d="M13.5 15 11 6.5 20.5 10.5Z" fill="#C89B6A" stroke="#1C1710" strokeWidth="2" strokeLinejoin="round" />
      <path d="M34.5 15 37 6.5 27.5 10.5Z" fill="#C89B6A" stroke="#1C1710" strokeWidth="2" strokeLinejoin="round" />

      {/* からだ */}
      <rect x="10.5" y="12" width="27" height="29.5" rx="13.5" fill="#C89B6A" stroke="#1C1710" strokeWidth="2" />

      {/* おなかの模様 */}
      <ellipse cx="24" cy="36" rx="8" ry="5.2" fill="#F5E9DA" />

      {/* 目のまわりの黒い模様（たぬきの特徴） */}
      <ellipse cx="18.3" cy="22.2" rx="4.6" ry="5" transform="rotate(-12 18.3 22.2)" fill="#4E351D" />
      <ellipse cx="29.7" cy="22.2" rx="4.6" ry="5" transform="rotate(12 29.7 22.2)" fill="#4E351D" />

      {/* め */}
      <circle cx="18.6" cy="21.8" r="2.5" fill="#FFFFFF" />
      <circle cx="29.4" cy="21.8" r="2.5" fill="#FFFFFF" />
      <circle cx="18.9" cy="21.9" r="1.5" fill="#1C1710" />
      <circle cx="29.7" cy="21.9" r="1.5" fill="#1C1710" />
      <circle cx="19.4" cy="21.3" r="0.55" fill="#FFFFFF" />
      <circle cx="30.2" cy="21.3" r="0.55" fill="#FFFFFF" />

      {/* はな・くち */}
      <ellipse cx="24" cy="29.4" rx="6.6" ry="4.4" fill="#F5E9DA" stroke="#1C1710" strokeWidth="1.6" />
      <ellipse cx="24" cy="27.6" rx="1.9" ry="1.45" fill="#1C1710" />
      <path d="M24 29.2v1.5M24 30.7c-.9 1-2.4.9-3 0M24 30.7c.9 1 2.4.9 3 0" stroke="#1C1710" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
