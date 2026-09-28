import Link from "next/link";
import type { Metadata } from "next";
import BeeLogo from "@/components/BeeLogo";
import { pageMeta, siteContext } from "@/lib/server/site";
import { SITE_CONTACT_URL, SITE_NAME, SITE_OPERATOR, SITE_SUB } from "@/lib/listing";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await siteContext();
  return pageMeta(ctx, {
    path: "/for-stores",
    title: "掲載をご希望の店舗さまへ",
    description: `${SITE_NAME} ${SITE_SUB}への掲載のご案内。NIGHT HATCH をご契約のお店は無料で掲載でき、TikTok動画は自動で更新されます。`,
  });
}

const STEPS = [
  { t: "NIGHT HATCH で入力", d: "ツールの「HPの掲載」に、店名・料金システム・求人・公式LINEのURLを入れます。写真は6枚まで。" },
  { t: "掲載に同意", d: "チェック1つで同意。出演しているキャスト・スタッフ本人の同意は、お店で取ってください。" },
  { t: "運営が確認して公開", d: "許可・届出と、料金・求人の書き方を確認してから公開します。" },
  { t: "動画は自動で更新", d: "お店の TikTok アカウントを入れておけば、新しい動画が週1回自動で並びます。" },
];

const RULES = [
  "風営法の許可・深夜酒類提供飲食店の届出など、必要な許可・届出を受けているお店に限ります",
  "18歳未満（高校生を含む）の出演・採用に関わる内容は掲載しません",
  "料金は実際の内容どおりに掲示してください（「〜円ポッキリ」など誤解を招く表示は不可）",
  "性的な表現や露出を売りにした写真・動画、恋愛感情をあおる文面は掲載しません",
  "このサイトは応募や個人情報を預かりません。予約・応募は各店舗の公式LINEで直接やりとりします",
];

export default async function ForStores() {
  const { base, appBase } = await siteContext();
  const contactReady = !SITE_CONTACT_URL.startsWith("[");
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <p className="kicker">For Stores</p>
      <h1 className="mt-1 font-display text-3xl text-hive-900 sm:text-4xl">掲載をご希望の店舗さまへ</h1>
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-gold-300/60 bg-ink-800 p-5 sm:p-6">
        <BeeLogo className="h-20 w-20 shrink-0 animate-bee-float" />
        <p className="text-[14px] leading-relaxed text-hive-800 sm:text-[15px]">
          {SITE_NAME} は、TikTok動画の制作ツール <b className="text-gold-600">NIGHT HATCH</b> をご契約のお店を紹介するサイトです。
          <br />
          <b>掲載は無料</b>。つくった動画がそのまま「お店の顔」になり、予約も体入の相談も、お店の公式LINEに直接つながります。
        </p>
      </div>

      <section className="mt-10" aria-labelledby="s-h">
        <h2 id="s-h" className="text-2xl text-hive-900">掲載までの流れ</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-gold-200/60 bg-ink-800 p-5">
              <span className="font-latin text-2xl text-gold-500">0{i + 1}</span>
              <p className="mt-1 font-display text-lg text-hive-900">{s.t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-hive-700">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10" aria-labelledby="r-h">
        <h2 id="r-h" className="text-2xl text-hive-900">掲載のきまり</h2>
        <ul className="mt-4 space-y-2">
          {RULES.map((r) => (
            <li key={r} className="flex gap-2 text-[14px] leading-relaxed text-hive-800">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 flex flex-wrap gap-3">
        {appBase !== null && (
          <Link href={`${appBase}/listing`} className="rounded-full bg-night-500 px-6 py-3 text-[14px] font-bold text-white hover:bg-night-600">
            ご契約中のお店: 掲載情報を入力する →
          </Link>
        )}
        {contactReady && (
          <a href={SITE_CONTACT_URL} className="rounded-full border border-gold-400 px-6 py-3 text-[14px] font-bold text-gold-600 hover:bg-gold-50">
            NIGHT HATCH について問い合わせる
          </a>
        )}
        <Link href={base || "/"} className="rounded-full px-4 py-3 text-[14px] font-bold text-hive-500 hover:text-gold-600">
          トップへ戻る
        </Link>
      </section>
      <p className="mt-8 text-[12px] text-hive-500">運営: {SITE_OPERATOR}</p>
    </div>
  );
}
