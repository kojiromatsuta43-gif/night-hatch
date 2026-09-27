"use client";

/**
 * 案件の進み具合を、六角形のセルにはちみつが溜まる形で見せる。
 * 募集 → 制作 → 初稿 → 修正 → 完了 の5セル。
 *  未公開=0 / 募集中=1 / 制作待ち=2 / フィードバック=3.5（初稿が届き、修正中） / 完了=5
 */
export const CELL_LABELS = ["募集", "制作", "初稿", "修正", "完了"] as const;

export function fillOf(status: string): number {
  switch (status) {
    case "募集中": return 1;
    case "制作待ち": return 2;
    case "フィードバック": return 3.5;
    case "完了": return 5;
    default: return 0;
  }
}

function Cell({ level, size }: { level: 0 | 0.5 | 1; size: number }) {
  return (
    <span className="hex relative block bg-gold-400" style={{ width: size, height: size * 1.15 }}>
      <span
        className="hex absolute"
        style={{
          inset: Math.max(2, Math.round(size * 0.09)),
          background: level === 1 ? "#FFC62E" : level === 0.5 ? "linear-gradient(to top, #FFC62E 55%, #2A2236 55%)" : "#2A2236",
        }}
      />
    </span>
  );
}

export default function HoneyCells({
  status,
  size = 26,
  labels = false,
  className = "",
}: {
  status: string;
  size?: number;
  labels?: boolean;
  className?: string;
}) {
  const fill = fillOf(status);
  const current = Math.min(4, Math.floor(fill));
  return (
    <span className={`flex items-start ${labels ? "gap-2" : "gap-0.5"} ${className}`} title={`進み具合: ${status}`}>
      {CELL_LABELS.map((label, i) => {
        const level: 0 | 0.5 | 1 = fill >= i + 1 ? 1 : fill > i ? 0.5 : 0;
        const on = i === current && fill < 5;
        return (
          <span key={label} className="flex flex-col items-center gap-1" style={labels ? { width: size + 24 } : undefined}>
            <Cell level={level} size={size} />
            {labels && (
              <span className={`text-[11px] font-bold ${on ? "text-honey-700" : fill > i ? "text-hive-900" : "text-hive-500"}`}>
                {label}
                {on ? " ←いま" : ""}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
