import type { Metadata } from "next";
import NightMap from "@/components/site/NightMap";
import { demoVisible, pageMeta, siteContext } from "@/lib/server/site";
import { areaStats } from "@/lib/server/listings";
import { REGIONS } from "@/lib/nightAreas";

type Search = Promise<{ for?: string | string[]; r?: string | string[] }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await siteContext();
  return pageMeta(ctx, { path: "/map", title: "地域から選ぶ", description: "夜の日本地図から、エリアを選んでお店をさがす。歌舞伎町・六本木・銀座・北新地・中洲・すすきの…" });
}

/** 「地域から選ぶ」: 夜の日本地図 → 地域 → 東京都心、とファーっと寄ってエリアを選ぶ */
export default async function MapPage({ searchParams }: { searchParams: Search }) {
  const { base } = await siteContext();
  const sp = await searchParams;
  const demo = await demoVisible();
  const mode = one(sp.for) === "work" ? "work" : "drink";
  const r = one(sp.r);
  const initialView = REGIONS.some((x) => x.id === r) ? (r as (typeof REGIONS)[number]["id"]) : "japan";
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
      <p className="kicker">Area Map</p>
      <h1 className="mt-1 font-display text-3xl text-hive-900 sm:text-4xl">地域から選ぶ</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-hive-700">光っているところほど、お店が多い街です。押すとその地域に寄って、エリアごとのお店が見られます。</p>
      <div className="mt-6">
        <NightMap stats={areaStats(demo)} base={base} initialMode={mode} initialView={initialView} />
      </div>
    </div>
  );
}
