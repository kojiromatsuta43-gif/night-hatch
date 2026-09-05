"use client";

/**
 * FOOD HATCH のスポットイラスト。ハッチと同じ線（焦げ茶 #2B1410）・同じ塗り（クリーム／テラコッタ／はちみつ）で描いた
 * 小さな絵。困りごとタイル・空っぽの画面・ログインなどで使う。viewBox は全部 96×96。
 */
const O = "#2B1410"; // 線
const T = "#B84B30"; // テラコッタ
const TL = "#E09A7B"; // 薄いテラコッタ
const C = "#FFF1E0"; // クリーム
const H = "#FFC62E"; // はちみつ
const W = "#FFFFFF";
const S = { stroke: O, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export type IllustName = "noren" | "donburi" | "phone" | "banquet" | "apron" | "review" | "sparkle" | "jar" | "empty";

/** 集客: 店先の暖簾と、並ぶお客さん */
function Noren() {
  return (
    <g>
      <rect x="10" y="14" width="76" height="8" rx="2" fill={O} />
      {[14, 32, 50, 68].map((x) => (
        <path key={x} d={`M${x} 22h16v34l-8 4-8-4z`} fill={T} {...S} strokeWidth={2} />
      ))}
      <text x="48" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill={C} fontFamily="serif">営業中</text>
      {/* お客さん3人 */}
      {[22, 48, 74].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={70 - (i === 1 ? 3 : 0)} r="7" fill={C} {...S} />
          <path d={`M${x - 10} ${92 - (i === 1 ? 3 : 0)}c0-8 4-13 10-13s10 5 10 13`} fill={i === 1 ? H : TL} {...S} />
        </g>
      ))}
    </g>
  );
}

/** メニュー・売上: 湯気の立つ丼と値札 */
function Donburi() {
  return (
    <g>
      <path d="M22 50h52c0 18-10 30-26 30S22 68 22 50z" fill={T} {...S} />
      <ellipse cx="48" cy="50" rx="26" ry="7" fill={C} {...S} />
      <path d="M30 78h36" {...S} />
      {/* 具 */}
      <ellipse cx="40" cy="48" rx="6" ry="3" fill={H} />
      <ellipse cx="56" cy="47" rx="7" ry="3.5" fill={TL} />
      {/* 湯気 */}
      <path d="M38 36c-3-4 3-8 0-12M48 34c-3-4 3-8 0-12M58 36c-3-4 3-8 0-12" fill="none" {...S} strokeWidth={2} opacity="0.7" />
      {/* 値札 */}
      <path d="M62 62l18-10 8 14-18 10z" fill={H} {...S} />
      <circle cx="80" cy="56" r="1.8" fill={O} />
    </g>
  );
}

/** SNS・動画: 縦長スマホの中に料理、ハートが飛ぶ */
function Phone() {
  return (
    <g>
      <rect x="30" y="8" width="36" height="80" rx="7" fill={O} />
      <rect x="34" y="14" width="28" height="68" rx="4" fill={C} />
      <circle cx="48" cy="52" r="11" fill={T} {...S} strokeWidth={2} />
      <ellipse cx="48" cy="52" rx="11" ry="3.5" fill={C} />
      <path d="M44 42c-2-3 2-6 0-9M52 42c-2-3 2-6 0-9" fill="none" {...S} strokeWidth={1.8} opacity="0.7" />
      <rect x="38" y="70" width="20" height="4" rx="2" fill={TL} />
      {/* ハート */}
      <path d="M72 28c-3-5-10-2-8 4 2 5 8 9 8 9s6-4 8-9c2-6-5-9-8-4z" fill={T} {...S} strokeWidth={2} />
      <path d="M80 12c-2-3-6-1-5 2 1 3 5 5 5 5s4-2 5-5c1-3-3-5-5-2z" fill={H} {...S} strokeWidth={1.6} />
      <path d="M18 34c-2-3-6-1-5 2 1 3 5 5 5 5s4-2 5-5c1-3-3-5-5-2z" fill={H} {...S} strokeWidth={1.6} />
    </g>
  );
}

/** 営業: 乾杯するジョッキと「宴会」の札 */
function Banquet() {
  return (
    <g>
      {/* ジョッキ2つ */}
      <path d="M16 46h22v30a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z" fill={H} {...S} />
      <path d="M16 46h22v8H16z" fill={W} {...S} strokeWidth={2} />
      <path d="M38 54h6a4 4 0 0 1 0 8h-6" fill="none" {...S} />
      <path d="M58 46h22v30a4 4 0 0 1-4 4H62a4 4 0 0 1-4-4z" fill={H} {...S} />
      <path d="M58 46h22v8H58z" fill={W} {...S} strokeWidth={2} />
      <path d="M58 54h-6a4 4 0 0 0 0 8h6" fill="none" {...S} />
      {/* 泡 */}
      <circle cx="22" cy="43" r="3" fill={W} {...S} strokeWidth={1.6} />
      <circle cx="30" cy="40" r="4" fill={W} {...S} strokeWidth={1.6} />
      <circle cx="72" cy="41" r="4" fill={W} {...S} strokeWidth={1.6} />
      {/* 札「宴会」 */}
      <path d="M40 10h16a3 3 0 0 1 3 3v18l-11 6-11-6V13a3 3 0 0 1 3-3z" fill={C} {...S} strokeWidth={2} />
      <text x="48" y="27" textAnchor="middle" fontSize="11" fontWeight="700" fill={O} fontFamily="serif">宴会</text>
      <path d="M48 4v6" {...S} />
    </g>
  );
}

