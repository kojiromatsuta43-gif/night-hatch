import Link from "next/link";
import Illust from "@/components/Illust";

/** 掲載店がまだ無いとき */
export default function EmptyStores({ base, message = "掲載店舗は準備中です" }: { base: string; message?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-gold-300 bg-ink-800/60 px-6 py-10 text-center">
      <Illust name="glass" className="h-20 w-20" />
      <p className="mt-3 font-display text-lg text-hive-900">{message}</p>
      <p className="mt-1 text-[13px] text-hive-500">順次、お店の情報と動画を掲載していきます。</p>
      <Link href={`${base}/for-stores`} className="mt-5 rounded-full border border-gold-400 px-5 py-2 text-[13px] font-bold text-gold-600 hover:bg-gold-50">
        掲載をご希望の店舗さまへ →
      </Link>
    </div>
  );
}
