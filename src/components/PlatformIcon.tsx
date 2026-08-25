// SNSプラットフォームのマーク。色つきでひと目で分かるように。
export type Platform = "tiktok" | "youtube" | "instagram" | "line";

export default function PlatformIcon({
  platform,
  className = "h-4 w-4",
  mono = false,
}: {
  platform: Platform;
  className?: string;
  mono?: boolean;
}) {
  const c = (color: string) => (mono ? "currentColor" : color);
  switch (platform) {
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            fill={c("#111")}
            d="M16.5 2h-3v13.2a2.6 2.6 0 1 1-2.2-2.57V9.5a5.8 5.8 0 1 0 5.2 5.77V8.9a6.6 6.6 0 0 0 4 1.35V7.06A3.75 3.75 0 0 1 16.5 2Z"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill={c("#FF0000")} />
          <path d="M10 8.6l6 3.4-6 3.4z" fill="#fff" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke={c("#E1306C")} strokeWidth="2" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke={c("#E1306C")} strokeWidth="2" />
          <circle cx="17.4" cy="6.6" r="1.3" fill={c("#E1306C")} />
        </svg>
      );
    case "line":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            fill={c("#06C755")}
            d="M12 3.2c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.1.3 0 .5.2.5.5l-.3 2c-.1.4.3.6.6.4l4.4-2.9c2.9-1.4 5.3-3.9 5.3-7.1 0-4-4-7.2-9-7.2Z"
          />
          <rect x="7.5" y="8.6" width="2" height="4.6" rx="1" fill="#fff" />
          <rect x="11" y="8.6" width="2" height="4.6" rx="1" fill="#fff" />
          <rect x="14.3" y="8.6" width="2" height="4.6" rx="1" fill="#fff" />
        </svg>
      );
  }
}
