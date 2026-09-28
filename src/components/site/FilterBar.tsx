import Link from "next/link";
import { GENRES } from "@/lib/listing";

/** 一覧の絞り込み（業態・エリア）。リンクだけで動く（JS不要） */
export default function FilterBar({
  path,
  genre,
  area,
  areas,
}: {
  path: string;
  genre: string;
  area: string;
  areas: { area: string; count: number }[];
}) {
  const href = (g: string, a: string) => {
    const q = new URLSearchParams();
    if (g) q.set("genre", g);
    if (a) q.set("area", a);
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
      active ? "bg-night-500 text-white" : "border border-gold-200 text-hive-800 hover:border-gold-400"
    }`;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="w-10 shrink-0 text-[11px] font-bold text-hive-500">業態</span>
        <div className="no-scrollbar -mr-4 flex gap-1.5 overflow-x-auto pr-4 sm:mr-0 sm:flex-wrap sm:pr-0">
          <Link href={href("", area)} className={chip(!genre)} scroll={false}>すべて</Link>
          {GENRES.map((g) => (
            <Link key={g} href={href(g, area)} className={chip(genre === g)} scroll={false}>{g}</Link>
          ))}
        </div>
      </div>
      {areas.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[11px] font-bold text-hive-500">エリア</span>
          <div className="no-scrollbar -mr-4 flex gap-1.5 overflow-x-auto pr-4 sm:mr-0 sm:flex-wrap sm:pr-0">
            <Link href={href(genre, "")} className={chip(!area)} scroll={false}>すべて</Link>
            {areas.map((a) => (
              <Link key={a.area} href={href(genre, a.area)} className={chip(area === a.area)} scroll={false}>{a.area}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
