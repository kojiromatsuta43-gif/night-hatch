"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MenuPicker from "@/components/order/MenuPicker";
import { Mascot, useMascot } from "@/components/MascotProvider";

function MenuInner() {
  const search = useSearchParams();
  const { mascot } = useMascot();
  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-start gap-3">
        <Mascot className="h-12 w-12 shrink-0" />
        <div className="relative border-[3px] border-hive-900 bg-white px-4 py-3">
          
          <p className="text-sm font-medium text-hive-900">頼みたいものを1つ選んでください。押すとそのまま入力画面に進みます。</p>
          <p className="mt-1 text-xs text-slate-500">
            どれがいいか分からないときは <Link href="/agent" className="font-semibold text-honey-600 hover:underline">{mascot.consult}</Link> からどうぞ。
          </p>
        </div>
      </div>
      <MenuPicker initialGroup={search.get("group") ?? undefined} />
    </div>
  );
}

export default function OrderMenuPage() {
  return (
    <Suspense>
      <MenuInner />
    </Suspense>
  );
}
