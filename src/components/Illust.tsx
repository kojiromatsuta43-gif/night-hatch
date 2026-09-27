"use client";

/**
 * NIGHT HATCH のスポットイラスト（夜のお店セット）。
 * 暗い地で読めるよう、線は明るいシャンパン色（#EDE3D1 / 2.2）、塗りはプラムの夜色・ワイン・シャンパンゴールド。
 * ネオンだけは発光色を使う。困りごとタイル・空っぽの画面・ログインなどで使う。viewBox は全部 96×96。
 */
const L = "#EDE3D1"; // 線
const D = "#2A2236"; // 夜のガラス・面
const W = "#B23A62"; // ワイン
const WL = "#E58AA8"; // 明るいローズ
const G = "#D4AF6A"; // シャンパンゴールド
const GL = "#F6EBD4"; // 淡いシャンパン
const H = "#FFC62E"; // はちみつ
const NEON = "#FF5C9A"; // ネオンピンク
const CYAN = "#7FE3F0"; // ネオンの水色
const S = { stroke: L, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export type IllustName = "neon" | "champagne" | "phone" | "card" | "nametag" | "review" | "mirrorball" | "bottle" | "glass";

/** きらめき（小） */
function Twinkle({ x, y, r = 5, fill = G }: { x: number; y: number; r?: number; fill?: string }) {
  const k = r * 0.28;
  return <path d={`M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}z`} fill={fill} />;
}

/** 集客・指名: 「OPEN」のネオン看板 */
function Neon() {
  return (
    <g>
      <path d="M30 6v14M66 6v14" {...S} />
      <circle cx="30" cy="6" r="2" fill={L} />
      <circle cx="66" cy="6" r="2" fill={L} />
      <rect x="10" y="20" width="76" height="42" rx="9" fill={D} {...S} />
      {/* ネオン管の枠 */}
      <rect x="16" y="26" width="64" height="30" rx="6" fill="none" stroke={CYAN} strokeWidth="5" opacity="0.18" />
      <rect x="16" y="26" width="64" height="30" rx="6" fill="none" stroke={CYAN} strokeWidth="1.6" />
      {/* OPEN（発光） */}
      <text x="48" y="48" textAnchor="middle" fontSize="17" fontWeight="800" letterSpacing="1.5" fill="none" stroke={NEON} strokeWidth="5" opacity="0.3" fontFamily="Arial, sans-serif">OPEN</text>
      <text x="48" y="48" textAnchor="middle" fontSize="17" fontWeight="800" letterSpacing="1.5" fill="#FFD6E6" stroke={NEON} strokeWidth="0.9" fontFamily="Arial, sans-serif">OPEN</text>
      {/* 下のカクテルグラスのネオン */}
      <path d="M40 70h16l-8 9z" fill="none" stroke={CYAN} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M48 79v8M43 88h10" fill="none" stroke={CYAN} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="52" cy="68" r="2" fill={NEON} />
      <Twinkle x={82} y={72} r={5} />
      <Twinkle x={14} y={76} r={3.5} fill={GL} />
    </g>
  );
}

/** イベント・売上: 乾杯するシャンパングラスときらめき */
function Champagne() {
  const flute = (tx: number, rot: number, key: string) => (
    <g key={key} transform={`rotate(${rot} ${tx} 84)`}>
      <path d={`M${tx - 8} 30h16l-1.6 24a6.4 6.4 0 0 1-12.8 0z`} fill={D} {...S} />
      <path d={`M${tx - 7.2} 40h14.4l-0.9 14a5.5 5.5 0 0 1-12.6 0z`} fill={G} />
      <circle cx={tx - 2} cy={48} r="1.1" fill={GL} />
      <circle cx={tx + 2} cy={44} r="0.9" fill={GL} />
      <circle cx={tx} cy={52} r="0.8" fill={GL} />
      <path d={`M${tx - 8} 30h16l-1.6 24a6.4 6.4 0 0 1-12.8 0z`} fill="none" {...S} />
      <path d={`M${tx} 60.5v20M${tx - 7} 81h14`} fill="none" {...S} />
    </g>
  );
  return (
    <g>
      {flute(36, -14, "l")}
      {flute(60, 14, "r")}
      {/* 乾杯のきらめき */}
      <Twinkle x={48} y={16} r={9} />
      <path d="M36 14l-5-5M60 14l5-5M48 3v-2" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" />
      <Twinkle x={20} y={24} r={4} fill={GL} />
      <Twinkle x={78} y={26} r={4.5} fill={WL} />
      <circle cx="84" cy="44" r="1.6" fill={G} />
      <circle cx="12" cy="44" r="1.6" fill={G} />
    </g>
  );
}

/** SNS・動画: 縦長スマホの中に夜のお店、ハートが飛ぶ */
function Phone() {
  return (
    <g>
      <rect x="28" y="8" width="38" height="80" rx="8" fill={D} {...S} />
      <rect x="33" y="15" width="28" height="64" rx="4" fill={W} />
      {/* 画面の中: 月と再生ボタン */}
      <path d="M52 22a5 5 0 1 0 0 8a4 4 0 1 1 0-8z" fill={GL} />
      <circle cx="47" cy="48" r="9" fill="none" stroke={GL} strokeWidth="1.8" />
      <path d="M44.5 43.5l7 4.5-7 4.5z" fill={GL} />
      <rect x="37" y="66" width="20" height="3.5" rx="1.75" fill={G} />
      <rect x="37" y="72" width="13" height="3" rx="1.5" fill={WL} opacity="0.8" />
      <rect x="42" y="10.5" width="10" height="2" rx="1" fill={L} opacity="0.6" />
      {/* ハート */}
      <path d="M76 30c-3-5-10-2-8 4 2 5 8 9 8 9s6-4 8-9c2-6-5-9-8-4z" fill={WL} {...S} strokeWidth={1.8} />
      <path d="M82 14c-2-3-6-1-5 2 1 3 5 5 5 5s4-2 5-5c1-3-3-5-5-2z" fill={G} />
      <path d="M17 38c-2-3-6-1-5 2 1 3 5 5 5 5s4-2 5-5c1-3-3-5-5-2z" fill={G} />
      <Twinkle x={16} y={66} r={4} fill={GL} />
    </g>
  );
}

/** 営業: 重ねた名刺（法人・貸切のご案内） */
function Card() {
  return (
    <g>
      <g transform="rotate(-10 48 50)">
        <rect x="14" y="26" width="64" height="38" rx="4" fill={G} {...S} />
      </g>
      <g transform="rotate(6 48 54)">
        <rect x="18" y="32" width="64" height="38" rx="4" fill={GL} {...S} />
        {/* 店のしるし（三日月） */}
        <path d="M33 42a6 6 0 1 0 0 11a5 5 0 1 1 0-11z" fill={W} />
        <rect x="44" y="42" width="30" height="3.4" rx="1.7" fill="#3A2A33" />
        <rect x="44" y="49" width="20" height="2.4" rx="1.2" fill="#8A7A80" />
        <rect x="26" y="60" width="48" height="2" rx="1" fill={G} />
        <rect x="26" y="64" width="30" height="2" rx="1" fill="#B8A9AE" />
      </g>
      <Twinkle x={82} y={20} r={6} />
      <Twinkle x={12} y={78} r={3.5} fill={WL} />
    </g>
  );
}

/** キャスト採用: ハンガーのドレスと「体入」の名札 */
function Nametag() {
  return (
    <g>
      {/* ハンガー */}
      <path d="M44 16c0-5 8-5 8 0 0 3-4 3.5-4 7" fill="none" {...S} />
      <path d="M48 23L18 38h60z" fill="none" {...S} />
      {/* ドレス */}
      <path d="M36 38h24l-3 10 11 38H28l11-38z" fill={W} {...S} />
      <path d="M39 48h18" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M44 38l4 6 4-6" fill="none" stroke={L} strokeWidth="1.6" strokeLinejoin="round" />
      {/* 名札 */}
      <path d="M66 38v12" stroke={G} strokeWidth="1.6" />
      <g transform="rotate(8 72 62)">
        <rect x="56" y="50" width="32" height="24" rx="3" fill={GL} {...S} />
        <rect x="56" y="50" width="32" height="6" rx="3" fill={G} />
        <text x="72" y="70" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2A1D22" fontFamily="'Shippori Mincho B1', serif">体入</text>
      </g>
      <Twinkle x={16} y={58} r={5} />
      <Twinkle x={84} y={26} r={3.5} fill={WL} />
    </g>
  );
}

/** 運営: 口コミの吹き出しと星、お店からの返信 */
function Review() {
  return (
    <g>
      <path d="M14 20h52a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H36l-12 12V56h-10a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6z" fill={D} {...S} />
      {[24, 36, 48, 60].map((x, i) => (
        <path key={x} d={`M${x} 32l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z`} fill={i < 3 ? G : "none"} stroke={i < 3 ? G : L} strokeWidth={1.4} strokeLinejoin="round" />
      ))}
      <path d="M62 44h22a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5h-4v8l-8-8h-10a5 5 0 0 1-5-5V49a5 5 0 0 1 5-5z" fill={W} {...S} />
      <path d="M68 54h14M68 60h8" fill="none" stroke={GL} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
}

/** おすすめ: ミラーボールと光 */
function Mirrorball() {
  return (
    <g>
      <path d="M48 4v14" {...S} />
      {/* 光の筋 */}
      <path d="M30 60L8 86M66 60l22 26M48 68v24" stroke={G} strokeWidth="6" opacity="0.18" strokeLinecap="round" />
      <path d="M30 60L8 86M66 60l22 26M48 68v24" stroke={G} strokeWidth="1.4" opacity="0.7" strokeLinecap="round" />
      <circle cx="48" cy="42" r="24" fill={D} {...S} />
      {/* タイル */}
      <clipPath id="mb-clip"><circle cx="48" cy="42" r="23" /></clipPath>
      <g clipPath="url(#mb-clip)" stroke="#5A4E6A" strokeWidth="1.1" fill="none">
        <path d="M24 30h48M24 42h48M24 54h48" />
        <path d="M36 18c-6 8-6 40 0 48M48 18v48M60 18c6 8 6 40 0 48" />
      </g>
      <g clipPath="url(#mb-clip)">
        <rect x="37" y="31" width="10" height="10" fill={GL} opacity="0.85" />
        <rect x="49" y="43" width="10" height="10" fill={G} opacity="0.8" />
        <rect x="27" y="43" width="8" height="10" fill={WL} opacity="0.55" />
        <rect x="61" y="31" width="8" height="10" fill={WL} opacity="0.45" />
        <rect x="49" y="19" width="10" height="10" fill={G} opacity="0.45" />
      </g>
      <circle cx="48" cy="42" r="24" fill="none" {...S} />
      <Twinkle x={80} y={18} r={7} />
      <Twinkle x={16} y={20} r={5} fill={GL} />
      <Twinkle x={84} y={48} r={3.5} fill={WL} />
    </g>
  );
}

/** ハニーP: ボトルキープ（ハニーの入ったボトルに名札） */
function Bottle() {
  return (
    <g>
      <path d="M40 8h16v14c0 4 3 6 6 8 4 3 6 6 6 11v40a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V41c0-5 2-8 6-11 3-2 6-4 6-8z" fill={D} {...S} />
      <clipPath id="bt-clip"><path d="M40 8h16v14c0 4 3 6 6 8 4 3 6 6 6 11v40a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V41c0-5 2-8 6-11 3-2 6-4 6-8z" /></clipPath>
      <rect x="26" y="44" width="44" height="46" fill={H} clipPath="url(#bt-clip)" />
      <path d="M40 8h16v14c0 4 3 6 6 8 4 3 6 6 6 11v40a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V41c0-5 2-8 6-11 3-2 6-4 6-8z" fill="none" {...S} />
      <rect x="38" y="4" width="20" height="7" rx="2" fill={G} {...S} strokeWidth={1.8} />
      {/* ラベル（六角形） */}
      <rect x="33" y="54" width="30" height="22" rx="2" fill={D} stroke={G} strokeWidth="1.6" />
      <path d="M48 58l6 3.5v7L48 72l-6-3.5v-7z" fill={H} stroke={G} strokeWidth="1.2" />
      <path d="M33 44c0-2 1-4 3-5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* キープの名札 */}
      <path d="M56 18l14 6" stroke={G} strokeWidth="1.6" />
      <g transform="rotate(20 78 30)">
        <path d="M66 22h22v14H66l-4-7z" fill={GL} {...S} strokeWidth={1.8} />
        <circle cx="67" cy="29" r="1.4" fill={G} />
        <text x="78.5" y="32.2" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#2A1D22" fontFamily="Georgia, serif">KEEP</text>
      </g>
    </g>
  );
}

/** 空っぽの画面: 空のカクテルグラス */
function Glass() {
  return (
    <g>
      <path d="M22 26h52L48 56z" fill={D} {...S} />
      <path d="M48 56v26M34 84h28" fill="none" {...S} />
      {/* ガラスの光 */}
      <path d="M30 31l10 12" stroke={L} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      {/* 縁に残ったオリーブのピック */}
      <path d="M64 18l-10 20" stroke={G} strokeWidth="2" strokeLinecap="round" />
      <circle cx="66" cy="15" r="2.6" fill={G} />
      <Twinkle x={80} y={50} r={5} fill={GL} />
      <circle cx="16" cy="48" r="1.6" fill={G} />
      <circle cx="84" cy="30" r="1.4" fill={WL} />
    </g>
  );
}

const MAP: Record<IllustName, () => React.JSX.Element> = {
  neon: Neon, champagne: Champagne, phone: Phone, card: Card, nametag: Nametag, review: Review,
  mirrorball: Mirrorball, bottle: Bottle, glass: Glass,
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
  "キャスト採用": "nametag",
  "集客・指名": "neon",
  "SNS・動画": "phone",
  "イベント・売上": "champagne",
  "営業": "card",
  "運営": "review",
};
