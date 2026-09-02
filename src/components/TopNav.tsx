"use client";

/**
 * 黒い上部バー。ロゴ、通知、はちみつの瓶（残高）、名前、ログアウト。
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
    <div className="sticky top-0 z-40 bg-hive-900 text-white">
      <div className="flex items-center gap-3 px-4 py-2.5 pl-14 sm:gap-6 sm:px-6 md:pl-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* 黒バーの上でもハッチくんが見えるように、はちみつ色の座布団を敷く */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-honey-400">
            <Mascot className="h-7 w-7" />
          </span>
          <span className="text-base font-black tracking-wide">{BRAND.name}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <NotificationBell />
          {showPoints && (
            <Link href="/points" title={`${mascot.pointName}の残高（クリックで詳細）`} className="flex items-center gap-2">
              <HoneyJar points={points} capacity={capacity} />
              <span className="flex flex-col leading-none">
                <span className="text-lg font-black text-honey-400">
                  {points}
                  <span className="ml-0.5 text-[11px] font-bold">{mascot.pointName}</span>
                </span>
                <span className="mt-0.5 hidden text-[10px] text-hive-200 sm:block">
                  {overflow ? `1ヶ月分（${capacity}）を超えて溢れています` : videos > 0 ? `あと約${videos}本つくれます` : "追加購入できます"}
                </span>
              </span>
            </Link>
          )}
          <span className="hidden text-xs text-hive-200 sm:inline">{name}</span>
          <button
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              window.location.href = "/sign-in";
            }}
            className="text-xs text-hive-200 hover:text-white"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
