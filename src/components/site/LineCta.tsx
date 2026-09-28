"use client";

/**
 * 公式LINEへのボタン。押された回数だけを数える（どのお店・飲みに行く/働く・日時）。
 * 個人情報は集めない。予約・問い合わせ・応募のやりとりは、すべてお店の公式LINEで行う。
 */
export default function LineCta({
  slug,
  kind,
  href,
  children,
  variant = "solid",
  track = true,
  className = "",
}: {
  slug: string;
  kind: "drink" | "work";
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline";
  track?: boolean;
  className?: string;
}) {
  const onClick = () => {
    if (!track) return;
    try {
      const body = JSON.stringify({ slug, kind });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/site/click", new Blob([body], { type: "text/plain" }));
      else void fetch("/api/site/click", { method: "POST", body, keepalive: true });
    } catch {
      /* 数えられなくてもリンクは開く */
    }
  };
  const look =
    variant === "solid"
      ? "bg-[#06C755] text-white hover:bg-[#05b34c] shadow-[0_8px_24px_-10px_rgba(6,199,85,0.7)]"
      : "border border-[#06C755]/70 bg-ink-900/60 text-[#7EEBA8] hover:bg-[#06C755]/10";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-bold transition-colors ${look} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.8 1.8 5.26 4.53 6.68L6 21l3.7-2.3c.74.13 1.51.2 2.3.2 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
      </svg>
      {children}
    </a>
  );
}
