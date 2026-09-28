import type { Metadata } from "next";
import StoreList from "@/components/site/StoreList";
import { demoVisible, pageMeta, siteContext } from "@/lib/server/site";
import { publicAreas, publicListings } from "@/lib/server/listings";
import { GENRES } from "@/lib/listing";

type Search = Promise<{ genre?: string | string[]; area?: string | string[] }>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const ctx = await siteContext();
  const sp = await searchParams;
  const label = [one(sp.area), GENRES.includes(one(sp.genre)) ? one(sp.genre) : ""].filter(Boolean).join("の");
  return pageMeta(ctx, { path: "/drink", title: label ? `${label}｜飲みに行く` : "飲みに行く", description: "夜のお店を、公式TikTok動画と掲示どおりの料金でさがす。予約はお店の公式LINEへ直接。" });
}

export default async function Page({ searchParams }: { searchParams: Search }) {
  const { base } = await siteContext();
  const sp = await searchParams;
  const genre = GENRES.includes(one(sp.genre)) ? one(sp.genre) : "";
  const area = one(sp.area).slice(0, 40);
  const demo = await demoVisible();
  const stores = publicListings({ demo, genre, area });
  return <StoreList kind="drink" base={base} stores={stores} areas={publicAreas(demo)} genre={genre} area={area} />;
}
