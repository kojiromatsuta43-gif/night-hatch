"use client";

/**
 * ハニーP のしるし。ハッチの顔が付いたはちみつの壺（オリジナル。絵文字🍯の代わり）。
 * BeeLogo と同じ線（#2B1410 / 2.2）・同じ黄色（#FFC62E）で描いてある。
 * 文中に混ぜるときは PointInline（MascotProvider）を使う。
 */
export default function HoneyMark({ className = "h-6 w-6", title = "ハニーP" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title}>
      {/* ふた */}
      <rect x="12" y="6" width="24" height="7" rx="3" fill="#2B1410" />
      {/* 壺 */}
      <path d="M11 14c-3 3-4 8-4 14v8a6 6 0 0 0 6 6h22a6 6 0 0 0 6-6v-8c0-6-1-11-4-14z" fill="#FFC62E" stroke="#2B1410" strokeWidth="2.2" strokeLinejoin="round" />
      {/* くび */}
      <rect x="13" y="11.5" width="22" height="5" rx="2.5" fill="#FFC62E" stroke="#2B1410" strokeWidth="2.2" />
      {/* かお（ハッチと同じ目・ほっぺ） */}
      <circle cx="19.5" cy="27" r="2.2" fill="#2B1410" />
      <circle cx="28.5" cy="27" r="2.2" fill="#2B1410" />
      <circle cx="20.3" cy="26.2" r="0.8" fill="#FFFFFF" />
      <circle cx="29.3" cy="26.2" r="0.8" fill="#FFFFFF" />
      <path d="M21 32c1.5 1.8 4.5 1.8 6 0" stroke="#2B1410" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="15.5" cy="31" r="1.8" fill="#F7A6A0" opacity="0.9" />
      <circle cx="32.5" cy="31" r="1.8" fill="#F7A6A0" opacity="0.9" />
      {/* ハイライト */}
      <path d="M10.5 24c0.4-3 1.2-5 2.6-7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
