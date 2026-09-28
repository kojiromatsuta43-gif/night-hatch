"use client";

import { useId } from "react";

/**
 * ドレスのハッチ（2026-09-28 作り直し）。ゆるく巻いたロングヘア、ワインのAラインドレス、
 * 金の星の髪飾りとネックレス。黒服のハッチ（BeeLogo.tsx）の相方。
 */
export default function BeeGirl({ className = "h-8 w-8" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const clip = `db-${uid}`;
  const grad = `dg-${uid}`;
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="ドレスのハッチ">

  <defs>
    <clipPath id={clip}><rect x="17" y="14" width="30" height="40" rx="15"/></clipPath>
    <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#D84A7E"/><stop offset="1" stopColor="#9A2753"/>
    </linearGradient>
  </defs>
  {/* halo */}
  <g fill="#F6EFE2" stroke="#F6EFE2" strokeLinejoin="round" strokeWidth="4">
    <ellipse cx="11.5" cy="29" rx="10" ry="6.5" transform="rotate(-20 11.5 29)"/>
    <ellipse cx="52.5" cy="29" rx="10" ry="6.5" transform="rotate(20 52.5 29)"/>
    <path d="M32 11 C20 11 14 19 14 29 C14 36 12 41 13.5 45 C16 47 18 46 19 44 L45 44 C46 46 48 47 50.5 45 C52 41 50 36 50 29 C50 19 44 11 32 11 Z"/>
    <path d="M20 40 H44 L50 61 H14 Z"/>
    <path d="M26 15 C24 9 21 6 17 5.5" fill="none"/><path d="M38 15 C40 9 43 6 47 5.5" fill="none"/>
    <circle cx="16.5" cy="5.5" r="3.2"/><circle cx="47.5" cy="5.5" r="3.2"/>
  </g>
  {/* antennae */}
  <path d="M26 15 C24 9 21 6 17 5.5" stroke="#1C1522" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
  <path d="M38 15 C40 9 43 6 47 5.5" stroke="#1C1522" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
  <circle cx="16.5" cy="5.5" r="2.8" fill="#FFC62E" stroke="#1C1522" strokeWidth="1.6"/>
  <circle cx="47.5" cy="5.5" r="2.8" fill="#FFC62E" stroke="#1C1522" strokeWidth="1.6"/>
  {/* wings */}
  <ellipse cx="11.5" cy="29" rx="10" ry="6.5" fill="#FDEAF3" stroke="#1C1522" strokeWidth="1.8" transform="rotate(-20 11.5 29)"/>
  <ellipse cx="52.5" cy="29" rx="10" ry="6.5" fill="#FDEAF3" stroke="#1C1522" strokeWidth="1.8" transform="rotate(20 52.5 29)"/>
  {/* long wavy hair (behind) */}
  <path d="M32 11 C20 11 14 19 14 29 C14 36 12 41 13.5 45 C16 47 18 46 19 44 C17 41 18 38 19.5 36 L44.5 36 C46 38 47 41 45 44 C46 46 48 47 50.5 45 C52 41 50 36 50 29 C50 19 44 11 32 11 Z" fill="#7A4130" stroke="#1C1522" strokeWidth="1.8" strokeLinejoin="round"/>
  {/* hair waves */}
  <path d="M17 31 C15.5 34 17.5 36.5 15.8 39.5 C14.8 41.5 15.8 43.5 17.5 44" stroke="#B0715A" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
  <path d="M47 31 C48.5 34 46.5 36.5 48.2 39.5 C49.2 41.5 48.2 43.5 46.5 44" stroke="#B0715A" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
  <path d="M13.8 44.6 C12.6 46.6 13.6 48.4 15.6 48 C17 47.6 17.2 46 16 45.5" fill="#7A4130" stroke="#1C1522" strokeWidth="1.4" strokeLinejoin="round"/>
  <path d="M50.2 44.6 C51.4 46.6 50.4 48.4 48.4 48 C47 47.6 46.8 46 48 45.5" fill="#7A4130" stroke="#1C1522" strokeWidth="1.4" strokeLinejoin="round"/>
  {/* dress skirt (A-line, flares past body) */}
  <path d="M20 42 C25 40.5 28 43 32 41.5 C36 43 39 40.5 44 42 L49.5 60 C44 61.5 38 61 32 61.5 C26 61 20 61.5 14.5 60 Z" fill={`url(#${grad})`} stroke="#1C1522" strokeWidth="1.8" strokeLinejoin="round"/>
  {/* face / upper body */}
  <g clipPath={`url(#${clip})`}>
    <rect x="17" y="14" width="30" height="40" fill="#FFD24A"/>
    {/* side-swept bangs */}
    <path d="M15 12 H49 V26 C46.5 22 44.5 19 43.5 17.5 C40 21 34 22.5 29 20.5 C26 22.5 22 24 18.5 23.5 C17.5 25 16 26 15 27 Z" fill="#7A4130"/>
    <path d="M22.5 18.2 C27 15.6 33 15.2 38 16.6" stroke="#B0715A" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    {/* bodice */}
    <path d="M15 41.5 C22 39 27 42.5 32 40.5 C37 42.5 42 39 49 41.5 V56 H15 Z" fill={`url(#${grad})`}/>
    <path d="M24.5 38.4 C28.5 40.4 35.5 40.4 39.5 38.4" stroke="#E7C57A" strokeWidth="1" fill="none"/>
    <circle cx="32" cy="40" r="1.3" fill="#EEF7FF" stroke="#D4AF6A" strokeWidth="0.7"/>
  </g>
  <rect x="17" y="14" width="30" height="40" rx="15" fill="none" stroke="#1C1522" strokeWidth="2.4"/>
  {/* waist ribbon */}
  <path d="M19.5 50 C26 51.5 38 51.5 44.5 50" stroke="#E7C57A" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
  {/* sparkles */}
  <g fill="#FBE3A4"><circle cx="23" cy="56" r="0.9"/><circle cx="30" cy="58.5" r="0.7"/><circle cx="37" cy="55.5" r="0.9"/><circle cx="43" cy="58" r="0.7"/><circle cx="27" cy="47" r="0.6"/><circle cx="38" cy="46" r="0.6"/></g>
  {/* hair accessory */}
  <g transform="translate(40.5 16.5)">
    <path d="M0 -3.2 L0.9 -0.9 L3.2 0 L0.9 0.9 L0 3.2 L-0.9 0.9 L-3.2 0 L-0.9 -0.9 Z" fill="#F6D98E" stroke="#1C1522" strokeWidth="0.9" strokeLinejoin="round"/>
  </g>
  {/* face */}
  <ellipse cx="26.5" cy="30" rx="2.8" ry="3.3" fill="#1C1522"/>
  <ellipse cx="37.5" cy="30" rx="2.8" ry="3.3" fill="#1C1522"/>
  <circle cx="27.5" cy="28.7" r="1.2" fill="#FFFFFF"/><circle cx="38.5" cy="28.7" r="1.2" fill="#FFFFFF"/>
  <circle cx="25.7" cy="31.4" r="0.5" fill="#FFFFFF"/><circle cx="36.7" cy="31.4" r="0.5" fill="#FFFFFF"/>
  <path d="M23.7 28.1 L22 27 M24.2 26.8 L22.9 25.3" stroke="#1C1522" strokeWidth="1.2" strokeLinecap="round"/>
  <path d="M40.3 28.1 L42 27 M39.8 26.8 L41.1 25.3" stroke="#1C1522" strokeWidth="1.2" strokeLinecap="round"/>
  <path d="M29.8 35 C31 36.1 33 36.1 34.2 35" stroke="#B23A62" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
  <circle cx="22.6" cy="34" r="2.2" fill="#F48FAE" opacity="0.85"/>
  <circle cx="41.4" cy="34" r="2.2" fill="#F48FAE" opacity="0.85"/>

    </svg>
  );
}
