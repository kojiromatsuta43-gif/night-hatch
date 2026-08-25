"use client";

import { useId } from "react";

/** はちみつのしずく */
export function HoneyDrop({ className = "h-4 w-4" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const grad = `honey-drop-${uid}`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFDE7A" />
          <stop offset="55%" stopColor="#FFC62E" />
          <stop offset="100%" stopColor="#EF9E00" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.8c0 0 7.2 8.4 7.2 13A7.2 7.2 0 0 1 4.8 14.8c0-4.6 7.2-13 7.2-13z"
        fill={`url(#${grad})`}
        stroke="#1C1710"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <ellipse cx="9.3" cy="14" rx="1.5" ry="2.4" fill="#FFF6D6" opacity="0.9" transform="rotate(-18 9.3 14)" />
    </svg>
  );
}

/**
 * はちみつPの表示。数字のあとに小さめの「P」を添え、先頭にしずくを置く。
 * 例: 🍯 120P
 */
export default function HoneyPoints({
  value,
  className = "",
  drop = true,
}: {
  value: number | string;
  className?: string;
  drop?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-[0.22em] whitespace-nowrap ${className}`}>
      {drop && <HoneyDrop className="h-[0.95em] w-[0.95em]" />}
      <span className="tabular-nums">{value}</span>
      <span className="text-[0.68em] font-bold tracking-tight">P</span>
    </span>
  );
}
