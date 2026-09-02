/**
 * 制作物がどの媒体向けかをひと目で示す小さなアイコン（TikTok / YouTube / Instagram / LINE / Google）。
 * それぞれの媒体の色（YouTube=赤、Instagram=グラデ、LINE=緑…）で、巣のタイルやメニュー一覧に並べる。
 */
export type Platform = "tiktok" | "youtube" | "instagram" | "line" | "google" | "web" | "phone" | "flyer" | "recruit" | "fix";

const LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  line: "LINE",
  google: "Google",
  web: "Web",
  phone: "電話",
  flyer: "チラシ・印刷物",
  recruit: "採用",
  fix: "修正",
};

export function PlatformIcon({ p, className = "h-4 w-4" }: { p: Platform; className?: string }) {
  const common = { className, role: "img" as const, "aria-label": LABEL[p], viewBox: "0 0 24 24" };
  switch (p) {
    case "tiktok":
      return (
        <svg {...common} fill="#111">
          <path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path fill="#FF0000" d="M23.5 6.6a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.5A3 3 0 0 0 .5 6.6 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.4 3 3 0 0 0 2.1 2.1C4.5 20 12 20 12 20s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.4z" />
          <path fill="#fff" d="M9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common} fill="none">
          <defs>
            <linearGradient id="igGrad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FEDA75" />
              <stop offset="0.35" stopColor="#F58529" />
              <stop offset="0.6" stopColor="#DD2A7B" />
              <stop offset="1" stopColor="#8134AF" />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#igGrad)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="4" stroke="url(#igGrad)" strokeWidth="2.2" />
          <circle cx="17.3" cy="6.7" r="1.2" fill="#DD2A7B" />
        </svg>
      );
    case "line":
      return (
        <svg {...common} fill="#06C755">
          <path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.2 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 5.9-3.5 8-6C21.3 14.4 22 12.8 22 11c0-4.4-4.5-8-10-8zm-3.4 10.4H6.3a.5.5 0 0 1-.5-.5V9.2a.5.5 0 1 1 1 0v3.2h1.8a.5.5 0 0 1 0 1zm1.9-.5a.5.5 0 1 1-1 0V9.2a.5.5 0 1 1 1 0v3.7zm4.4 0a.5.5 0 0 1-.9.3l-1.9-2.6v2.3a.5.5 0 1 1-1 0V9.2a.5.5 0 0 1 .9-.3l1.9 2.6V9.2a.5.5 0 1 1 1 0v3.7zm3.1-2.4a.5.5 0 0 1 0 1h-1.8v1h1.8a.5.5 0 0 1 0 1h-2.3a.5.5 0 0 1-.5-.5V9.2a.5.5 0 0 1 .5-.5h2.3a.5.5 0 0 1 0 1h-1.8v1H18z" />
        </svg>
      );
    case "google":
      return (
        <svg {...common}>
          <path fill="#EA4335" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
          <circle cx="12" cy="9" r="2.5" fill="#fff" />
        </svg>
      );
    case "web":
      return (
        <svg {...common} fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round">
          <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
          <path d="M2.5 9h19M7 6.6h.01M10 6.6h.01" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common} fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />
        </svg>
      );
    case "flyer":
      // 折り目のついたチラシ＋オレンジの拡声ライン
      return (
        <svg {...common} fill="none">
          <path d="M6 3h9l4 4v14H6z" fill="#fff" stroke="#F97316" strokeWidth="2" strokeLinejoin="round" />
          <path d="M15 3v4h4" stroke="#F97316" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 11h7M9 14.5h7M9 18h4.5" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "fix":
      // レンチ（軽微な修正）
      return (
        <svg {...common} fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 6.5a4 4 0 0 0-5.6 4.9L3 17.3a2 2 0 1 0 2.8 2.8l5.9-5.9a4 4 0 0 0 4.9-5.6L13.8 11 12 9.2z" />
        </svg>
      );
    case "recruit":
      // 人物＋プラス（採用）
      return (
        <svg {...common} fill="none" stroke="#4F46E5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="8" r="4" />
          <path d="M3.5 21a6.5 6.5 0 0 1 13 0" />
          <path d="M18.5 8.5v5M16 11h5" />
        </svg>
      );
  }
}

/** メニュー名 → 向いている媒体 */
export function platformsFor(category: string): Platform[] {
  const c = category;
  if (/ショート動画|台本作成（ショート）|採用向けショート/.test(c)) return ["tiktok", "instagram", "youtube"];
  if (/TikTok/.test(c)) return ["tiktok"];
  if (/Instagram|カルーセル|投稿文/.test(c)) return ["instagram"];
  if (/動画編集（3分）|台本作成（長尺）|サムネイル/.test(c)) return ["youtube"];
  if (/LINE/.test(c)) return ["line"];
  if (/MEO|Googleマップ|口コミ/.test(c)) return ["google"];
  if (/HP|LP|ホームページ|SEO|グルメサイト|デリバリー/.test(c)) return ["web"];
  if (/テレアポ|架電/.test(c)) return ["phone"];
  if (/チラシ|パンフ|ポスター/.test(c)) return ["flyer"];
  if (/求人|採用|リクルート/.test(c)) return ["recruit"];
  if (/修正/.test(c)) return ["fix"];
  return [];
}

export function PlatformRow({ category, className = "h-4 w-4" }: { category: string; className?: string }) {
  const ps = platformsFor(category);
  if (ps.length === 0) return null;
  return (
    <span className="flex items-center justify-center gap-1.5">
      {ps.map((p) => (
        <PlatformIcon key={p} p={p} className={className} />
      ))}
    </span>
  );
}
