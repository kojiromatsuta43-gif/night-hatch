"use client";

import { PlatformRow } from "@/components/PlatformIcons";
import BeeGirl from "@/components/BeeGirl";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mascot, PointInline, PointMark, useMascot } from "@/components/MascotProvider";
import { useMe } from "@/components/AppShell";
import { api } from "@/lib/client";
import { BRAND, catalogGroups, type CatalogItem } from "@/lib/brand";
import { retryImage, iconUrl } from "@/lib/client-img";
import Illust, { GROUP_ILLUST } from "@/components/Illust";
import { seasonalPick } from "@/lib/seasonal";

type RefAccount = { id: string; name: string; handle: string; icon_url: string; followers: number };

function Avatar({ a, size = "h-11 w-11" }: { a: RefAccount; size?: string }) {
  if (a.icon_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl(a.id)} alt={a.name} title={a.name} onError={retryImage} className={`${size} rounded-full border-2 border-ink-800 object-cover shadow-sm`} />;
  }
  return (
    <span
      title={a.name}
      className={`flex ${size} items-center justify-center rounded-full border-2 border-ink-800 text-sm font-bold text-white shadow-sm`}
      style={{ background: `linear-gradient(135deg, hsl(${a.followers % 360}, 60%, 55%), hsl(${(a.followers % 360) + 40}, 60%, 40%))` }}
    >
      {a.name[0]}
    </span>
  );
}

/** 困りごとタイルの上の細い帯。採用と集客（2本柱）はワイン、その他はシャンパンゴールドの濃淡で */
const GROUP_TONES: Record<string, { band: string; label: string; ring: string }> = {
  "キャスト採用": { band: "bg-night-500", label: "text-night-700", ring: "group-hover:border-night-400" },
  "集客・指名": { band: "bg-night-500", label: "text-night-700", ring: "group-hover:border-night-400" },
  "SNS・動画": { band: "bg-gold-500", label: "text-gold-500", ring: "group-hover:border-gold-400" },
  "イベント・売上": { band: "bg-gold-500", label: "text-gold-500", ring: "group-hover:border-gold-400" },
  "営業": { band: "bg-gold-300", label: "text-gold-500", ring: "group-hover:border-gold-400" },
  "運営": { band: "bg-gold-300", label: "text-gold-500", ring: "group-hover:border-gold-400" },
};

/**
 * 店舗向けの発注トップ（NIGHT HATCH）。
 * 「困りごと」6つから選ぶだけ。採用と集客を同じ重さで先頭に並べる。メニューの一覧は次の画面で、そのグループの分だけ見せる。
 */