/** 採用: エプロンをつけた新人スタッフ */
function Apron() {
  return (
    <g>
      <circle cx="48" cy="28" r="14" fill={C} {...S} />
      <path d="M36 22c2-8 22-8 24 0" fill={O} />
      <circle cx="43" cy="30" r="1.8" fill={O} />
      <circle cx="53" cy="30" r="1.8" fill={O} />
      <path d="M44 36c2 2 6 2 8 0" fill="none" {...S} strokeWidth={1.8} />
      <circle cx="39" cy="34" r="2" fill="#F49A96" opacity="0.8" />
      <circle cx="57" cy="34" r="2" fill="#F49A96" opacity="0.8" />
      {/* 体とエプロン */}
      <path d="M26 88c0-20 8-32 22-32s22 12 22 32z" fill={TL} {...S} />
      <path d="M36 62h24v22a4 4 0 0 1-4 4H40a4 4 0 0 1-4-4z" fill={W} {...S} />
      <path d="M36 62l-6-4M60 62l6-4" fill="none" {...S} />
      <path d="M48 70c-2 3-3 4-3 6a3 3 0 0 0 6 0c0-2-1-3-3-6z" fill={H} {...S} strokeWidth={1.4} />
      {/* バンダナ */}
      <path d="M34 20c6 3 22 3 28 0l-2 6c-6 3-18 3-24 0z" fill={T} {...S} strokeWidth={2} />
    </g>
  );
}

/** 運営: 口コミの吹き出しと星 */
function Review() {
  return (
    <g>
      <path d="M14 22h52a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H36l-12 12V58h-10a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6z" fill={W} {...S} />
      {[24, 36, 48, 60].map((x, i) => (
        <path key={x} d={`M${x} 34l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z`} fill={i < 3 ? H : C} {...S} strokeWidth={1.6} />
      ))}
      <path d="M64 44h20a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-4v8l-8-8h-8a5 5 0 0 1-5-5v-9" fill={T} {...S} />
      <path d="M70 54h10M70 60h6" fill="none" stroke={C} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
}

/** 今日のおすすめ: きらめき */
function Sparkle() {
  return (
    <g>
      <path d="M48 12c2 16 8 22 24 24-16 2-22 8-24 24-2-16-8-22-24-24 16-2 22-8 24-24z" fill={H} {...S} />
      <path d="M20 60c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9z" fill={T} {...S} strokeWidth={1.8} />
      <path d="M76 62c1 5 2 6 7 7-5 1-6 2-7 7-1-5-2-6-7-7 5-1 6-2 7-7z" fill={C} {...S} strokeWidth={1.8} />
    </g>
  );
}

/** ハニーの壺（大きく出す用） */
function Jar() {
  return (
    <g>
      <rect x="28" y="12" width="40" height="10" rx="4" fill={O} />
      <path d="M26 24c-5 5-7 14-7 24v16a10 10 0 0 0 10 10h38a10 10 0 0 0 10-10V48c0-10-2-19-7-24z" fill={H} {...S} />
      <rect x="30" y="20" width="36" height="8" rx="4" fill={H} {...S} />
      <circle cx="40" cy="48" r="3" fill={O} />
      <circle cx="56" cy="48" r="3" fill={O} />
      <path d="M42 57c2 3 10 3 12 0" fill="none" {...S} />
      <circle cx="33" cy="55" r="2.6" fill="#F49A96" opacity="0.9" />
      <circle cx="63" cy="55" r="2.6" fill="#F49A96" opacity="0.9" />
      <path d="M24 40c1-5 2-9 5-13" fill="none" stroke={W} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/** 空っぽの画面: 伏せたお椀と箸 */
function Empty() {
  return (
    <g>
      <path d="M20 58c0-10 12-18 28-18s28 8 28 18z" fill={C} {...S} />
      <path d="M16 58h64" {...S} />
      <path d="M34 66h28" fill="none" {...S} strokeWidth={2} />
      <path d="M22 78l52-8M22 84l52-8" fill="none" {...S} strokeWidth={2.4} />
      <path d="M52 30c-2-3 2-6 0-9M60 32c-2-3 2-6 0-9" fill="none" {...S} strokeWidth={1.8} opacity="0.5" />
    </g>
  );
}

const MAP: Record<IllustName, () => React.JSX.Element> = {
  noren: Noren, donburi: Donburi, phone: Phone, banquet: Banquet, apron: Apron, review: Review, sparkle: Sparkle, jar: Jar, empty: Empty,
};

export default function Illust({ name, className = "h-16 w-16", title }: { name: IllustName; className?: string; title?: string }) {
  const Draw = MAP[name];
  return (
    <svg viewBox="0 0 96 96" className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      <Draw />
    </svg>
  );
}

/** 困りごとグループ名 → 絵 */
export const GROUP_ILLUST: Record<string, IllustName> = {
  "集客": "noren",
  "メニュー・売上": "donburi",
  "SNS・動画": "phone",
  "営業": "banquet",
  "採用": "apron",
  "運営": "review",
};
