"use client";

import { PlatformRow } from "@/components/PlatformIcons";
import BeeGirl from "@/components/BeeGirl";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mascot, PointInline, useMascot } from "@/components/MascotProvider";
import { useMe } from "@/components/AppShell";
import { api } from "@/lib/client";
import { isScriptCategory, isVideoCategory } from "@/lib/data";
import { BRAND, catalogGroups, type CatalogItem } from "@/lib/brand";
import { retryImage, iconUrl } from "@/lib/client-img";

type RefAccount = { id: string; name: string; handle: string; icon_url: string; followers: number };

function Avatar({ a }: { a: RefAccount }) {
  if (a.icon_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl(a.id)} alt={a.name} title={a.name} onError={retryImage} className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm" />;
  }
  return (
    <span
      title={a.name}
      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-sm"
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
function HexTile({ item, hot, style }: { item: CatalogItem; hot: boolean; style?: React.CSSProperties }) {
  return (
    <Link
      href={`/order/create?category=${encodeURIComponent(item.name)}`}
      title={`${item.size}／目安 ${item.days}`}
      className="hex-p group absolute block bg-hive-900 transition-transform hover:-translate-y-1"
      style={{ width: HEX_W, height: HEX_H, ...style }}
    >
      <span
        className={`hex-p absolute inset-[3px] flex flex-col items-center justify-center gap-1.5 px-4 text-center ${
          hot ? "bg-honey-400 group-hover:bg-honey-300" : "bg-white group-hover:bg-honey-50"
        }`}
      >
        <span className="text-[13px] font-bold leading-tight text-hive-900">{item.name}</span>
        <span className={`text-[10px] leading-tight ${hot ? "text-hive-900/70" : "text-hive-500"}`}>{item.size}</span>
        <span className="mt-0.5 text-hive-900 [&_span]:gap-2.5"><PlatformRow category={item.name} className="h-6 w-6" /></span>
        <span className={`text-xl font-black leading-none ${hot ? "text-hive-900" : "text-honey-700"}`}>
          {item.points}
          {item.quantity ? "〜" : ""}
          <span className="ml-1 text-lg">🍯</span>
          {item.monthly && <span className="text-[10px] font-bold">/月</span>}
        </span>
      </span>
    </Link>
  );
}

// 六角形の巣（頂点が上）。横に6枚を隙間なく並べ、次の列は半枚ずらして 3/4 の高さに重ねる
const HEX_W = 176;
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
          return <HexTile key={it.name} item={it} hot={isVideoCategory(it.name) || isScriptCategory(it.name)} style={{ left: x, top: y }} />;
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
    <div className="space-y-8">
      {/* ハッチのひとこと ＋ いちばん人気の入口 */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative flex items-center gap-4 overflow-hidden border-[3px] border-hive-900 bg-white px-6 py-5">
          <Mascot className="h-14 w-14 shrink-0 animate-bee-float" />
          <div className="min-w-0">
            <p className="text-xl font-black text-hive-900 sm:text-2xl">こんにちは、{me?.name ?? "ゲスト"}さん。今日は何をつくる？</p>
            <p className="mt-1 text-sm text-hive-500">
              下の巣から選ぶか、右の「お手本」から始めてください。迷ったら{mascot.consult}でもOK。
            </p>
          </div>
          {/* 右の余白: ブリッジちゃん（ここだけ） */}
          <div className="ml-auto mr-6 hidden shrink-0 items-center gap-3 lg:flex xl:mr-16" title="ブリッジちゃん">
            <span className="flex flex-col items-center">
              <BeeGirl className="h-14 w-14 animate-bee-float [animation-delay:0.6s]" />
              <span className="-mt-0.5 text-[10px] font-bold tracking-wider text-hive-500">ブリッジちゃん</span>
            </span>
            <span className="hidden rounded-full border-2 border-hive-900 bg-honey-50 px-3 py-1 text-xs font-bold text-hive-900 xl:inline">
              ブリッジちゃんも応援してるよ〜
            </span>
          </div>
        </div>
        <Link href="/order/reference" className="group flex flex-col justify-center gap-1.5 border-[3px] border-hive-900 bg-honey-400 px-5 py-4 transition-colors hover:bg-honey-300">
          <span className="text-[11px] font-bold tracking-widest text-hive-900">いちばん人気</span>
          <span className="text-lg font-black leading-snug text-hive-900">「このアカウントみたいに作りたい」から始める</span>
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {strip.map((a) => <Avatar key={a.id} a={a} />)}
              {rest > 0 && (
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-hive-900 text-[11px] font-bold text-white">+{rest}</span>
              )}
            </span>
          </span>
          <span className="mt-1 flex h-10 items-center justify-center bg-hive-900 text-sm font-black text-honey-400">お手本を探す →</span>
        </Link>
      </div>

      {/* 巣：メニュー */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <h2 className="text-xl font-black text-hive-900">巣から選ぶ</h2>
          <span className="text-xs text-hive-500">黄色のセルは動画まわり。押すと発注に進みます。定価 1🍯＝1,200円（税別）</span>
        </div>
        <HexHive items={groups.flatMap((g) => g.items)} />
        <div className="mt-1 flex flex-wrap gap-4 text-xs text-hive-500">
          {groups.map((g) => {
            const info = BRAND.groups.find((x) => x.name === g.heading);
            return (
              <span key={g.heading}>
                <b className="text-hive-900">{g.heading}</b>: {g.items.map((i) => i.name).join("・")}
                {info?.sub ? `（${info.sub}）` : ""}
              </span>
            );
          })}
        </div>
      </section>

      {/* 迷子の受け皿：黒帯 */}
      <Link href="/agent" className="flex flex-wrap items-center gap-4 bg-hive-900 px-6 py-4 text-white transition-colors hover:bg-hive-800">
        <span className="text-base font-black">どれを選べばいいか分からない？</span>
        <span className="text-sm text-hive-200">ハッチに「居酒屋の動画を作りたい」と話しかければ、お手本さがしから発注まで案内します。</span>
        <span className="ml-auto flex h-9 items-center bg-honey-400 px-4 text-sm font-black text-hive-900">{mascot.consult} →</span>
      </Link>
    </div>
  );
}
