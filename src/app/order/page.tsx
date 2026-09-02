"use client";

import { PlatformRow } from "@/components/PlatformIcons";
import BeeGirl from "@/components/BeeGirl";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mascot, PointInline, useMascot } from "@/components/MascotProvider";
import { useMe } from "@/components/AppShell";
import { api } from "@/lib/client";
import { BRAND, catalogGroups, type CatalogItem } from "@/lib/brand";
import { retryImage, iconUrl } from "@/lib/client-img";

type RefAccount = { id: string; name: string; handle: string; icon_url: string; followers: number };

function Avatar({ a, size = "h-11 w-11" }: { a: RefAccount; size?: string }) {
  if (a.icon_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl(a.id)} alt={a.name} title={a.name} onError={retryImage} className={`${size} rounded-full border-2 border-white object-cover shadow-sm`} />;
  }
  return (
    <span
      title={a.name}
      className={`flex ${size} items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-sm`}
      style={{ background: `linear-gradient(135deg, hsl(${a.followers % 360}, 60%, 55%), hsl(${(a.followers % 360) + 40}, 60%, 40%))` }}
    >
      {a.name[0]}
    </span>
  );
}

/**
 * 店舗向けの発注トップ（FOOD HATCH）。
 * 「困りごと」4つから選ぶだけ。メニューの一覧は次の画面で、そのグループの分だけ見せる。
 */
