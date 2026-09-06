"use client";

/**
 * 店舗向けのメニュー選び。居酒屋の壁に並ぶ「短冊」に見立てた札で、困りごとのグループごとに数個だけ並べる。
 * 34種類を一度に見せない（店主が迷わないように）。
 */
import { useState } from "react";
import Link from "next/link";
import { BRAND, catalogGroups, type CatalogItem } from "@/lib/brand";
import { PointInline } from "@/components/MascotProvider";
import { PlatformRow } from "@/components/PlatformIcons";
import Illust, { GROUP_ILLUST } from "@/components/Illust";

/** 短冊1枚 */
function Tanzaku({ item }: { item: CatalogItem }) {
  return (
    <Link
      href={`/order/create?category=${encodeURIComponent(item.name)}`}
      className="tanzaku group relative flex flex-col overflow-hidden rounded-xl border border-food-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-food-400 hover:shadow-md"
    >
      {/* 上の赤い帯（札を吊るす部分） */}
      <span className="flex items-center justify-between bg-food-500 px-3 py-1.5 text-[10px] font-black tracking-widest text-white">
        <span>{item.monthly ? "月ぎめ" : item.quantity ? "件数ぎめ" : "一品"}</span>
        <span className="flex items-center gap-1 text-white/90 [&_svg]:h-3.5 [&_svg]:w-3.5"><PlatformRow category={item.name} className="h-3.5 w-3.5" /></span>
      </span>
      <span className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <span className="font-display text-lg leading-snug text-hive-900">{item.name}</span>
        <span className="mt-1 text-xs leading-relaxed text-hive-500">{item.size}</span>
        <span className="mt-auto flex items-end justify-between pt-4">
          <span className="text-[11px] text-hive-500">目安 {item.days}</span>
          <span className="text-right">
            <span className="block text-2xl font-black leading-none text-food-700">
              {item.points}
              {item.quantity ? "〜" : ""}
              <PointInline />
              {item.monthly && <span className="text-[11px] font-bold text-hive-500">／月</span>}
            </span>
          </span>
        </span>
        <span className="mt-3 block rounded-full bg-food-500 py-2 text-center text-xs font-bold text-white transition-colors group-hover:bg-food-600">
          これを頼む
        </span>
      </span>
    </Link>
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
                on ? "border-food-500 bg-food-500 text-white" : "border-food-200 bg-white text-hive-900 hover:bg-food-50"
              }`}
            >
              <Illust name={GROUP_ILLUST[n] ?? "empty"} className="h-6 w-6" />
              {n}
            </button>
          );
        })}
      </div>
      {info && (
        <div className="mt-4 flex items-center gap-3">
          <Illust name={GROUP_ILLUST[active] ?? "empty"} className="h-12 w-12" />
          <div>
            <h2 className="text-xl text-hive-900">{info.sub}</h2>
            <p className="text-xs text-hive-500">{current.items.length}品。札を押すと、そのまま頼む内容の入力へ進みます。</p>
          </div>
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {current.items.map((it) => (
          <Tanzaku key={it.name} item={it} />
        ))}
      </div>
    </div>
  );
}
