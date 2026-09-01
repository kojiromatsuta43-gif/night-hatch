"use client";

/**
 * はちみつの瓶。残高が多いほど中身が満ちる。
 * 満タン = プランの1ヶ月分（capacity。既定はプレミアムの200）。
 * 追加購入や繰越で1ヶ月分を超えると、瓶のふちからハニーが溢れて垂れる。
 */
export default function HoneyJar({
  points,
  capacity = 200,
  className = "h-9 w-8",
}: {
  points: number;
  capacity?: number;
  className?: string;
}) {
  const cap = Math.max(1, capacity);
  const ratio = points / cap;
  const level = Math.max(0.08, Math.min(1, ratio)); // 0.08 = 空でも底に少し
  const overflow = ratio > 1;
  // 溢れ具合: 1ヶ月分を超えた割合で垂れる量を変える（最大で2ヶ月分）
  const spill = overflow ? Math.min(1, (ratio - 1) / 1) : 0;
  const top = 12; // 瓶の中の上端
  const bottom = 42; // 瓶の中の下端
  const y = bottom - (bottom - top) * level;
  const dripLen = 6 + spill * 14; // 垂れる長さ
  return (
    <svg viewBox="0 0 40 48" className={`${className} overflow-visible`} role="img" aria-label={`ハニーP 残高 ${points}${overflow ? "（1ヶ月分を超えています）" : ""}`}>
      <rect x="11" y="3" width="18" height="6" rx="2" fill="#FFC62E" />
      <path d="M8 12h24v26a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V12z" fill="#FFFFFF" stroke="#FFC62E" strokeWidth="2.5" />
      <clipPath id="jar-inner">
        <path d="M9.5 13.5h21V38a4.5 4.5 0 0 1-4.5 4.5H14A4.5 4.5 0 0 1 9.5 38V13.5z" />
      </clipPath>
      <rect x="9" y={y} width="22" height={44 - y} fill="#FFC62E" clipPath="url(#jar-inner)" />
      {overflow && (
        <g className="honey-spill">
          {/* ふちに盛り上がって外へ垂れるハニー */}
          <path d="M4 14c2-6 30-6 32 0c0 1.5-1 2-2 2H6c-1 0-2-0.5-2-2z" fill="#FFC62E" />
          <rect x="3.5" y="13" width="4" height={dripLen + 8} rx="2" fill="#FFC62E" />
          <rect x="32.5" y="13" width="4" height={dripLen * 0.6 + 6} rx="2" fill="#FFC62E" />
          <rect x="14" y="13" width="3" height={dripLen * 0.4 + 3} rx="1.5" fill="#FFD766" />
          {/* 落ちるしずく */}
          <circle cx="5.5" cy={dripLen + 26} r="1.8" fill="#FFC62E" className="honey-drop" />
        </g>
      )}
    </svg>
  );
}
