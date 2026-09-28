"use client";

import { useId } from "react";

/**
 * ドレスのハッチ（2026-09-28 作り直し・清楚きれい系）。茶髪のロングに センター分けの前髪、
 * 淡いピンクのAラインドレス、パールの髪飾りとネックレス。体の輪郭線はドレスに重ねない。
 * 黒服のハッチ（BeeLogo.tsx）の相方。2人は並べず、画面ごとに出る場所を分けている
 * （ドレス: ログイン・メニュー／黒服: ロゴ・ホーム・ハッチに相談）。
 */
export default function BeeGirl({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const grad = `dg-${uid}`;
  const hair = `hg-${uid}`;
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="ドレスのハッチ">

  <defs>
    <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#FBE3EA"/><stop offset="1" stopColor="#EDB9C9"/>
    </linearGradient>
    <linearGradient id={hair} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#9A6240"/><stop offset="1" stopColor="#7A4A30"/>
    </linearGradient>
  </defs>
  {/* halo */}
  <g fill="#F6EFE2" stroke="#F6EFE2" strokeLinejoin="round" strokeWidth="4">
    <ellipse cx="11" cy="31" rx="9.5" ry="6" transform="rotate(-20 11 31)"/>
    <ellipse cx="53" cy="31" rx="9.5" ry="6" transform="rotate(20 53 31)"/>
    <path d="M32 11 C20 11 15.5 19 15.5 28 C15.5 36 14 44 15 50 L20 50 L16 61 H48 L44 50 L49 50 C50 44 48.5 36 48.5 28 C48.5 19 44 11 32 11 Z"/>
    <path d="M27 14 C25 8.5 22 6 18.5 5.8" fill="none"/><path d="M37 14 C39 8.5 42 6 45.5 5.8" fill="none"/>
    <circle cx="18" cy="5.8" r="3"/><circle cx="46" cy="5.8" r="3"/>
  </g>
  {/* antennae */}
  <path d="M27 14 C25 8.5 22 6 18.5 5.8" stroke="#2A1D24" strokeWidth="2" fill="none" strokeLinecap="round"/>
  <path d="M37 14 C39 8.5 42 6 45.5 5.8" stroke="#2A1D24" strokeWidth="2" fill="none" strokeLinecap="round"/>
  <circle cx="18" cy="5.8" r="2.5" fill="#FFD24A" stroke="#2A1D24" strokeWidth="1.4"/>
  <circle cx="46" cy="5.8" r="2.5" fill="#FFD24A" stroke="#2A1D24" strokeWidth="1.4"/>
  {/* wings */}
  <ellipse cx="11" cy="31" rx="9.5" ry="6" fill="#FFF3F7" stroke="#2A1D24" strokeWidth="1.6" transform="rotate(-20 11 31)"/>
  <ellipse cx="53" cy="31" rx="9.5" ry="6" fill="#FFF3F7" stroke="#2A1D24" strokeWidth="1.6" transform="rotate(20 53 31)"/>
  {/* back hair: long, straight with soft inward ends */}
  <path d="M32 11 C20 11 15.5 19 15.5 28 C15.5 36 14 44 15.5 50 C18 51.5 21 50.5 22 48 L22 36 L42 36 L42 48 C43 50.5 46 51.5 48.5 50 C50 44 48.5 36 48.5 28 C48.5 19 44 11 32 11 Z" fill={`url(#${hair})`} stroke="#2A1D24" strokeWidth="1.6" strokeLinejoin="round"/>
  {/* dress (A-line, no body outline across it) */}
  <path d="M23 39.5 C26 41.5 29 42 32 42 C35 42 38 41.5 41 39.5 L43 46 L47.5 60.5 C42 61.8 37 62 32 62 C27 62 22 61.8 16.5 60.5 L21 46 Z" fill={`url(#${grad})`} stroke="#2A1D24" strokeWidth="1.6" strokeLinejoin="round"/>
  {/* dress details */}
  <path d="M21.6 46.5 C26 48 38 48 42.4 46.5" stroke="#FFFFFF" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.9"/>
  <path d="M29 49 C28 53 27 57 25.5 60.8 M35 49 C36 53 37 57 38.5 60.8" stroke="#E29AB0" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
  {/* small bow at waist */}
  <path d="M32 47.2 L28.8 45.4 L28.8 49 Z M32 47.2 L35.2 45.4 L35.2 49 Z" fill="#FFFFFF" stroke="#2A1D24" strokeWidth="0.8" strokeLinejoin="round"/>
  <circle cx="32" cy="47.2" r="0.9" fill="#E29AB0"/>
  {/* face */}
  <path d="M32 14.5 C24 14.5 19.5 20 19.5 27.5 C19.5 35 25 40 32 40 C39 40 44.5 35 44.5 27.5 C44.5 20 40 14.5 32 14.5 Z" fill="#FFD95E" stroke="#2A1D24" strokeWidth="1.8"/>
  {/* pearl necklace */}
  <path d="M26.5 41.2 C29.5 43 34.5 43 37.5 41.2" stroke="#FFFFFF" strokeWidth="1.3" strokeDasharray="0.1 1.8" strokeLinecap="round" fill="none"/>
  {/* front bangs: soft center-part curtain bangs */}
  <path d="M32 14 C25.5 14 20.4 18.2 19.5 26.5 C21.8 22.6 25.6 20.3 29.6 19.8 C30.9 18.3 31.7 16.3 32 14 Z" fill={`url(#${hair})`} stroke="#2A1D24" strokeWidth="1.4" strokeLinejoin="round"/>
  <path d="M32 14 C38.5 14 43.6 18.2 44.5 26.5 C42.2 22.6 38.4 20.3 34.4 19.8 C33.1 18.3 32.3 16.3 32 14 Z" fill={`url(#${hair})`} stroke="#2A1D24" strokeWidth="1.4" strokeLinejoin="round"/>
  <path d="M23.5 18.6 C25.5 16.8 28 16 30 16" stroke="#C99270" strokeWidth="1" fill="none" strokeLinecap="round"/>
  <path d="M40.5 18.6 C38.5 16.8 36 16 34 16" stroke="#C99270" strokeWidth="1" fill="none" strokeLinecap="round"/>
  {/* side locks framing face */}
  <path d="M19.6 26 C18.8 31 19.5 36 21.5 39.5" stroke="#2A1D24" strokeWidth="1.4" fill={`url(#${hair})`} strokeLinejoin="round"/>
  <path d="M44.4 26 C45.2 31 44.5 36 42.5 39.5" stroke="#2A1D24" strokeWidth="1.4" fill={`url(#${hair})`} strokeLinejoin="round"/>
  {/* pearl hair clip */}
  <g fill="#FFFFFF" stroke="#2A1D24" strokeWidth="0.8">
    <circle cx="39.6" cy="19.2" r="1.3"/><circle cx="41.6" cy="20.6" r="1.1"/><circle cx="37.8" cy="18.2" r="1"/>
  </g>
  {/* eyes: big, gentle */}
  <ellipse cx="26.6" cy="29.2" rx="2.7" ry="3.2" fill="#3A2530"/>
  <ellipse cx="37.4" cy="29.2" rx="2.7" ry="3.2" fill="#3A2530"/>
  <ellipse cx="26.6" cy="30.4" rx="1.8" ry="1.5" fill="#7A4A5A"/>
  <ellipse cx="37.4" cy="30.4" rx="1.8" ry="1.5" fill="#7A4A5A"/>
  <circle cx="27.6" cy="27.9" r="1.15" fill="#FFFFFF"/><circle cx="38.4" cy="27.9" r="1.15" fill="#FFFFFF"/>
  <circle cx="25.7" cy="31" r="0.45" fill="#FFFFFF"/><circle cx="36.5" cy="31" r="0.45" fill="#FFFFFF"/>
  {/* upper lash line + one soft flick */}
  <path d="M23.6 27.6 C24.8 25.6 28.4 25.4 29.6 27.2" stroke="#2A1D24" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
  <path d="M40.4 27.6 C39.2 25.6 35.6 25.4 34.4 27.2" stroke="#2A1D24" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
  <path d="M23.7 27.5 L22.6 26.8 M40.3 27.5 L41.4 26.8" stroke="#2A1D24" strokeWidth="1" strokeLinecap="round"/>
  {/* soft brows */}
  <path d="M24.6 23.9 C25.8 23.3 27.2 23.3 28.3 23.7" stroke="#8A5A40" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
  <path d="M39.4 23.9 C38.2 23.3 36.8 23.3 35.7 23.7" stroke="#8A5A40" strokeWidth="0.9" fill="none" strokeLinecap="round"/>
  {/* smile, cheeks */}
  <path d="M30.4 34.6 C31.3 35.5 32.7 35.5 33.6 34.6" stroke="#C0506E" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
  <ellipse cx="23.4" cy="33.2" rx="2.2" ry="1.4" fill="#F7A3B8" opacity="0.75"/>
  <ellipse cx="40.6" cy="33.2" rx="2.2" ry="1.4" fill="#F7A3B8" opacity="0.75"/>

    </svg>
  );
}
