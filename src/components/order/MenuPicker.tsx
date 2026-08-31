"use client";

/**
 * 店舗向けのメニュー選び。「困りごと」のグループを選ぶと、その中の数個だけが並ぶ。
 * 34種類を一度に見せない（店主が迷わないように）。
 */
import { useState } from "react";
import Link from "next/link";
import { BRAND, catalogGroups, type CatalogItem } from "@/lib/brand";
import { PointInline } from "@/components/MascotProvider";

function MenuCard({ item }: { item: CatalogItem }) {
  return (
    <Link
      href={`/order/create?category=${encodeURIComponent(item.name)}`}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:border-honey-400 hover:bg-honey-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-hive-900">{item.name}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{item.size}</span>
        <span className="mt-1 block text-xs text-slate-400">目安 {item.days}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-bold text-honey-700">
          {item.points}
          {item.quantity ? "〜" : ""}
          <PointInline />
          {item.monthly && <span className="text-xs font-medium text-slate-500">／月</span>}
        </span>
        <span className="mt-1 inline-block rounded-full bg-honey-400 px-3 py-1 text-xs font-bold text-hive-900 group-hover:bg-honey-300">
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
      <div className="flex flex-wrap gap-2">
        {names.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setActive(n)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              active === n ? "border-honey-500 bg-honey-400 text-hive-900" : "border-slate-300 bg-white text-slate-600 hover:border-honey-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {info && <p className="mt-3 text-sm text-slate-500">{info.sub}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {current.items.map((it) => (
          <MenuCard key={it.name} item={it} />
        ))}
      </div>
    </div>
  );
}
