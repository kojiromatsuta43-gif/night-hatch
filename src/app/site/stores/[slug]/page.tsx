import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StoreCover from "@/components/site/StoreCover";
import VideoGrid from "@/components/site/VideoGrid";
import LineCta from "@/components/site/LineCta";
import { currentUser } from "@/lib/server/auth";
import { demoVisible, pageMeta, siteContext } from "@/lib/server/site";
import { isDemoListing, listingBySlug, videosForListing } from "@/lib/server/listings";
import { genreStyle, listingStatus, mapsUrl, splitBenefits, splitPriceLine, type Listing } from "@/lib/listing";

type Params = Promise<{ slug: string }>;

/** デモ表示用: 業態ごとの料金の目安（見本）。実在のお店の料金としては出さない */
const SAMPLE_PRICE: Record<string, [string, string][]> = {
  バー: [["チャージ", "500〜1,000円"], ["カクテル・ウイスキー", "800円〜"], ["サービス料", "なし〜10%"]],
  ガールズバー: [["飲み放題（60分）", "3,000〜4,000円"], ["延長（30分）", "1,500〜2,000円"], ["キャストドリンク", "1,000円〜"], ["TAX", "10〜20%"]],
  スナック: [["セット（60〜90分）", "3,000〜5,000円"], ["ボトルキープ", "5,000円〜"], ["TAX", "10〜20%"]],
  キャバクラ: [["セット料金（60分）", "6,000〜10,000円"], ["延長（30分）", "3,000〜5,000円"], ["指名料", "2,000〜3,000円"], ["場内指名", "1,000〜2,000円"], ["TAX・サービス料", "20〜35%"]],
  ラウンジ: [["セット料金", "10,000〜20,000円"], ["指名料", "2,000〜5,000円"], ["TAX・サービス料", "20〜30%"]],
  クラブ: [["お一人さま（目安）", "30,000円〜"], ["TAX・サービス料", "30%前後"]],
  ホストクラブ: [["初回（60〜90分）", "1,000〜5,000円"], ["指名料", "2,000〜5,000円"], ["TAX・サービス料", "20〜40%"]],
};

async function load(slug: string): Promise<{ l: Listing; preview: boolean; demo: boolean } | null> {
  const user = await currentUser().catch(() => null);
  const l = listingBySlug(slug, user ? { userId: user.id, role: user.role } : undefined, await demoVisible());
  if (!l) return null;
  const demo = isDemoListing(l);
  return { l, preview: !demo && listingStatus(l) !== "live", demo };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await siteContext();
  const r = await load(slug);
  if (!r) return { title: "お店が見つかりません", robots: { index: false } };
  const { l, preview } = r;
  const meta = pageMeta(ctx, {
    path: `/stores/${l.slug}`,
    title: `${l.store_name}（${l.area}・${l.genre}）`,
    description: (l.catch_copy || l.description || `${l.area}の${l.genre}「${l.store_name}」の公式動画・料金・求人`).replace(/\s+/g, " ").slice(0, 120),
    image: l.photos[0] ? `/api/site/photos/${l.photos[0]}` : null,
    type: "article",
  });
  return preview || r.demo ? { ...meta, robots: { index: false, follow: false } } : meta;
}

