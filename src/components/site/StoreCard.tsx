import Link from "next/link";
import StoreCover from "./StoreCover";
import type { Listing } from "@/lib/listing";

/** お店のカード（一覧・トップの新着）。variant="work" は体入時給と時給を見せる */
export default function StoreCard({ l, base, variant = "drink" }: { l: Listing; base: string; variant?: "drink" | "work" }) {
  const wage = l.recruit_trial_wage || l.recruit_wage;
  return (
    <Link
      href={`${base}/stores/${l.slug}${variant === "work" ? "#work" : ""}`}
      className="group block overflow-hidden rounded-2xl border border-gold-200/70 bg-ink-800 transition-colors hover:border-gold-400"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
          <StoreCover photo={l.photos[0]} genre={l.genre} alt={l.store_name} />
        </div>
        <span className="absolute left-3 top-3 rounded-full border border-gold-300/40 bg-ink-950/75 px-2.5 py-1 text-[11px] font-bold text-gold-600 backdrop-blur">
          {[l.genre, l.area].filter(Boolean).join("・")}
        </span>
        {variant === "work" && wage && (
          <span className="absolute bottom-3 left-3 max-w-[85%] truncate rounded-lg bg-night-500 px-2.5 py-1 text-[12px] font-bold text-white shadow-lg">
            {wage}
          </span>
        )}
      </div>
      <div className="px-4 pb-4 pt-3.5">
        <h3 className="font-display text-[17px] leading-snug text-hive-900">{l.store_name}</h3>
        {l.catch_copy && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-hive-700">{l.catch_copy}</p>}
        {variant === "work" ? (
          l.recruit_benefits && <p className="mt-2 line-clamp-1 text-[12px] text-gold-600">{l.recruit_benefits}</p>
        ) : (
          l.access && <p className="mt-2 line-clamp-1 text-[12px] text-hive-500">{l.access}</p>
        )}
      </div>
    </Link>
  );
}
