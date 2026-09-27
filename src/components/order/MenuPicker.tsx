"use client";

/**
 * 店舗向けのメニュー選び。バーのドリンクメニューに見立てた一覧で、困りごとのグループごとに数品だけ並べる。
 * 品名は明朝、点線のリーダーでハニーPの値段につなぎ、区切りはシャンパンゴールドの細線。
 * 全メニューを一度に見せない（オーナー・ママが迷わないように）。
 */
import { useState } from "react";
import Link from "next/link";
import { BRAND, catalogGroups, type CatalogItem } from "@/lib/brand";
import { PointInline } from "@/components/MascotProvider";
import { PlatformRow } from "@/components/PlatformIcons";
import Illust, { GROUP_ILLUST } from "@/components/Illust";

/** メニューの1行 */
function MenuRow({ item }: { item: CatalogItem }) {
  const kind = item.monthly ? "月額" : item.quantity ? "件数ぎめ" : null;
  return (
    <li>
      <Link
        href={`/order/create?category=${encodeURIComponent(item.name)}`}
        className="group -mx-3 block rounded-xl px-3 py-4 transition-colors hover:bg-night-50 sm:-mx-4 sm:px-4"
      >
        <span className="flex items-baseline gap-3">
          <span className="font-display text-[17px] leading-snug text-hive-900 group-hover:text-gold-700 sm:text-lg">{item.name}</span>
          <span className="leader hidden sm:block" aria-hidden="true" />
          <span className="ml-auto shrink-0 whitespace-nowrap text-right sm:ml-0">
            <span className="font-latin text-2xl font-bold !tracking-normal text-gold-600">
              {item.points}
              {item.quantity ? "〜" : ""}
            </span>
            <PointInline />
            {item.monthly && <span className="text-[11px] font-bold text-hive-500">／月</span>}
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-hive-500">
          <span className="min-w-0">{item.size}</span>
          <span className="text-hive-500/80">目安 {item.days}</span>
          {kind && <span className="rounded-full border border-gold-300 px-2 py-0.5 text-[10px] font-bold text-gold-600">{kind}</span>}
          <span className="flex items-center opacity-80 [&_svg]:h-3.5 [&_svg]:w-3.5"><PlatformRow category={item.name} className="h-3.5 w-3.5" /></span>
          <span className="ml-auto hidden text-[11px] font-bold text-night-700 opacity-0 transition-opacity group-hover:opacity-100 sm:inline">これを頼む →</span>
        </span>
      </Link>
    </li>
  );
}

export default function MenuPicker({ initialGroup }: { initialGroup?: string }) {
  const groups = catalogGroups();
  const names = groups.map((g) => g.heading);
  const [active, setActive] = useState(initialGroup && names.includes(initialGroup) ? initialGroup : names[0]);
  const current = groups.find((g) => g.heading === active) ?? groups[0];
  const info = BRAND.groups.find((g) => g.name === active);

  return (
    <div>
      {/* 困りごとの切り替え（絵つきのタブ） */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {names.map((n) => {
          const on = active === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setActive(n)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
                on ? "border-night-500 bg-night-500 text-white" : "border-gold-200 bg-white text-hive-900 hover:border-gold-400"
              }`}
            >
              <Illust name={GROUP_ILLUST[n] ?? "glass"} className="h-6 w-6" />
              {n}
            </button>
          );
        })}
      </div>

      {/* ドリンクメニュー風の一覧 */}
      <section className="relative mt-5 overflow-hidden rounded-2xl border border-gold-300 bg-white px-5 pb-4 pt-7 shadow-sm sm:px-10 sm:pt-9">
        {/* 内側のもう1本の細線（メニューブックの縁取り） */}
        <span className="pointer-events-none absolute inset-2 rounded-[12px] border border-gold-200/70" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-col items-center text-center">
            <Illust name={GROUP_ILLUST[active] ?? "glass"} className="h-14 w-14" />
            <p className="gold-ornament mt-2 w-full max-w-md font-latin text-xs">
              <span className="whitespace-nowrap">MENU · {String(names.indexOf(active) + 1).padStart(2, "0")}</span>
            </p>
            <h2 className="mt-2 text-2xl text-hive-900">{active}</h2>
            {info && <p className="mt-1 text-sm text-hive-700">{info.sub}</p>}
            <p className="mt-1 text-xs text-hive-500">{current.items.length}品。押すと、そのまま頼む内容の入力へ進みます。</p>
          </div>
          <ul className="mt-5 divide-y divide-gold-200 border-t border-gold-300">
            {current.items.map((it) => (
              <MenuRow key={it.name} item={it} />
            ))}
          </ul>
          <p className="mt-3 border-t border-gold-300 pt-3 text-center text-[11px] text-hive-500">
            1<PointInline />＝1,200円（税別）・月額プランなら実質1,000円
          </p>
        </div>
      </section>
    </div>
  );
}
