"use client";

import { useId } from "react";

/**
 * はちみつの壺（残高ゲージ）。ハニーマーク（HoneyMark）と同じ形で、残高が多いほど中身が満ちる。
 * 満タン = プランの1ヶ月分（capacity。既定はプレミアムの200）。
 * 1ヶ月分を超えると、壺のふちからハニーが溢れて外に垂れる（超えた分が多いほど長く垂れる）。
 * 黒いヘッダーの上に置く前提なので、線とふたははちみつ色で描く。
 */
export default function HoneyJar({
  points,
  capacity = 200,
  className = "h-10 w-8",
}: {
  points: number;
  capacity?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = `honey-jar-${uid}`;
  const cap = Math.max(1, capacity);
  const ratio = points / cap;
  const level = Math.max(0.06, Math.min(1, ratio)); // 0.06 = 空でも底に少し
  const overflow = ratio > 1;
  const spill = overflow ? Math.min(1, ratio - 1) : 0; // 2ヶ月分で最大
  const top = 13;
  const bottom = 41;
  const y = bottom - (bottom - top) * level;
  const drip = 6 + spill * 12;
  const body = "M11 14c-3 3-4 8-4 14v8a6 6 0 0 0 6 6h22a6 6 0 0 0 6-6v-8c0-6-1-11-4-14z";

  return (
    <svg viewBox="0 0 48 48" className={`${className} overflow-visible`} role="img" aria-label={`ハニーP 残高 ${points}${overflow ? "（1ヶ月分を超えています）" : ""}`}>
      <defs>
        <clipPath id={clipId}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* 壺（空は白、中身がはちみつ色で上がる） */}
      <path d={body} fill="#FFFFFF" />
      <rect x="7" y={y} width="34" height={44 - y} fill="#FFC62E" clipPath={`url(#${clipId})`} />
      <path d={body} fill="none" stroke="#FFC62E" strokeWidth="2.4" strokeLinejoin="round" />
      {/* くび・ふた */}
      <rect x="13" y="11.5" width="22" height="5" rx="2.5" fill={ratio >= 1 ? "#FFC62E" : "#FFFFFF"} stroke="#FFC62E" strokeWidth="2.4" />
      <rect x="12" y="5" width="24" height="7" rx="3" fill="#FFC62E" />
      <rect x="14.5" y="7.2" width="19" height="2.6" rx="1.3" fill="#2B1410" opacity="0.35" />
      {/* かお（ハッチと同じ目・ほっぺ） */}
      <circle cx="19.5" cy="27" r="2.2" fill="#2B1410" />
      <circle cx="28.5" cy="27" r="2.2" fill="#2B1410" />
      <circle cx="20.3" cy="26.2" r="0.8" fill="#FFFFFF" />
      <circle cx="29.3" cy="26.2" r="0.8" fill="#FFFFFF" />
      <path d="M21 32c1.5 1.8 4.5 1.8 6 0" stroke="#2B1410" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="15.5" cy="31" r="1.8" fill="#F7A6A0" opacity="0.9" />
      <circle cx="32.5" cy="31" r="1.8" fill="#F7A6A0" opacity="0.9" />
      {overflow && (
        <g className="honey-spill">
          {/* ふちに盛り上がって外へ垂れるハニー */}
          <path d="M6 17c3-6 33-6 36 0c0 1.8-1.2 2.8-2.6 2.8H8.6C7.2 19.8 6 18.8 6 17z" fill="#FFC62E" />
          <path d={`M6.2 18c-1 3-1.2 ${drip * 0.5 + 4} -1.2 ${drip + 7}a2.2 2.2 0 0 0 4.4 0c0-3-1.4-4-1.4-${drip + 7}`} fill="#FFC62E" />
          <path d={`M41.8 18c1 2-0.8 ${drip * 0.3 + 3} 1.2 ${drip * 0.6 + 6}a1.9 1.9 0 0 1-3.8 0c0-2 1.2-3 1.2-${drip * 0.6 + 6}`} fill="#FFC62E" />
          {/* 落ちるしずく */}
          <circle cx="6.8" cy={drip + 33} r="1.9" fill="#FFC62E" className="honey-drop" />
        </g>
      )}
    </svg>
  );
}
