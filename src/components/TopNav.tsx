"use client";

/**
 * 深い夜色の上部バー（下端に細いシャンパンゴールドの線）。ロゴ、通知、ハニーのボトル（残高）、名前、ログアウト。
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
  // 台本＋編集＝15ハニーPで1本（NIGHT HATCH のプランの数え方）
  const videos = Math.floor(points / 15);
  // ボトルの満タン = 自分のプランの1ヶ月分（プラン未設定・無制限はプレミアムの250）
  const capacity = planOf(plan)?.points ?? 250;
  const overflow = points > capacity;

  return (
    <div className="gold-rule sticky top-0 z-40 bg-ink-900 text-hive-900">
      <div className="flex flex-nowrap items-center gap-2 px-3 py-2.5 sm:gap-6 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* 夜のバーの上でもハッチくんが沈まないよう、金の細い縁の丸に入れる */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-300 bg-ink-700">
            <Mascot className="h-7 w-7" />
          </span>
          <span className="font-latin whitespace-nowrap text-base !tracking-[0.14em] text-gold-600 sm:text-xl sm:!tracking-[0.22em]">{BRAND.name}</span>
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
                <span className="mt-0.5 hidden text-[10px] text-hive-500 sm:block">
                  {overflow ? `1ヶ月分（${capacity}）を超えて溢れています` : videos > 0 ? `あと約${videos}本つくれます` : "追加購入できます"}
                </span>
              </span>
            </Link>
          )}
          <span className="hidden text-xs text-hive-500 sm:inline">{name}</span>
          <button
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              window.location.href = "/sign-in";
            }}
            className="hidden whitespace-nowrap text-xs text-hive-500 hover:text-hive-900 sm:inline"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