function SimpleOrderTop() {
  const { me } = useMe();
  const { mascot } = useMascot();
  return (
    <div className="max-w-4xl">
      {/* あいさつ: ハッチくんと吹き出し */}
      <div className="mb-8 flex items-end gap-4">
        <Mascot className="h-20 w-20 shrink-0 animate-bee-float" />
        <div className="relative flex-1 rounded-2xl border border-gold-200 bg-white px-5 py-4 shadow-sm">
          <span className="absolute -left-2 bottom-5 h-4 w-4 rotate-45 border-b border-l border-gold-200 bg-white" aria-hidden="true" />
          <p className="font-display text-lg text-hive-900">おはようございます、{me?.name ?? "ゲスト"}さん。今夜はお店の何を良くしますか？</p>
          <p className="mt-1.5 text-xs text-hive-500">
            いまの残高は <Link href="/points" className="font-bold text-honey-700 hover:underline">{me?.points ?? 0}<PointInline /></Link>。
            定価は 1<PointInline />＝1,200円（税別）、スタンダード以上の月額プランなら実質1,000円です。
          </p>
        </div>
      </div>

      {/* 今月のおすすめ */}
      {(() => {
        const pick = seasonalPick(new Date().getMonth() + 1);
        return (
          <Link href={`/order/menu?group=${encodeURIComponent(pick.group)}`} className="group mb-8 flex items-center gap-4 rounded-2xl border border-gold-300 bg-gold-50 px-5 py-4 shadow-sm transition-colors hover:bg-gold-100">
            <Illust name="mirrorball" className="h-14 w-14 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="text-[11px] font-black tracking-widest text-gold-500">今月のおすすめ・{pick.group}</span>
              <span className="mt-0.5 block font-display text-lg leading-snug text-hive-900">{pick.title}</span>
              <span className="mt-1 block text-xs text-hive-500">{pick.body}</span>
            </span>
            <span className="hidden shrink-0 rounded-full bg-night-500 px-4 py-2 text-sm font-bold text-white group-hover:bg-night-600 sm:block">{pick.cta} →</span>
          </Link>
        );
      })()}

      <div className="mb-1 flex items-baseline gap-3">
        <h1 className="text-2xl text-hive-900">メニュー</h1>
        <span className="font-latin text-xs text-gold-500">MENU</span>
      </div>
      <p className="page-sub mb-5">いちばん近い困りごとを押すと、頼めるメニューと値段が出ます。迷ったら下の「ハッチに相談」へ。</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BRAND.groups.map((g, i) => {
          const tone = GROUP_TONES[g.name] ?? GROUP_TONES["運営"];
          return (
            <Link
              key={g.name}
              href={`/order/menu?group=${encodeURIComponent(g.name)}`}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gold-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${tone.ring}`}
            >
              <span className={`h-1.5 w-full ${tone.band}`} aria-hidden="true" />
              <span className="flex flex-1 flex-col p-5">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className={`text-[11px] font-black tracking-widest ${tone.label}`}>{String(i + 1).padStart(2, "0")}　{g.name}</span>
                    <span className="mt-1.5 block font-display text-lg leading-snug text-hive-900 [word-break:auto-phrase] lg:text-xl">{g.sub}</span>
                  </span>
                  <Illust name={GROUP_ILLUST[g.name] ?? "glass"} className="h-16 w-16 shrink-0 transition-transform group-hover:-rotate-3 group-hover:scale-105 sm:h-20 sm:w-20" />
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {g.examples.map((e) => (
                    <span key={e} className="rounded-full border border-gold-200 px-2.5 py-1 text-[11px] font-bold text-hive-700">{e}</span>
                  ))}
                </span>
                <span className="mt-auto pt-4 text-right text-sm font-bold text-gold-500 group-hover:underline">メニューと値段を見る →</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/order/reference" className="group flex items-center gap-4 rounded-2xl bg-night-500 px-6 py-5 text-white shadow-sm transition-colors hover:bg-night-600">
          <span className="hex flex h-12 w-12 shrink-0 items-center justify-center bg-honey-400 text-xl text-ink-900" aria-hidden="true">▶</span>
          <span>
            <span className="block font-display text-lg">伸びている夜のお店の動画をまねる</span>
            <span className="mt-1 block text-xs text-white/80">お手本の動画を選ぶと、台本と動画編集の発注にそのまま進めます</span>
          </span>
        </Link>
        <Link href="/agent" className="group flex items-center gap-4 rounded-2xl border border-gold-200 bg-white px-6 py-5 shadow-sm transition-colors hover:bg-night-50">
          <Mascot className="h-12 w-12 shrink-0" />
          <span>
            <span className="block font-display text-lg text-hive-900">{mascot.consult}</span>
            <span className="mt-1 block text-xs text-hive-500">「求人原稿を作りたい」「イベントの告知を考えたい」など、話しかけるだけで整理します</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

export default function OrderTopPage() {
  if (BRAND.orderStyle === "simple") return <SimpleOrderTop />;
  return <FullOrderTop />;
}

/** 六角形のタイル1枚。動画まわりは黄、それ以外は白。黒3pxの縁は、外側の黒い六角形の上に少し小さい六角形を重ねて作る */
function HexTile({ item, style }: { item: CatalogItem; style?: React.CSSProperties }) {
  const tone = toneFor(item);
  return (
    <Link
      href={`/order/create?category=${encodeURIComponent(item.name)}`}
      title={`${item.size}／目安 ${item.days}`}
      className="hex-p group absolute block bg-ink-600 transition-transform hover:-translate-y-1"
      style={{ width: HEX_W, height: HEX_H, ...style }}
    >
      <span
        className={`hex-p absolute inset-[3px] flex flex-col items-center justify-center gap-1 px-3 text-center ${
          tone.bg
        }`}
      >
        <span className="text-xs font-bold leading-tight text-hive-900">{item.name}</span>
        <span className={`text-[9px] leading-tight ${tone.sub}`}>{item.size}</span>
        <span className="mt-0.5 flex h-5 items-center text-hive-900 [&_span]:gap-2"><PlatformRow category={item.name} className="h-5 w-5" /></span>
        <span className={`text-lg font-black leading-none ${tone.pt}`}>
          {item.points}
          {item.quantity ? "〜" : ""}
          <PointInline />
          {item.monthly && <span className="text-[9px] font-bold">/月</span>}
        </span>
      </span>
    </Link>
  );
}

/**
 * 巣の並び順。TikTok・動画まわりを先頭の行に、以降は似たもの同士でまとめる。
 * 1行目: 動画（メインサービスの2つは上の大セルに出すので巣には出さない）
 * 2行目: SNS・発信系　3行目: Web・紙・求人原稿　4行目: 営業の3ステップ
 */
/** メインサービス。巣ではなく、上の大きなセルで見せる */
const FEATURED = ["ショート動画編集", "台本作成（ショート）"];

const HIVE_ORDER = [
  "動画編集（3分）", "台本作成（長尺）", "サムネイル作成",
  "カルーセル投稿", "投稿文＋画像", "LINE公式アカウント構築", "SEO記事作成", "ポータル掲載文リライト", "軽微な修正",
  "HP制作（1ページ）", "HP保守・更新（月額）", "LPファーストビュー", "チラシ（A4片面）",
  "テレアポ台本作成", "営業リスト作成", "テレアポ架電",
  "求人原稿作成", "求人媒体の掲載文リライト",
];

/**
 * タイルの背景色。かたまりごとに色を変えて、巣を見ただけで種類が分かるように。
 *   動画（TikTokメイン）= はちみつ色 / SNS発信 = 白 / HP・LP・紙 = 空色 / 営業 = 若草 / 採用 = 藤色
 */
const TONE_WEB = ["HP制作（1ページ）", "HP保守・更新（月額）", "LPファーストビュー", "チラシ（A4片面）"];
type Tone = { bg: string; sub: string; pt: string };
function toneFor(item: CatalogItem): Tone {
  if (item.group === "動画まわり") {
    return { bg: "bg-night-500 group-hover:bg-night-600", sub: "text-white/80", pt: "text-white" };
  }
  if (item.group === "採用まわり") {
    return { bg: "bg-indigo-100 group-hover:bg-indigo-50", sub: "text-hive-500", pt: "text-indigo-700" };
  }
  if (item.group === "営業まわり") {
    return { bg: "bg-emerald-100 group-hover:bg-emerald-50", sub: "text-hive-500", pt: "text-emerald-700" };
  }
  if (TONE_WEB.includes(item.name)) {
    return { bg: "bg-sky-100 group-hover:bg-sky-50", sub: "text-hive-500", pt: "text-sky-700" };
  }
  return { bg: "bg-white group-hover:bg-night-50", sub: "text-hive-500", pt: "text-night-700" };
}
function sortForHive(items: CatalogItem[]): CatalogItem[] {
  const rank = (n: string) => {
    const i = HIVE_ORDER.indexOf(n);
    return i === -1 ? 999 : i; // 新メニューを足し忘れても最後に出る
  };
  return items.filter((it) => !FEATURED.includes(it.name)).sort((a, b) => rank(a.name) - rank(b.name));
}

/** メインサービスの大きなセル */
function FeaturedHex({ item }: { item: CatalogItem }) {
  const W = 170;
  const H = Math.round(W * 1.155);
  return (
    <Link
      href={`/order/create?category=${encodeURIComponent(item.name)}`}
      title={`${item.size}／目安 ${item.days}`}
      className="hex-p group relative block bg-ink-600 transition-transform hover:-translate-y-1"
      style={{ width: W, height: H }}
    >
      <span className="hex-p absolute inset-[4px] flex flex-col items-center justify-center gap-1.5 bg-night-500 px-4 text-center group-hover:bg-night-600">
        <span className="text-[10px] font-black tracking-widest text-hive-900/60">メインサービス</span>
        <span className="whitespace-nowrap text-[13px] font-black leading-tight text-hive-900">{item.name}</span>
        <span className="text-[10px] leading-tight text-hive-900/70">{item.size}</span>
        <span className="flex h-6 items-center text-hive-900 [&_span]:gap-2"><PlatformRow category={item.name} className="h-6 w-6" /></span>
        <span className="text-2xl font-black leading-none text-hive-900">
          {item.points}
          <PointMark className="ml-1 h-6 w-6" />
        </span>
      </span>
    </Link>
  );
}

/** スマホ用: 六角形の巣は横に長すぎるので、2列のカードで見せる（色とアイコンは巣と同じ） */
function MenuCardList({ items }: { items: CatalogItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((item) => {
        const tone = toneFor(item);
        return (
          <Link
            key={item.name}
            href={`/order/create?category=${encodeURIComponent(item.name)}`}
            className={`flex flex-col gap-1 rounded-xl border border-night-200 px-3 py-3 ${tone.bg.split(" ")[0]}`}
          >
            <span className="flex h-5 items-center text-hive-900 [&_span]:gap-1.5"><PlatformRow category={item.name} className="h-5 w-5" /></span>
            <span className="text-[13px] font-bold leading-tight text-hive-900">{item.name}</span>
            <span className={`text-[10px] leading-tight ${tone.sub}`}>{item.size}</span>
            <span className={`mt-auto pt-1 text-lg font-black leading-none ${tone.pt}`}>
              {item.points}
              {item.quantity ? "〜" : ""}
              <PointInline />
              {item.monthly && <span className="text-[10px] font-bold">/月</span>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// 六角形の巣（頂点が上）。横に6枚を隙間なく並べ、次の列は半枚ずらして 3/4 の高さに重ねる
const HEX_W = 150;
const HEX_H = Math.round(HEX_W * 1.155);
const GAP = 4;

function HexHive({ items }: { items: CatalogItem[] }) {
  // 画面が広いほど1行に多く並べて、縦のスクロールを減らす
  const [perRow, setPerRow] = useState(6);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerRow(w >= 1700 ? 8 : w >= 1450 ? 7 : 6);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const rows = Math.ceil(items.length / perRow);
  const height = HEX_H + (rows - 1) * HEX_H * 0.75 + 8;
  const width = perRow * (HEX_W + GAP) + (rows > 1 ? (HEX_W + GAP) / 2 : 0);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative" style={{ width, height }}>
        {items.map((it, i) => {
          const r = Math.floor(i / perRow);
          const c = i % perRow;
          const x = (r % 2) * ((HEX_W + GAP) / 2) + c * (HEX_W + GAP);
          const y = r * HEX_H * 0.75;
          return <HexTile key={it.name} item={it} style={{ left: x, top: y }} />;
        })}
      </div>
    </div>
  );
}

function FullOrderTop() {
  const { me } = useMe();
  const { mascot } = useMascot();
  const [accounts, setAccounts] = useState<RefAccount[]>([]);

  useEffect(() => {
    api<RefAccount[]>("/api/ref-accounts").then(setAccounts).catch(() => {});
  }, []);

  const strip = accounts.slice(0, 6);
  const rest = Math.max(0, accounts.length - strip.length);
  const groups = catalogGroups();

  return (
    <div className="space-y-3">
      {/* ハッチのひとこと ＋ いちばん人気の入口 */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-night-200 bg-white px-5 py-2.5">
          <span className="flex shrink-0 flex-col items-center">
            <Mascot className="h-10 w-10 animate-bee-float" />
            <span className="-mt-0.5 text-[10px] font-bold tracking-wider text-hive-500">ハッチくん</span>
          </span>
          <div className="min-w-0">
            <p className="text-lg font-black text-hive-900">こんにちは、{me?.name ?? "ゲスト"}さん。今日は何をつくる？</p>
            <p className="mt-0.5 text-xs text-hive-500 sm:text-sm">
              下の巣から選ぶか、右の「お手本」から始めてください。迷ったら{mascot.consult}でもOK。
            </p>
          </div>
          <Link
            href="/agent"
            className="ml-auto hidden h-10 shrink-0 items-center bg-ink-600 px-5 text-sm font-black text-honey-300 transition-colors hover:bg-ink-700 sm:flex"
          >
            迷ったら{mascot.consult} →
          </Link>
          {/* 右の余白: ハッチ嬢（ここだけ） */}
          <span className="hidden shrink-0 flex-col items-center lg:flex" title="ハッチ嬢">
            <BeeGirl className="h-10 w-10 animate-bee-float [animation-delay:0.6s]" />
            <span className="-mt-0.5 text-[10px] font-bold tracking-wider text-hive-500">ハッチ嬢</span>
          </span>
        </div>
        <Link href="/order/reference" className="group flex flex-col justify-center gap-1 rounded-2xl border border-night-200 bg-night-500 px-5 py-2.5 transition-colors hover:bg-night-600">
          <span className="text-[10px] font-bold tracking-widest text-hive-900">いちばん人気</span>
          <span className="text-[15px] font-black leading-snug text-hive-900">「このアカウントみたいに作りたい」から始める</span>
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {strip.map((a) => <Avatar key={a.id} a={a} size="h-7 w-7" />)}
              {rest > 0 && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink-800 bg-ink-600 text-[10px] font-bold text-white">+{rest}</span>
              )}
            </span>
            <span className="text-[10px] font-bold text-hive-900/70">業種べつのお手本</span>
          </span>
          <span className="mt-0.5 flex h-8 items-center justify-center bg-ink-600 text-sm font-black text-honey-300 transition-transform group-hover:scale-[1.01]">お手本を探す →</span>
        </Link>
      </div>

      {/* メインサービス: ショート動画編集と台本作成 */}
      <section>
        <div className="mb-1 flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-black text-hive-900">メインサービス</h2>
          <span className="text-xs text-hive-500">TikTok・リール・ショートの台本と編集。セットで1本20<PointInline /></span>
        </div>
        <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
          {groups.flatMap((g) => g.items).filter((it) => FEATURED.includes(it.name)).map((it) => (
            <FeaturedHex key={it.name} item={it} />
          ))}
        </div>
      </section>

      {/* 巣：メニュー */}
      <section>
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-black text-hive-900">巣から選ぶ</h2>
          <span className="text-xs text-hive-500">はちみつ色=動画（TikTokメイン）・空色=HP/LP・若草=営業・藤色=採用。定価 1🍯＝1,200円（税別）</span>
        </div>
        <div className="hidden md:block">
          <HexHive items={sortForHive(groups.flatMap((g) => g.items))} />
        </div>
        <div className="md:hidden">
          <MenuCardList items={sortForHive(groups.flatMap((g) => g.items))} />
        </div>

      </section>

    </div>
  );
}
