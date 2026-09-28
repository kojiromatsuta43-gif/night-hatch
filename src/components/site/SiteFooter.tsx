import Link from "next/link";
import { SITE_NAME, SITE_OPERATOR, SITE_SUB } from "@/lib/listing";

/** 公開サイトの下部。運営・掲載について・法律上の注意（飲酒・年齢）を全ページに出す */
export default function SiteFooter({ base }: { base: string }) {
  return (
    <footer className="mt-20 border-t border-gold-200/60 bg-ink-900">
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 sm:pb-12">
        <div className="grid gap-8 sm:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="font-latin text-2xl !tracking-[0.12em] text-gold-600">{SITE_NAME}</p>
            <p className="mt-0.5 text-[10px] tracking-[0.32em] text-hive-500">{SITE_SUB}</p>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-hive-700">夜のお店の“いま”を、お店の公式動画で。今夜の一軒さがしと、はじめての一歩を。</p>
            <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-bold" aria-label="フッター">
              <Link href={`${base}/drink`} className="text-hive-900 hover:text-gold-600">飲みに行く</Link>
              <Link href={`${base}/work`} className="text-hive-900 hover:text-gold-600">働く</Link>
              <Link href={`${base}/for-stores`} className="text-gold-500 hover:text-gold-600">掲載をご希望の店舗さまへ →</Link>
            </nav>
          </div>
          <div className="space-y-4 text-[12px] leading-relaxed text-hive-500">
            <div>
              <p className="font-bold text-hive-700">掲載について</p>
              <p className="mt-1">
                このサイトは、夜のお店向けサービス「NIGHT HATCH」をご契約いただいている店舗の掲載ページです。掲載情報は各店舗から提供された内容です。
                料金・営業時間・求人の条件は変わることがあります。最新の内容は各店舗の公式LINEでご確認ください。
              </p>
            </div>
            <p>このサイトでは、お客さま・応募される方の個人情報をお預かりしていません。ご予約・お問い合わせ・ご応募は、各店舗の公式LINEで直接お願いします。</p>
          </div>
        </div>
        <ul className="mt-8 flex flex-col gap-2 rounded-xl border border-gold-200/60 bg-ink-800 px-4 py-3 text-[12.5px] font-bold text-hive-800 sm:flex-row sm:gap-8">
          <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />20歳未満の飲酒は法律で禁止されています</li>
          <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" aria-hidden="true" />18歳未満の方はご応募いただけません</li>
        </ul>
        <div className="mt-6 flex flex-col gap-1 text-[11px] text-hive-500 sm:flex-row sm:justify-between">
          <span>運営: {SITE_OPERATOR}</span>
          <span className="font-latin !tracking-[0.14em]">© {new Date().getFullYear()} {SITE_NAME}</span>
        </div>
      </div>
    </footer>
  );
}
