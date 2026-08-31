// 制作物の「形」がひと目で分かるミニ図。絵文字より縦横比・構成が伝わる。
const HONEY = "#FFC62E";
const SOFT = "#FFF0C7";
const HIVE = "#1C1710";
const LINE = "#CBD5E1";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 48" className="h-9 w-12 shrink-0" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function FormatIcon({ category }: { category: string }) {
  switch (category) {
    case "ショート動画編集": // 9:16 の縦動画
      return (
        <Frame>
          <rect x="23" y="2" width="18" height="44" rx="2.5" fill={HIVE} />
          <path d="M29 19l9 5-9 5z" fill="#fff" />
          <rect x="26" y="37" width="12" height="3.5" rx="1.7" fill={HONEY} />
        </Frame>
      );
    case "動画編集（3分）": // 16:9 の横動画
      return (
        <Frame>
          <rect x="6" y="10" width="52" height="29" rx="2.5" fill={HIVE} />
          <path d="M27 18.5l10 5.5-10 5.5z" fill="#fff" />
          <rect x="10" y="31" width="16" height="3.5" rx="1.7" fill={HONEY} />
        </Frame>
      );
    case "台本作成（長尺）": // 台本の書面
      return (
        <Frame>
          <rect x="18" y="3" width="28" height="42" rx="2" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="22" y="8" width="14" height="3.5" rx="1.5" fill={HIVE} />
          <rect x="22" y="16" width="20" height="2" rx="1" fill={LINE} />
          <rect x="22" y="20" width="20" height="2" rx="1" fill={LINE} />
          <rect x="22" y="26" width="8" height="2.6" rx="1.3" fill={HONEY} />
          <rect x="22" y="32" width="20" height="2" rx="1" fill={LINE} />
          <rect x="22" y="36" width="14" height="2" rx="1" fill={LINE} />
        </Frame>
      );
    case "サムネイル作成": // 16:9 に大きな文字
      return (
        <Frame>
          <rect x="6" y="10" width="52" height="29" rx="2.5" fill={SOFT} stroke={HONEY} strokeWidth="1.5" />
          <rect x="11" y="16" width="26" height="6" rx="1.5" fill={HIVE} />
          <rect x="11" y="25" width="17" height="4.5" rx="1.5" fill={HONEY} />
          <circle cx="48" cy="24" r="7" fill="#fff" stroke={HIVE} strokeWidth="1.5" />
          <path d="M46 21l5 3-5 3z" fill={HIVE} />
        </Frame>
      );
    case "カルーセル投稿": // 正方形が重なった束
      return (
        <Frame>
          <rect x="8" y="10" width="28" height="28" rx="3" fill={SOFT} stroke={HONEY} strokeWidth="1.4" />
          <rect x="16" y="7" width="30" height="34" rx="3" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="20" y="11" width="22" height="14" rx="1.5" fill={HONEY} />
          <rect x="20" y="28" width="22" height="2.2" rx="1.1" fill={LINE} />
          <rect x="20" y="32.5" width="14" height="2.2" rx="1.1" fill={LINE} />
          <circle cx="51" cy="24" r="1.6" fill={LINE} />
          <circle cx="56" cy="24" r="1.6" fill={LINE} />
        </Frame>
      );
    case "LPファーストビュー": // 縦に長いページの上部
      return (
        <Frame>
          <rect x="19" y="2" width="26" height="44" rx="2" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="19" y="2" width="26" height="15" rx="2" fill={HONEY} />
          <rect x="23" y="21" width="18" height="2.2" rx="1.1" fill={LINE} />
          <rect x="23" y="25.5" width="18" height="2.2" rx="1.1" fill={LINE} />
          <rect x="26" y="31" width="12" height="4.5" rx="2.2" fill={HIVE} />
          <rect x="23" y="40" width="18" height="2" rx="1" fill={LINE} />
        </Frame>
      );
    case "投稿文＋画像": // 画像 + 文章
      return (
        <Frame>
          <rect x="6" y="9" width="24" height="24" rx="2.5" fill={HONEY} />
          <circle cx="13" cy="16" r="2.6" fill="#fff" />
          <path d="M9 29l6-7 5 5 3-3 5 5H9z" fill="#fff" opacity=".85" />
          <rect x="34" y="12" width="24" height="2.6" rx="1.3" fill={HIVE} />
          <rect x="34" y="18.5" width="24" height="2.2" rx="1.1" fill={LINE} />
          <rect x="34" y="23" width="24" height="2.2" rx="1.1" fill={LINE} />
          <rect x="34" y="27.5" width="15" height="2.2" rx="1.1" fill={LINE} />
        </Frame>
      );
    case "軽微な修正": // 書面 + 赤ペン
      return (
        <Frame>
          <rect x="14" y="5" width="28" height="38" rx="2" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="18" y="11" width="20" height="2.2" rx="1.1" fill={LINE} />
          <rect x="18" y="16" width="20" height="2.2" rx="1.1" fill={LINE} />
          <rect x="18" y="21" width="12" height="2.2" rx="1.1" fill={LINE} />
          <path d="M50 12l4 4-16 16-5.5 1.5 1.5-5.5z" fill={SOFT} stroke={HIVE} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M47 15l4 4" stroke={HIVE} strokeWidth="1.4" />
        </Frame>
      );
    case "テレアポ用トークスクリプト作成": // 台本 + 吹き出し
      return (
        <Frame>
          <rect x="14" y="5" width="26" height="38" rx="2" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="18" y="11" width="14" height="3" rx="1.5" fill={HIVE} />
          <rect x="18" y="18" width="18" height="2" rx="1" fill={LINE} />
          <rect x="18" y="23" width="18" height="2" rx="1" fill={LINE} />
          <path d="M40 24h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-9l-5 4v-4h-2a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z" fill={HONEY} />
        </Frame>
      );
    case "営業リスト作成（200件）": // 表（リスト）
      return (
        <Frame>
          <rect x="8" y="8" width="48" height="32" rx="2.5" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="8" y="8" width="48" height="8" rx="2.5" fill={HONEY} />
          <rect x="12" y="20" width="12" height="2.5" rx="1" fill={HIVE} />
          <rect x="28" y="20" width="24" height="2.5" rx="1" fill={LINE} />
          <rect x="12" y="27" width="12" height="2.5" rx="1" fill={HIVE} />
          <rect x="28" y="27" width="24" height="2.5" rx="1" fill={LINE} />
          <rect x="12" y="34" width="12" height="2.5" rx="1" fill={HIVE} />
          <rect x="28" y="34" width="24" height="2.5" rx="1" fill={LINE} />
        </Frame>
      );
    case "テレアポ架電（200コール）": // 受話器
    case "テレアポ営業":
    case "宴会・法人向けテレアポ営業":
      return (
        <Frame>
          <path d="M20 8c-3 0-6 2-6 6 0 14 12 26 26 26 4 0 6-3 6-6l-2-6-8 2-3-3-5-5 2-8-6-2z" fill={HIVE} />
          <path d="M40 10a10 10 0 0 1 10 10" stroke={HONEY} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M40 4a16 16 0 0 1 16 16" stroke={HONEY} strokeWidth="3" fill="none" strokeLinecap="round" />
        </Frame>
      );
    default:
      return (
        <Frame>
          <rect x="17" y="5" width="30" height="38" rx="2" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
        </Frame>
      );
  }
}
