"use client";

/**
 * テラコッタの上部バー。ロゴ、通知、はちみつの瓶（残高）、名前、ログアウト。
 * 画面の移動は左のサイドバーで行う（業務ツールの基本の並びは変えない）。
 */
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Mascot, useMascot } from "./MascotProvider";
import NotificationBell from "./NotificationBell";
import HoneyJar from "./HoneyJar";
import { api } from "@/lib/client";
import { planOf } from "@/lib/points";

export default function TopNav({ role, name, points, plan }: { role?: string; name: string; points: number; plan?: string }) {
  const { mascot } = useMascot();
  const showPoints = role !== "freelancer";
  const videos = Math.floor(points / 10);
  // 瓶の満タン = 自分のプランの1ヶ月分（プラン未設定・無制限はプレミアムの200）
  const capacity = planOf(plan)?.points ?? 200;
  const overflow = points > capacity;

  return (
    <div className="noren sticky top-0 z-40 bg-food-600 text-cream-50">
      <div className="flex flex-nowrap items-center gap-2 px-3 py-2.5 pl-12 sm:gap-6 sm:px-6 md:pl-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* テラコッタのバーの上でもハッチくんが見えるように、クリーム色の座布団を敷く */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-100">
            <Mascot className="h-7 w-7" />
          </span>
          <span className="whitespace-nowrap font-display text-base tracking-[0.14em] sm:text-lg sm:tracking-[0.18em]">{BRAND.name}</span>
        </Link>
        <div className="ml-auto flex flex-nowrap items-center gap-2 sm:gap-4">
          <NotificationBell />
          {showPoints && (
            <Link href="/points" title={`${mascot.pointName}の残高（クリックで詳細）`} className="flex items-center gap-2">
              <HoneyJar points={points} capacity={capacity} />
              <span className="flex flex-col whitespace-nowrap leading-none">
                <span className="text-lg font-black text-honey-300">
                  {points}
                  <span className="ml-0.5 text-[11px] font-bold">{mascot.pointName}</span>
                </span>
                <span className="mt-0.5 hidden text-[10px] text-food-100 sm:block">
                  {overflow ? `1ヶ月分（${capacity}）を超えて溢れています` : videos > 0 ? `あと約${videos}本つくれます` : "追加購入できます"}
                </span>
              </span>
            </Link>
          )}
          <span className="hidden text-xs text-food-100 sm:inline">{name}</span>
          <button
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              window.location.href = "/sign-in";
            }}
            className="hidden whitespace-nowrap text-xs text-food-100 hover:text-cream-50 sm:inline"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
