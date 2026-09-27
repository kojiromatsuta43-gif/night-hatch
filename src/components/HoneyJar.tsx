"use client";

import { useId } from "react";

/**
 * ハニーのボトル（残高ゲージ）。NIGHT HATCH では「ボトルキープ」に見立て、
 * キープしたボトルの中身（ハニー）が残高に応じて上下する。首には名札（キープタグ）。
 * 満タン = プランの1ヶ月分（capacity。既定はプレミアムの250）。
 * 1ヶ月分を超えると、ボトルの口からハニーが溢れて外に垂れる（超えた分が多いほど長く垂れる）。
 * 夜色のヘッダーの上に置く前提なので、線はシャンパンゴールドで描く。
 */
export default function HoneyJar({
  points,
  capacity = 250,
  className = "h-10 w-8",
}: {
  points: number;
  capacity?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = `honey-bottle-${uid}`;
  const cap = Math.max(1, capacity);
  const ratio = points / cap;
  const level = Math.max(0.06, Math.min(1, ratio)); // 0.06 = 空でも底に少し
  const overflow = ratio > 1;
  const spill = overflow ? Math.min(1, ratio - 1) : 0; // 2ヶ月分で最大
  const top = 15;
  const bottom = 44;
  const y = bottom - (bottom - top) * level;
  const drip = 5 + spill * 10;
  // ボトル: 細い首 → なで肩 → 胴
  const body = "M20 3.5h8v8.5c0 2.2 1.4 3.4 3.4 4.6c2.6 1.6 3.6 3.6 3.6 6.4V41a3.5 3.5 0 0 1-3.5 3.5h-15A3.5 3.5 0 0 1 13 41V23c0-2.8 1-4.8 3.6-6.4c2-1.2 3.4-2.4 3.4-4.6z";
  const GOLD = "#D4AF6A";

  return (
    <svg viewBox="0 0 48 48" className={`${className} overflow-visible`} role="img" aria-label={`ハニーP 残高 ${points}${overflow ? "（1ヶ月分を超えています）" : ""}`}>
      <defs>
        <clipPath id={clipId}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* ボトル（空はガラスの暗い色、中身がはちみつ色で上がる） */}
      <path d={body} fill="#2A2236" />
      <rect x="12" y={y} width="24" height={48 - y} fill="#FFC62E" clipPath={`url(#${clipId})`} />
      {/* ラベル */}
      <rect x="16" y="27" width="16" height="9" rx="1.2" fill="#1A1524" stroke={GOLD} strokeWidth="0.9" opacity="0.92" />
      <text x="24" y="33.6" textAnchor="middle" fontSize="4.4" fontWeight="700" fill={GOLD} fontFamily="Georgia, serif">HONEY</text>
      <path d={body} fill="none" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
      {/* ガラスの光 */}
      <path d="M16.5 23c0-1.8 0.6-3 1.8-3.9" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55" />
      {/* 口 */}
      <rect x="19" y="1.5" width="10" height="3.4" rx="1.2" fill={ratio >= 1 ? "#FFC62E" : GOLD} />
      {/* キープタグ（首にかかった名札） */}
      <path d="M28 9.5l7.5 3.2" stroke={GOLD} strokeWidth="1" />
      <path d="M34.5 11l8 3.4-2.2 5.2-8-3.4z" fill="#F3EDE2" stroke={GOLD} strokeWidth="1" strokeLinejoin="round" />
      <circle cx="35.4" cy="12.8" r="0.8" fill={GOLD} />
      {overflow && (
        <g className="honey-spill">
          {/* 口から溢れて外へ垂れるハニー */}
          <path d="M18 3c2-3 10-3 12 0c0 1.2-0.8 2-1.8 2h-8.4c-1 0-1.8-0.8-1.8-2z" fill="#FFC62E" />
          <path d={`M18.6 3.6c-1.2 2-1.6 ${drip * 0.5 + 3} -1.6 ${drip + 6}a2 2 0 0 0 4 0c0-3-1.2-4-1.2-${drip + 6}`} fill="#FFC62E" />
          {/* 落ちるしずく */}
          <circle cx="19" cy={drip + 15} r="1.8" fill="#FFC62E" className="honey-drop" />
        </g>
      )}
    </svg>
  );
}
