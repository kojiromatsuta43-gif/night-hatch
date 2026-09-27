"use client";

/**
 * ハニーP のしるし。ハッチの顔が付いたはちみつの壺（BRIDGE / FOOD と共通のキャラクター。絵文字🍯の代わり）。
 * NIGHT HATCH は暗い地なので、ふたをシャンパンゴールドにし、線は焦げ茶のまま壺の外側に明るい縁を敷いている。
 * 文中に混ぜるときは PointInline（MascotProvider）を使う。
 */
export default function HoneyMark({ className = "h-6 w-6", title = "ハニーP" }: { className?: string; title?: string }) {
  const body = "M11 14c-3 3-4 8-4 14v8a6 6 0 0 0 6 6h22a6 6 0 0 0 6-6v-8c0-6-1-11-4-14z";
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title}>
      {/* 暗い地で輪郭が沈まないための薄い縁 */}
      <path d={body} fill="none" stroke="#FFE7A3" strokeWidth="4.4" strokeLinejoin="round" opacity="0.35" />
      {/* ふた */}
      <rect x="12" y="5.5" width="24" height="7.5" rx="3" fill="#D4AF6A" stroke="#2A1D0C" strokeWidth="1.6" />
      <rect x="14.5" y="8" width="19" height="2" rx="1" fill="#F6EBD4" opacity="0.6" />
      {/* 壺 */}
      <path d={body} fill="#FFC62E" stroke="#2A1D0C" strokeWidth="2.2" strokeLinejoin="round" />
      {/* くび */}
      <rect x="13" y="11.5" width="22" height="5" rx="2.5" fill="#FFC62E" stroke="#2A1D0C" strokeWidth="2.2" />
      {/* かお（ハッチと同じ目・ほっぺ） */}
      <circle cx="19.5" cy="27" r="2.2" fill="#2A1D0C" />
      <circle cx="28.5" cy="27" r="2.2" fill="#2A1D0C" />
      <circle cx="20.3" cy="26.2" r="0.8" fill="#FFFFFF" />
      <circle cx="29.3" cy="26.2" r="0.8" fill="#FFFFFF" />
      <path d="M21 32c1.5 1.8 4.5 1.8 6 0" stroke="#2A1D0C" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="15.5" cy="31" r="1.8" fill="#F7A6A0" opacity="0.9" />
      <circle cx="32.5" cy="31" r="1.8" fill="#F7A6A0" opacity="0.9" />
      {/* ハイライト */}
      <path d="M10.5 24c0.4-3 1.2-5 2.6-7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
