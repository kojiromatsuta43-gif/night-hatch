"use client";

import { useId } from "react";

/**
 * NIGHT HATCH のマスコット「ハッチ」— 黒服（ボーイ）仕様（2026-09-28 作り直し）。
 * はちみつ色の顔、オールバック、黒のスーツに白シャツと蝶ネクタイ、耳にインカム。
 * 暗い地で沈まないよう、全体に生成りの縁（ハロー）を敷いている。
 * 相方はドレスのハッチ（BeeGirl.tsx）。2人は並べず、画面ごとに出る場所を分ける。
 */
export default function BeeLogo({ className = "h-8 w-8" }: { className?: string }) {
  const clip = `kb-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="黒服のハッチ">

  {/* 黒服ハッチ */}
  <defs>
    <clipPath id={clip}><rect x="17" y="14" width="30" height="44" rx="15"/></clipPath>
  </defs>
  {/* halo (light backing for dark bg) */}
  <g fill="#F6EFE2" stroke="#F6EFE2" strokeLinejoin="round" strokeWidth="4">
    <ellipse cx="12" cy="30" rx="10" ry="6.5" transform="rotate(-20 12 30)"/>
    <ellipse cx="52" cy="30" rx="10" ry="6.5" transform="rotate(20 52 30)"/>
    <rect x="17" y="14" width="30" height="44" rx="15"/>
    <path d="M26 16 C24 9 21 6 17 5.5" fill="none"/>
    <path d="M38 16 C40 9 43 6 47 5.5" fill="none"/>
    <circle cx="16.5" cy="5.5" r="3.2"/><circle cx="47.5" cy="5.5" r="3.2"/>
  </g>
  {/* antennae */}
  <path d="M26 16 C24 9 21 6 17 5.5" stroke="#1C1522" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
  <path d="M38 16 C40 9 43 6 47 5.5" stroke="#1C1522" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
  <circle cx="16.5" cy="5.5" r="2.8" fill="#FFC62E" stroke="#1C1522" strokeWidth="1.6"/>
  <circle cx="47.5" cy="5.5" r="2.8" fill="#FFC62E" stroke="#1C1522" strokeWidth="1.6"/>
  {/* wings */}
  <ellipse cx="12" cy="30" rx="10" ry="6.5" fill="#E9F1FF" stroke="#1C1522" strokeWidth="1.8" transform="rotate(-20 12 30)"/>
  <ellipse cx="52" cy="30" rx="10" ry="6.5" fill="#E9F1FF" stroke="#1C1522" strokeWidth="1.8" transform="rotate(20 52 30)"/>
  {/* body */}
  <g clipPath={`url(#${clip})`}>
    <rect x="17" y="14" width="30" height="44" fill="#FFD24A"/>
    {/* slicked hair */}
    <path d="M15 12 H49 V23 C47 19.5 44 18 40 18.2 C36 18.4 33 20.5 28.5 20.8 C24 21 20 20 15 21.5 Z" fill="#1C1522"/>
    <path d="M24 17.2 C29 15 35 14.8 40 16" stroke="#6B6480" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    {/* suit */}
    <path d="M15 40 H49 V60 H15 Z" fill="#17131D"/>
    {/* shirt V */}
    <path d="M26 40 L32 52 L38 40 Z" fill="#FFFFFF"/>
    {/* lapels */}
    <path d="M26 40 L32 52 L27.5 54 L22.5 41.5 Z" fill="#2B2433"/>
    <path d="M38 40 L32 52 L36.5 54 L41.5 41.5 Z" fill="#2B2433"/>
    {/* bow tie */}
    <path d="M32 42.5 L27 39.8 L27 45.2 Z M32 42.5 L37 39.8 L37 45.2 Z" fill="#17131D" stroke="#17131D" strokeWidth="1" strokeLinejoin="round"/>
    <circle cx="32" cy="42.5" r="1.5" fill="#17131D"/>
    {/* buttons */}
    <circle cx="32" cy="56" r="0.9" fill="#D4AF6A"/>
    {/* pocket square */}
    <path d="M40.5 47 l3 -1.4 l0.4 2.2 z" fill="#D4AF6A"/>
  </g>
  <rect x="17" y="14" width="30" height="44" rx="15" fill="none" stroke="#1C1522" strokeWidth="2.4"/>
  {/* face */}
  <circle cx="26.5" cy="29" r="3" fill="#1C1522"/>
  <circle cx="37.5" cy="29" r="3" fill="#1C1522"/>
  <circle cx="27.6" cy="27.9" r="1.1" fill="#FFFFFF"/>
  <circle cx="38.6" cy="27.9" r="1.1" fill="#FFFFFF"/>
  {/* eyebrows (cool) */}
  <path d="M23.8 24.6 C25.5 23.4 27.5 23.3 29 24" stroke="#1C1522" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  <path d="M40.2 24.6 C38.5 23.4 36.5 23.3 35 24" stroke="#1C1522" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  <path d="M29 34 C30.8 36 33.2 36 35 34" stroke="#1C1522" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
  <circle cx="22.6" cy="33" r="2.1" fill="#F49A96" opacity="0.8"/>
  <circle cx="41.4" cy="33" r="2.1" fill="#F49A96" opacity="0.8"/>
  {/* earpiece (インカム) */}
  <path d="M46.6 29.5 C49.5 31 49.8 35 48 38.5" stroke="#1C1522" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
  <circle cx="46.8" cy="29.2" r="1.6" fill="#17131D" stroke="#F6EFE2" strokeWidth="0.6"/>

    </svg>
  );
}
