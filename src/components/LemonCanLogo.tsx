"use client";

import { useId } from "react";

/**
 * ポイントのしるし（たぬモード）: 無糖レモンサワーの缶。
 * 実在ブランドのロゴ・商品名は使っていない一般的な缶の絵です。
 * 小さく表示しても潰れないよう、白地・太いレモン・細めの輪郭にしています。
 */
export default function LemonCanLogo({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const clip = `can-${uid}`;
  const grad = `cansil-${uid}`;

  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="無糖レモンの缶">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#D9E2E8" />
          <stop offset="22%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F2F6F9" />
          <stop offset="100%" stopColor="#C4D0D9" />
        </linearGradient>
        <clipPath id={clip}>
          <rect x="13" y="8" width="22" height="34" rx="5" />
        </clipPath>
      </defs>

      <rect x="13" y="8" width="22" height="34" rx="5" fill={`url(#${grad})`} />

      <g clipPath={`url(#${clip})`}>
        {/* 下半分の青い波 */}
        <path d="M6 31C12 27 18 34 24 31.5C30 29 36 33 42 29V44H6Z" fill="#1663C7" />
        <path d="M6 29.4C12 25.4 18 32.4 24 29.9C30 27.4 36 31.4 42 27.4V30C36 34 30 30 24 32.5C18 35 12 28 6 32Z" fill="#69B8F0" />
        {/* 氷のかけら */}
        <path d="M16.5 12l1.5 2-1.5 2-1.5-2z" fill="#BFE3FA" />
        <path d="M31.5 15.5l1.2 1.6-1.2 1.6-1.2-1.6z" fill="#BFE3FA" />
        {/* レモンの輪切り（大きめ） */}
        <g transform="translate(24 21.5)">
          <circle r="9" fill="#F6C915" />
          <circle r="7.4" fill="#FFF6BC" />
          <g stroke="#F0BC10" strokeWidth="1.5" strokeLinecap="round">
            <path d="M0 0v-6.8M0 0v6.8M0 0h-6.8M0 0h6.8M0 0l4.8-4.8M0 0l-4.8 4.8M0 0l4.8 4.8M0 0l-4.8-4.8" />
          </g>
          <circle r="1.5" fill="#F6C915" />
        </g>
      </g>

      <rect x="13" y="8" width="22" height="34" rx="5" fill="none" stroke="#4A5A66" strokeWidth="1.6" />

      {/* ふた */}
      <ellipse cx="24" cy="8.6" rx="10.6" ry="2.7" fill="#E3E9ED" stroke="#4A5A66" strokeWidth="1.6" />
      <ellipse cx="24" cy="8.2" rx="5.6" ry="1.3" fill="none" stroke="#A9B6C0" strokeWidth="1" />
    </svg>
  );
}
