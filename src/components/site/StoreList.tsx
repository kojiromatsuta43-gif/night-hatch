import Link from "next/link";
import StoreCard from "./StoreCard";
import FilterBar from "./FilterBar";
import EmptyStores from "./EmptyStores";
import type { Listing } from "@/lib/listing";

/** 「飲みに行く」「働く」の一覧の中身（見出し・絞り込み・カード）。2つのページで共通 */
export default function StoreList({
  kind,
  base,
  stores,
  areas,
  genre,
  area,
}: {
  kind: "drink" | "work";
  base: string;
  stores: Listing[];
  areas: { area: string; count: number }[];
  genre: string;
  area: string;
}) {
  const work = kind === "work";
  const path = `${base}/${kind}`;
  const filtered = Boolean(genre || area);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-8 sm:px-6 sm:pt-12">
      <p className="kicker">{work ? "Work" : "Drink"}</p>
      <h1 className="mt-1 font-display text-3xl text-hive-900 sm:text-4xl">{work ? "働く" : "飲みに行く"}</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-hive-700">
        {work
          ? "お店の公式動画で、雰囲気と先輩の様子を見てから。体入の相談は、お店の公式LINEに直接どうぞ。"
          : "お店の公式動画と、掲示どおりの料金で今夜の一軒を。予約・問い合わせは、お店の公式LINEに直接どうぞ。"}
      </p>
      {work && (
        <p className="mt-3 inline-flex rounded-lg border border-gold-300/50 bg-ink-800 px-3 py-2 text-[12px] font-bold text-gold-600">
          18歳未満（高校生を含む）の方は応募できません
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-gold-200/60 bg-ink-800 p-4">
        <FilterBar path={path} genre={genre} area={area} areas={areas} />
      </div>

      <p className="mt-6 text-[13px] text-hive-500">
        {filtered ? `${[area, genre].filter(Boolean).join("・")}の` : ""}
        {work ? "求人中のお店" : "お店"} <span className="font-bold text-hive-900">{stores.length}</span> 件
      </p>

      {stores.length === 0 ? (
        <div className="mt-3">
          {filtered ? (
            <div className="rounded-2xl border border-dashed border-gold-300/60 px-5 py-10 text-center">
              <p className="font-display text-lg text-hive-900">条件に合うお店がまだありません</p>
              <Link href={path} className="mt-4 inline-flex rounded-full border border-gold-400 px-5 py-2 text-[13px] font-bold text-gold-600 hover:bg-gold-50">
                条件をはずす
              </Link>
            </div>
          ) : (
            <EmptyStores base={base} />
          )}
        </div>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((l) => (
            <StoreCard key={l.id} l={l} base={base} variant={kind} />
          ))}
        </div>
      )}
    </div>
  );
}
