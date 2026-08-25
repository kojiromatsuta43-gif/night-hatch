"use client";

import { useId } from "react";

/**
 * ポイントのしるし（たぬきモード）: 無糖レモンサワーの缶。
 * 実在ブランドのロゴ・商品名は使っていない一般的な缶の絵です。
 */
export default function LemonCanLogo({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const bodyClip = `can-body-${uid}`;
  const silver = `can-silver-${uid}`;

  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="無糖レモンの缶">
      <defs>
        <linearGradient id={silver} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C9D3DA" />
          <stop offset="28%" stopColor="#FAFCFD" />
          <stop offset="62%" stopColor="#DEE6EB" />
          <stop offset="100%" stopColor="#AEBAC4" />
        </linearGradient>
        <clipPath id={bodyClip}>
          <rect x="14" y="9" width="20" height="32" rx="4.5" />
        </clipPath>
      </defs>

      {/* 缶のからだ */}
      <rect x="14" y="9" width="20" height="32" rx="4.5" fill={`url(#${silver})`} />

      <g clipPath={`url(#${bodyClip})`}>
        {/* 青の斜めベルト */}
        <path d="M8 27 L40 17 L40 25 L8 35Z" fill="#1F6FD0" />
        <path d="M8 25.4 L40 15.4 L40 17.2 L8 27.2Z" fill="#7FC4F2" />
        {/* 氷のかけら */}
        <path d="M18 13.5l1.6 2.2-1.6 2.2-1.6-2.2z" fill="#BFE3FA" />
        <path d="M29.5 33.5l1.4 1.9-1.4 1.9-1.4-1.9z" fill="#BFE3FA" opacity="0.9" />
        {/* レモンの輪切り */}
        <g transform="translate(24 24)">
          <circle r="6.4" fill="#F7D64A" stroke="#E0AE12" strokeWidth="1" />
          <circle r="5" fill="#FFF0A8" />
          <g stroke="#E8BE2A" strokeWidth="0.9" strokeLinecap="round">
            <path d="M0 0v-4.6M0 0v4.6M0 0h-4.6M0 0h4.6M0 0l3.3-3.3M0 0l-3.3 3.3M0 0l3.3 3.3M0 0l-3.3-3.3" />
          </g>
          <circle r="1.1" fill="#F7D64A" />
        </g>
      </g>
      <rect x="14" y="9" width="20" height="32" rx="4.5" fill="none" stroke="#1C1710" strokeWidth="2" />

      {/* ふた・プルタブ */}
      <ellipse cx="24" cy="9.4" rx="10" ry="2.6" fill="#D5DDE3" stroke="#1C1710" strokeWidth="1.8" />
      <ellipse cx="24" cy="9" rx="5.4" ry="1.3" fill="none" stroke="#94A3AF" strokeWidth="0.9" />
      <circle cx="24" cy="9" r="1.1" fill="#94A3AF" />
    </svg>
  );
}
