"use client";

/** キャラクター切替用のたぬき。おすわりポーズの丸っこい姿。 */
export default function TanukiLogo({ className = "h-8 w-8" }: { className?: string }) {
  const TAN = "#C6853F";
  const MASK = "#8B5A2E";
  const LINE = "#3B2314";
  const CREAM = "#F8E5A0";
  const BLUSH = "#F9C3AC";

  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="たぬきのマーク">
      {/* しっぽ */}
      <path
        d="M32 37C40 38.5 45.5 33.5 44.2 28.2C43.4 24.6 39.6 23.8 38.2 26.6"
        fill="none"
        stroke={LINE}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M32 37C40 38.5 45.5 33.5 44.2 28.2C43.4 24.6 39.6 23.8 38.2 26.6"
        fill="none"
        stroke={TAN}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M42.6 24.6C40.4 22.8 38.9 24.2 38.2 26.6" fill="none" stroke={MASK} strokeWidth="6" strokeLinecap="round" />

      {/* あし */}
      <ellipse cx="16.5" cy="42.2" rx="5" ry="3.9" fill={TAN} stroke={LINE} strokeWidth="1.8" />
      <ellipse cx="31.5" cy="42.2" rx="5" ry="3.9" fill={TAN} stroke={LINE} strokeWidth="1.8" />

      {/* からだ */}
      <ellipse cx="24" cy="36.5" rx="11.5" ry="9.2" fill={TAN} stroke={LINE} strokeWidth="1.9" />
      <rect x="21.2" y="32" width="5.6" height="11" rx="2.8" fill={CREAM} />

      {/* うで */}
      <ellipse cx="11.8" cy="35.8" rx="4.3" ry="5.2" transform="rotate(-18 11.8 35.8)" fill={TAN} stroke={LINE} strokeWidth="1.8" />
      <ellipse cx="36.2" cy="35.8" rx="4.3" ry="5.2" transform="rotate(18 36.2 35.8)" fill={TAN} stroke={LINE} strokeWidth="1.8" />

      {/* みみ */}
      <circle cx="11.8" cy="9.6" r="6.2" fill={TAN} stroke={LINE} strokeWidth="1.9" />
      <circle cx="36.2" cy="9.6" r="6.2" fill={TAN} stroke={LINE} strokeWidth="1.9" />
      <circle cx="11.8" cy="9.6" r="3.4" fill={CREAM} />
      <circle cx="36.2" cy="9.6" r="3.4" fill={CREAM} />

      {/* あたま */}
      <ellipse cx="24" cy="19.2" rx="15.2" ry="13" fill={TAN} stroke={LINE} strokeWidth="1.9" />

      {/* 目のまわりの模様 */}
      <path
        d="M24 7.6C33.6 7.6 39.3 12 38.8 17.6C38.4 21.6 35.2 23.6 31.8 22.1C29.4 21 26.9 20.6 24 20.6C21.1 20.6 18.6 21 16.2 22.1C12.8 23.6 9.6 21.6 9.2 17.6C8.7 12 14.4 7.6 24 7.6Z"
        fill={MASK}
      />

      {/* め */}
      <ellipse cx="17.6" cy="16.6" rx="2.6" ry="3" fill={LINE} />
      <ellipse cx="30.4" cy="16.6" rx="2.6" ry="3" fill={LINE} />

      {/* ほっぺ */}
      <circle cx="11.4" cy="22.4" r="3.1" fill={BLUSH} />
      <circle cx="36.6" cy="22.4" r="3.1" fill={BLUSH} />

      {/* はな・くち */}
      <ellipse cx="24" cy="24.2" rx="8.3" ry="6.3" fill="#FFFFFF" stroke={LINE} strokeWidth="1.7" />
      <ellipse cx="24" cy="21.6" rx="2" ry="1.6" fill={LINE} />
      <path
        d="M24 23.2v1.1M24 24.3c-1 1.4-2.9 1.2-3.5-.1M24 24.3c1 1.4 2.9 1.2 3.5-.1"
        fill="none"
        stroke={LINE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
