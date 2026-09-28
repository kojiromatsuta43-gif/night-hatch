import Link from "next/link";
import { SITE_NAME, SITE_SUB } from "@/lib/listing";

/** 公開サイトの上部。ロゴ（英字）と、2つの入口 */
export default function SiteHeader({ base }: { base: string }) {
  return (
    <header className="gold-rule sticky top-0 z-40 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <Link href={base || "/"} className="flex min-w-0 flex-col leading-none" aria-label={`${SITE_NAME} ${SITE_SUB} トップへ`}>
          <span className="font-latin whitespace-nowrap text-[21px] !tracking-[0.12em] text-gold-600 sm:text-2xl">{SITE_NAME}</span>
          <span className="mt-0.5 whitespace-nowrap text-[9.5px] tracking-[0.32em] text-hive-500">{SITE_SUB}</span>
        </Link>
        <nav className="ml-auto flex shrink-0 items-center gap-1.5 text-[13px] font-bold" aria-label="サイト">
          <Link href={`${base}/drink`} className="rounded-full border border-gold-300/60 px-3 py-1.5 text-hive-900 transition-colors hover:border-gold-500 hover:bg-night-100 sm:px-4">
            飲みに行く
          </Link>
          <Link href={`${base}/work`} className="rounded-full border border-gold-300/60 px-3 py-1.5 text-hive-900 transition-colors hover:border-gold-500 hover:bg-night-100 sm:px-4">
            働く
          </Link>
        </nav>
      </div>
    </header>
  );
}
