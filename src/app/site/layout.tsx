import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { demoVisible, siteContext } from "@/lib/server/site";
import { SITE_NAME, SITE_SUB } from "@/lib/listing";

/**
 * 公開サイト「Night HATCH -ナイト・ハッチ-」の枠（ログイン不要）。
 * 業務ツールの AppShell（ログイン確認・サイドバー）は通らない。src/app/(app)/layout.tsx 参照。
 */
export async function generateMetadata(): Promise<Metadata> {
  const ctx = await siteContext();
  return {
    metadataBase: new URL(ctx.canonicalBase.replace(/\/site$/, "") + "/"),
    title: { default: `${SITE_NAME} ${SITE_SUB}｜夜のお店の公式動画と求人`, template: `%s｜${SITE_NAME} ${SITE_SUB}` },
    description: "バー・ガールズバー・スナック・キャバクラ・ラウンジ・クラブ・ホストクラブ。夜のお店の公式TikTok動画と、明朗な料金・求人情報をまとめたサイトです。予約・応募は各店舗の公式LINEへ。",
    robots: { index: true, follow: true },
    openGraph: { siteName: `${SITE_NAME} ${SITE_SUB}`, locale: "ja_JP", type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { base } = await siteContext();
  const demo = await demoVisible();
  return (
    <div className="site-root min-h-screen">
      <SiteHeader base={base} />
      {demo && (
        <p className="border-b border-[#25F4EE]/30 bg-[#0b0b10] px-4 py-2 text-center text-[12px] text-white/85">
          <b className="text-[#25F4EE]">社内確認用のデモ表示中</b>
          ：お店は取り込んだ TikTok のお手本アカウントです（掲載店ではありません）。ログインしている人にだけ見えています。
        </p>
      )}
      <main>{children}</main>
      <SiteFooter base={base} />
    </div>
  );
}
