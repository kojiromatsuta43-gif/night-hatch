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
    case "バナー作成": // 横長 3:1
      return (
        <Frame>
          <rect x="3" y="15" width="58" height="19" rx="2" fill={SOFT} stroke={HONEY} strokeWidth="1.5" />
          <rect x="7" y="20" width="22" height="3.5" rx="1.7" fill={HIVE} />
          <rect x="7" y="26" width="14" height="2.5" rx="1.2" fill={LINE} />
          <rect x="42" y="20" width="15" height="9" rx="4.5" fill={HONEY} />
        </Frame>
      );
    case "チラシ作成": // A4 縦
      return (
        <Frame>
          <rect x="21" y="3" width="22" height="42" rx="2" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="24" y="7" width="16" height="9" rx="1.5" fill={HONEY} />
          <rect x="24" y="19" width="16" height="2" rx="1" fill={LINE} />
          <rect x="24" y="23" width="16" height="2" rx="1" fill={LINE} />
          <rect x="24" y="27" width="10" height="2" rx="1" fill={LINE} />
          <rect x="24" y="34" width="16" height="7" rx="1.5" fill={SOFT} stroke={HONEY} strokeWidth="1" />
        </Frame>
      );
    case "サムネイル作成": // 16:9 + 再生
      return (
        <Frame>
          <rect x="6" y="10" width="52" height="29" rx="2.5" fill={HIVE} />
          <path d="M27 18.5l10 5.5-10 5.5z" fill="#fff" />
          <rect x="10" y="31" width="20" height="4" rx="2" fill={HONEY} />
        </Frame>
      );
    case "名刺作成": // 91:55 横長カード
      return (
        <Frame>
          <rect x="10" y="12" width="44" height="26" rx="2.5" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <circle cx="19" cy="21" r="4" fill={HONEY} />
          <rect x="27" y="18" width="20" height="3" rx="1.5" fill={HIVE} />
          <rect x="27" y="24" width="14" height="2" rx="1" fill={LINE} />
          <rect x="15" y="30" width="32" height="2" rx="1" fill={LINE} />
        </Frame>
      );
    case "LP作成・修正": // 縦に長いページ
      return (
        <Frame>
          <rect x="19" y="2" width="26" height="44" rx="2" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="19" y="2" width="26" height="13" rx="2" fill={HONEY} />
          <rect x="23" y="19" width="18" height="2" rx="1" fill={LINE} />
          <rect x="23" y="23" width="18" height="2" rx="1" fill={LINE} />
          <rect x="23" y="29" width="8" height="7" rx="1.5" fill={SOFT} />
          <rect x="33" y="29" width="8" height="7" rx="1.5" fill={SOFT} />
          <rect x="26" y="39" width="12" height="4" rx="2" fill={HONEY} />
        </Frame>
      );
    case "LINE構築": // スマホ + 吹き出し
      return (
        <Frame>
          <rect x="21" y="2" width="22" height="44" rx="4" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="24" y="9" width="12" height="7" rx="3.5" fill={SOFT} />
          <rect x="28" y="19" width="12" height="7" rx="3.5" fill="#06C755" />
          <rect x="24" y="29" width="14" height="7" rx="3.5" fill={SOFT} />
          <rect x="27" y="40" width="10" height="2" rx="1" fill={LINE} />
        </Frame>
      );
    case "Instagram投稿": // 正方形 + グリッド
      return (
        <Frame>
          <rect x="14" y="5" width="36" height="36" rx="4" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="18" y="9" width="13" height="13" rx="1.5" fill={HONEY} />
          <rect x="33" y="9" width="13" height="13" rx="1.5" fill={SOFT} />
          <rect x="18" y="24" width="13" height="13" rx="1.5" fill={SOFT} />
          <rect x="33" y="24" width="13" height="13" rx="1.5" fill={HONEY} />
        </Frame>
      );
    case "SEO記事作成": // 文書 + 見出し
      return (
        <Frame>
          <rect x="17" y="3" width="30" height="42" rx="2" fill="#fff" stroke={HONEY} strokeWidth="1.5" />
          <rect x="21" y="8" width="17" height="4" rx="1.5" fill={HIVE} />
          <rect x="21" y="16" width="22" height="2" rx="1" fill={LINE} />
          <rect x="21" y="20" width="22" height="2" rx="1" fill={LINE} />
          <rect x="21" y="24" width="16" height="2" rx="1" fill={LINE} />
          <rect x="21" y="31" width="10" height="3" rx="1.5" fill={HONEY} />
          <rect x="21" y="37" width="22" height="2" rx="1" fill={LINE} />
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
