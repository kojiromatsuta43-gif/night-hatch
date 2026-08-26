"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "./AppShell";

/**
 * 発注する側だけが使う画面を囲むための部品。
 * フリーランスがURLを直接開いた場合はダッシュボードへ戻す。
 */
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const { me } = useMe();
  const router = useRouter();
  const blocked = me?.role === "freelancer";

  useEffect(() => {
    if (blocked) router.replace("/");
  }, [blocked, router]);

  if (blocked) {
    return <div className="text-sm text-slate-400">この画面は発注者向けです。ダッシュボードへ戻ります…</div>;
  }
  return <>{children}</>;
}