function SimpleOrderTop() {
  const { me } = useMe();
  const { mascot } = useMascot();
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start gap-3">
        <Mascot className="h-12 w-12 shrink-0" />
        <div className="relative border-[3px] border-hive-900 bg-white px-4 py-3">
          
          <p className="text-sm font-medium text-hive-900">こんにちは、{me?.name ?? "ゲスト"}さん！今日はお店の何を良くしますか？</p>
          <p className="mt-1 text-xs text-slate-500">
            いまの残高は <Link href="/points" className="font-semibold text-honey-600 hover:underline">{me?.points ?? 0}<PointInline /></Link>。
            定価は 1<PointInline />＝1,200円（税別）、プレミアムなら実質1,000円です。
          </p>
        </div>
      </div>

      <h1 className="mb-3 text-xl font-bold text-hive-900">困りごとから選ぶ</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {BRAND.groups.map((g) => (
          <Link
            key={g.name}
            href={`/order/menu?group=${encodeURIComponent(g.name)}`}
            className="group border-[3px] border-hive-900 bg-white p-5 transition-colors hover:bg-honey-50"
          >
            <div className="text-lg font-bold text-hive-900">{g.sub}</div>
            <div className="mt-1 text-xs font-semibold text-honey-700">{g.name}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {g.examples.map((e) => (
                <span key={e} className="border border-hive-900 px-2.5 py-1 text-xs font-bold text-hive-900">{e}</span>
              ))}
            </div>
            <div className="mt-3 text-right text-sm font-bold text-honey-700 group-hover:underline">メニューを見る →</div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/order/reference" className="border-2 border-hive-900 bg-white px-5 py-4 transition-colors hover:bg-honey-50">
          <div className="text-sm font-bold text-hive-900">伸びている飲食店の動画をまねる</div>
          <div className="mt-1 text-xs text-slate-500">お手本の動画を選ぶと、台本と動画編集の発注にそのまま進めます</div>
        </Link>
        <Link href="/agent" className="border-2 border-hive-900 bg-white px-5 py-4 transition-colors hover:bg-honey-50">
          <div className="text-sm font-bold text-hive-900">{mascot.consult}</div>
          <div className="mt-1 text-xs text-slate-500">「新メニューを考えたい」「口コミに返したい」など、話しかけるだけで整理します</div>
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
      className="hex-p group absolute block bg-hive-900 transition-transform hover:-translate-y-1"
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
          <span className="ml-0.5 text-base">🍯</span>
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
  "カルーセル投稿", "投稿文＋画像", "LINE公式アカウント構築", "SEO記事作成", "グルメサイト掲載文リライト", "軽微な修正",
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
    return { bg: "bg-honey-400 group-hover:bg-honey-300", sub: "text-hive-900/70", pt: "text-hive-900" };
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
  return { bg: "bg-white group-hover:bg-honey-50", sub: "text-hive-500", pt: "text-honey-700" };
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
  const W = 190;
  const H = Math.round(W * 1.155);
  return (
    <Link
      href={`/order/create?category=${encodeURIComponent(item.name)}`}
      title={`${item.size}／目安 ${item.days}`}
      className="hex-p group relative block bg-hive-900 transition-transform hover:-translate-y-1"
      style={{ width: W, height: H }}
    >
      <span className="hex-p absolute inset-[4px] flex flex-col items-center justify-center gap-1.5 bg-honey-400 px-4 text-center group-hover:bg-honey-300">
        <span className="text-[10px] font-black tracking-widest text-hive-900/60">メインサービス</span>
        <span className="text-[15px] font-black leading-tight text-hive-900">{item.name}</span>
        <span className="text-[10px] leading-tight text-hive-900/70">{item.size}</span>
        <span className="flex h-6 items-center text-hive-900 [&_span]:gap-2"><PlatformRow category={item.name} className="h-6 w-6" /></span>
        <span className="text-2xl font-black leading-none text-hive-900">
          {item.points}
          <span className="ml-1 text-xl">🍯</span>
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
            className={`flex flex-col gap-1 border-2 border-hive-900 px-3 py-3 ${tone.bg.split(" ")[0]}`}
          >
            <span className="flex h-5 items-center text-hive-900 [&_span]:gap-1.5"><PlatformRow category={item.name} className="h-5 w-5" /></span>
            <span className="text-[13px] font-bold leading-tight text-hive-900">{item.name}</span>
            <span className={`text-[10px] leading-tight ${tone.sub}`}>{item.size}</span>
            <span className={`mt-auto pt-1 text-lg font-black leading-none ${tone.pt}`}>
              {item.points}
              {item.quantity ? "〜" : ""}
              <span className="ml-0.5 text-base">🍯</span>
              {item.monthly && <span className="text-[10px] font-bold">/月</span>}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// 六角形の巣（頂点が上）。横に6枚を隙間なく並べ、次の列は半枚ずらして 3/4 の高さに重ねる
const HEX_W = 144;
const HEX_H = Math.round(HEX_W * 1.155);
const PER_ROW = 6;
const GAP = 4;

function HexHive({ items }: { items: CatalogItem[] }) {
  const rows = Math.ceil(items.length / PER_ROW);
  const height = HEX_H + (rows - 1) * HEX_H * 0.75 + 8;
  const width = PER_ROW * (HEX_W + GAP) + (rows > 1 ? (HEX_W + GAP) / 2 : 0);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative" style={{ width, height }}>
        {items.map((it, i) => {
          const r = Math.floor(i / PER_ROW);
          const c = i % PER_ROW;
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
    <div className="max-w-[1010px] space-y-4">
      {/* ハッチのひとこと ＋ いちばん人気の入口 */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative flex items-center gap-4 overflow-hidden border-[3px] border-hive-900 bg-white px-5 py-3.5">
          <span className="flex shrink-0 flex-col items-center">
            <Mascot className="h-14 w-14 animate-bee-float" />
            <span className="-mt-0.5 text-[10px] font-bold tracking-wider text-hive-500">ハッチくん</span>
          </span>
          <div className="min-w-0">
            <p className="text-lg font-black text-hive-900 sm:text-xl">こんにちは、{me?.name ?? "ゲスト"}さん。今日は何をつくる？</p>
            <p className="mt-0.5 text-xs text-hive-500 sm:text-sm">
              下の巣から選ぶか、右の「お手本」から始めてください。迷ったら{mascot.consult}でもOK。
            </p>
          </div>
          {/* 右の余白: ハッチ嬢（ここだけ） */}
          <span className="ml-6 hidden shrink-0 flex-col items-center lg:flex" title="ハッチ嬢">
            <BeeGirl className="h-14 w-14 animate-bee-float [animation-delay:0.6s]" />
            <span className="-mt-0.5 text-[10px] font-bold tracking-wider text-hive-500">ハッチ嬢</span>
          </span>
        </div>
        <Link href="/order/reference" className="group flex flex-col justify-center gap-1.5 border-[3px] border-hive-900 bg-honey-400 px-5 py-3.5 transition-colors hover:bg-honey-300">
          <span className="text-[10px] font-bold tracking-widest text-hive-900">いちばん人気</span>
          <span className="text-[15px] font-black leading-snug text-hive-900">「このアカウントみたいに作りたい」から始める</span>
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {strip.map((a) => <Avatar key={a.id} a={a} size="h-8 w-8" />)}
              {rest > 0 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-hive-900 text-[10px] font-bold text-white">+{rest}</span>
              )}
            </span>
            <span className="text-[10px] font-bold text-hive-900/70">業種べつのお手本</span>
          </span>
          <span className="mt-1 flex h-9 items-center justify-center bg-hive-900 text-sm font-black text-honey-400 transition-transform group-hover:scale-[1.01]">お手本を探す →</span>
        </Link>
      </div>

      {/* メインサービス: ショート動画編集と台本作成 */}
      <section>
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-black text-hive-900">メインサービス</h2>
          <span className="text-xs text-hive-500">TikTok・リール・ショートの台本と編集。セットで1本20🍯</span>
        </div>
        <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
          {groups.flatMap((g) => g.items).filter((it) => FEATURED.includes(it.name)).map((it) => (
            <FeaturedHex key={it.name} item={it} />
          ))}
        </div>
      </section>

      {/* 巣：メニュー */}
      <section>
        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-black text-hive-900">巣から選ぶ</h2>
          <span className="text-xs text-hive-500">はちみつ色=動画（TikTokメイン）・空色=HP/LP・若草=営業・藤色=採用。押すと発注に進みます。定価 1🍯＝1,200円（税別）</span>
        </div>
        <div className="hidden md:block">
          <HexHive items={sortForHive(groups.flatMap((g) => g.items))} />
        </div>
        <div className="md:hidden">
          <MenuCardList items={sortForHive(groups.flatMap((g) => g.items))} />
        </div>

      </section>

      {/* 迷子の受け皿：黒帯 */}
      <Link href="/agent" className="flex flex-wrap items-center gap-4 bg-hive-900 px-5 py-2.5 text-white transition-colors hover:bg-hive-800">
        <span className="text-sm font-black">どれを選べばいいか分からない？</span>
        <span className="text-sm text-hive-200">ハッチに「居酒屋の動画を作りたい」と話しかければ、お手本さがしから発注まで案内します。</span>
        <span className="ml-auto flex h-8 items-center bg-honey-400 px-4 text-sm font-black text-hive-900">{mascot.consult} →</span>
      </Link>
    </div>
  );
}
