import Link from "next/link";
import { SITE_NAME, SITE_SUB } from "@/lib/listing";

/** 公開サイトの上部。ロゴ（英字）と、入口（飲みに行く・働く・地域から選ぶ） */
export default function SiteHeader({ base }: { base: string }) {
  return (
    <header className="gold-rule sticky top-0 z-40 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
        <Link href={base || "/"} className="flex min-w-0 flex-col leading-none" aria-label={`${SITE_NAME} ${SITE_SUB} トップへ`}>
          <span className="font-latin whitespace-nowrap text-[17px] !tracking-[0.1em] text-gold-600 sm:text-2xl sm:!tracking-[0.12em]">{SITE_NAME}</span>
          <span className="mt-0.5 whitespace-nowrap text-[9.5px] tracking-[0.32em] text-hive-500">{SITE_SUB}</span>
        </Link>
        <nav className="ml-auto flex shrink-0 items-center gap-1 text-[12px] font-bold sm:gap-1.5 sm:text-[13px]" aria-label="サイト">
          <Link href={`${base}/drink`} className="rounded-full border border-gold-300/60 px-2.5 py-1.5 text-hive-900 transition-colors hover:border-gold-500 hover:bg-night-100 sm:px-4">
            飲みに行く
          </Link>
          <Link href={`${base}/work`} className="rounded-full border border-gold-300/60 px-2.5 py-1.5 text-hive-900 transition-colors hover:border-gold-500 hover:bg-night-100 sm:px-4">
            働く
          </Link>
          <Link href={`${base}/map`} className="flex items-center gap-1 rounded-full bg-night-500 px-2.5 py-1.5 text-white transition-colors hover:bg-night-600 sm:px-4">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></svg>
            <span className="sm:hidden">地域</span>
            <span className="hidden sm:inline">地域から選ぶ</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