/** お店のページ。上から「動画 → お店の情報・料金 → 求人（#work）」。予約も応募もお店の公式LINEへ */
export default async function StorePage({ params }: { params: Params }) {
  const { slug } = await params;
  const { base } = await siteContext();
  const r = await load(slug);
  if (!r) notFound();
  const { l, preview, demo } = r;
  const tiktokUrl = `https://www.tiktok.com/${l.tiktok_handle}`;
  const videos = videosForListing(l);
  const prices = l.price_system.split("\n").map((s) => s.trim()).filter(Boolean).map(splitPriceLine);
  const benefits = splitBenefits(l.recruit_benefits);
  const g = genreStyle(l.genre);
  const hasLine = /^https:\/\//.test(l.line_url);

  return (
    <article className="pb-28 sm:pb-12">
      {preview && (
        <p className="bg-night-500 px-4 py-2 text-center text-[13px] font-bold text-white">
          プレビュー中です（まだ公開されていません。お店の方と運営だけが見られます）
        </p>
      )}

      {/* ── 表紙 ── */}
      <header className="relative">
        {demo && l.photos[0]?.startsWith("thumb:") ? (
          // デモ（TikTokのお手本アカウント）: 縦長のサムネイルを横に引き伸ばさず、縦のまま並べる
          <div className="relative h-[260px] overflow-hidden sm:h-[380px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/site/thumbs/${l.photos[0].slice(6)}`} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" aria-hidden="true" />
            <div className="absolute inset-0 flex items-start justify-center gap-2 px-4 pt-4 sm:justify-end sm:gap-3 sm:px-10 sm:pt-6">
              {videos
                .filter((v) => v.thumb)
                .slice(0, 4)
                .map((v, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={v.key} src={v.thumb!} alt="" className={`aspect-[9/16] h-[150px] rounded-xl border border-white/15 object-cover shadow-2xl sm:h-[250px] ${i >= 2 ? "hidden sm:block" : ""}`} />
                ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0C17] via-[#0F0C17]/55 to-transparent" aria-hidden="true" />
          </div>
        ) : (
          <div className="relative h-[240px] overflow-hidden sm:h-[360px]">
            <StoreCover photo={l.photos[0]} genre={l.genre} alt={l.store_name} eager big />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0C17] via-[#0F0C17]/40 to-transparent" aria-hidden="true" />
          </div>
        )}
        <div className="relative mx-auto -mt-24 max-w-4xl px-4 sm:-mt-28 sm:px-6">
          <nav className="text-[12px] text-hive-500" aria-label="現在地">
            <Link href={`${base}/drink?genre=${encodeURIComponent(l.genre)}`} className="hover:text-gold-600">{l.genre}</Link>
            <span className="mx-1.5">/</span>
            <Link href={`${base}/drink?area=${encodeURIComponent(l.area)}`} className="hover:text-gold-600">{l.area}</Link>
          </nav>
          <p className="kicker mt-2">{g.en}</p>
          <h1 className="mt-1 font-display text-[30px] leading-tight text-hive-900 sm:text-5xl">{l.store_name}</h1>
          {l.catch_copy && <p className="mt-2 text-[15px] text-hive-700 sm:text-lg">{l.catch_copy}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {demo && (
              <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-[14px] font-bold text-white ring-1 ring-white/20 hover:bg-[#161616]">
                TikTokで {l.tiktok_handle} を見る ↗
              </a>
            )}
            {hasLine && (
              <LineCta slug={l.slug} kind="drink" href={l.line_url} track={!preview}>
                公式LINEで予約・問い合わせ
              </LineCta>
            )}
            {l.recruit_hiring ? (
              <a href="#work" className="inline-flex items-center rounded-full border border-gold-400 px-5 py-3 text-[14px] font-bold text-gold-600 hover:bg-gold-50">
                求人・体入を見る ↓
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto mt-10 max-w-4xl space-y-12 px-4 sm:px-6">
        {/* ── 動画 ── */}
        <section aria-labelledby="v-h">
          <p className="kicker">Official TikTok</p>
          <h2 id="v-h" className="mt-1 text-2xl text-hive-900">お店の動画</h2>
          {videos.length > 0 ? (
            <div className="mt-4">
              <VideoGrid videos={videos} />
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-gold-300/50 px-5 py-6 text-[13px] text-hive-500">動画はただいま準備中です。</p>
          )}
        </section>

        {/* ── 写真 ── */}
        {l.photos.length > 1 && (
          <section aria-label="お店の写真">
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
              {l.photos.slice(1).map((p) => (
                <div key={p} className="relative aspect-[4/3] w-[78%] shrink-0 snap-start overflow-hidden rounded-xl border border-gold-200/50 sm:w-auto">
                  <StoreCover photo={p} genre={l.genre} alt={`${l.store_name}の店内`} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── お店のこと ── */}
        {l.description && (
          <section aria-labelledby="d-h">
            <p className="kicker">About</p>
            <h2 id="d-h" className="mt-1 text-2xl text-hive-900">お店のこと</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-loose text-hive-800">{l.description}</p>
          </section>
        )}

        {/* ── 料金システム（デモ: 業態ごとの相場の見本。このお店の料金ではない） ── */}
        {demo && prices.length === 0 && SAMPLE_PRICE[l.genre] && (
          <section aria-labelledby="ps-h" className="rounded-2xl border border-dashed border-gold-300/60 bg-ink-800 p-5 sm:p-7">
            <p className="kicker">Price System</p>
            <h2 id="ps-h" className="mt-1 flex flex-wrap items-center gap-2 text-2xl text-hive-900">
              料金システム
              <span className="rounded-full bg-[#25F4EE] px-2.5 py-0.5 text-[11px] font-black text-black">見本</span>
            </h2>
            <dl className="mt-4 space-y-2.5">
              {SAMPLE_PRICE[l.genre].map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2 text-[15px]">
                  <dt className="max-w-[55%] shrink-0 text-hive-800">{k}</dt>
                  <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-gold-300/50" aria-hidden="true" />
                  <dd className="min-w-0 max-w-[60%] break-words text-right font-bold text-hive-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12px] text-hive-500">社内確認用の見本です。{l.genre}の一般的な料金の目安で、このお店の料金ではありません。掲載店は、お店が入力した実際の料金がここに出ます。</p>
          </section>
        )}

        {/* ── 料金システム ── */}
        {prices.length > 0 && (
          <section aria-labelledby="p-h" className="rounded-2xl border border-gold-300/60 bg-ink-800 p-5 sm:p-7">
            <p className="kicker">Price System</p>
            <h2 id="p-h" className="mt-1 text-2xl text-hive-900">料金システム</h2>
            <dl className="mt-4 space-y-2.5">
              {prices.map((p, i) =>
                p.value ? (
                  <div key={i} className="flex items-baseline gap-2 text-[15px]">
                    <dt className="max-w-[55%] shrink-0 text-hive-800">{p.label}</dt>
                    <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-gold-300/50" aria-hidden="true" />
                    <dd className="min-w-0 max-w-[60%] break-words text-right font-bold text-hive-900">{p.value}</dd>
                  </div>
                ) : (
                  <p key={i} className="text-[13px] text-hive-500">{p.label}</p>
                )
              )}
            </dl>
            <p className="mt-4 text-[12px] text-hive-500">料金はお店が掲示している内容です。ご来店前にお店の公式LINEでもご確認ください。</p>
          </section>
        )}

        {/* ── 店舗情報 ── */}
        <section aria-labelledby="i-h">
          <p className="kicker">Information</p>
          <h2 id="i-h" className="mt-1 text-2xl text-hive-900">店舗情報</h2>
          <dl className="mt-4 divide-y divide-gold-200/40 border-y border-gold-200/40 text-[14px]">
            {[
              ["業態", l.genre],
              ["エリア", [l.prefecture, l.area].filter(Boolean).join(" ")],
              ["アクセス", l.access],
              ["住所", l.address],
              ["営業時間", l.hours],
              ["定休日", l.holidays],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[88px_1fr] gap-3 py-3 sm:grid-cols-[120px_1fr]">
                  <dt className="font-bold text-hive-500">{k}</dt>
                  <dd className="whitespace-pre-line text-hive-900">{v}</dd>
                </div>
              ))}
          </dl>
          <a href={mapsUrl(l)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-[13px] font-bold text-gold-600 hover:underline">
            Googleマップで開く ↗
          </a>
        </section>

        {/* ── 求人 ── */}
        {l.recruit_hiring ? (
          <section id="work" aria-labelledby="w-h" className="scroll-mt-20 rounded-2xl border border-gold-400/60 bg-[linear-gradient(160deg,#2A2016_0%,#1A1524_60%)] p-5 sm:p-7">
            <p className="kicker">Recruit</p>
            <h2 id="w-h" className="mt-1 text-2xl text-hive-900">求人・体入</h2>
            {(l.recruit_trial_wage || l.recruit_wage) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {l.recruit_trial_wage && <span className="rounded-lg bg-night-500 px-3 py-1.5 text-[15px] font-bold text-white">{l.recruit_trial_wage}</span>}
                {l.recruit_wage && <span className="rounded-lg border border-gold-400 px-3 py-1.5 text-[15px] font-bold text-gold-600">{l.recruit_wage}</span>}
              </div>
            )}
            {l.recruit_hours && (
              <p className="mt-3 text-[14px] text-hive-800">
                <span className="mr-2 font-bold text-hive-500">勤務</span>
                {l.recruit_hours}
              </p>
            )}
            {benefits.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {benefits.map((b) => (
                  <li key={b} className="rounded-full border border-gold-300/60 px-3 py-1 text-[12px] font-bold text-gold-600">{b}</li>
                ))}
              </ul>
            )}
            {l.recruit_message && <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-hive-800">{l.recruit_message}</p>}
            {demo && <p className="mt-3 text-[14px] text-hive-800">プロフィールに「募集」の記載があるお店です。条件はお店の公式アカウントでご確認ください。</p>}
            <p className="mt-4 text-[12px] font-bold text-hive-500">18歳未満（高校生を含む）の方は応募できません。</p>
            {hasLine && (
              <LineCta slug={l.slug} kind="work" href={l.line_url} track={!preview} className="mt-4 w-full sm:w-auto">
                公式LINEで体入・応募の相談をする
              </LineCta>
            )}
            <p className="mt-2 text-[11px] text-hive-500">このサイトでは応募の受付や個人情報のお預かりはしていません。やりとりはお店と直接になります。</p>
          </section>
        ) : null}

        <p className="text-[12px] text-hive-500">
          掲載内容はお店が入力したものです。誤りを見つけた場合は
          <Link href={`${base}/for-stores`} className="mx-1 text-gold-600 hover:underline">こちら</Link>
          からお知らせください。
        </p>
      </div>

      {/* ── スマホ: 下に固定の LINE ボタン ── */}
      {hasLine && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gold-200/40 bg-[#0F0C17]/95 p-3 backdrop-blur sm:hidden">
          <div className="flex gap-2">
            <LineCta slug={l.slug} kind="drink" href={l.line_url} track={!preview} className="flex-1 !px-3 !text-[13px]">
              予約・問い合わせ
            </LineCta>
            {l.recruit_hiring ? (
              <LineCta slug={l.slug} kind="work" href={l.line_url} track={!preview} variant="outline" className="flex-1 !px-3 !text-[13px]">
                体入の相談
              </LineCta>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}
