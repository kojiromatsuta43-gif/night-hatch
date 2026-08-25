"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { api, Me } from "@/lib/client";

const MeContext = createContext<{ me: Me | null; refresh: () => void }>({ me: null, refresh: () => {} });
export const useMe = () => useContext(MeContext);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === "/sign-in";
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);

  const refresh = useCallback(() => {
    api<Me>("/api/me")
      .then((m) => setMe(m))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (!isPublic) refresh();
  }, [isPublic, refresh, pathname]);

  if (isPublic) return <>{children}</>;
  if (!checked) return <div className="flex min-h-screen items-center justify-center text-slate-400">読み込み中...</div>;
  if (!me) return null;

  return (
    <MeContext.Provider value={{ me, refresh }}>
      <div className="flex">
        <Sidebar role={me.role} />
        <div className="flex-1 min-w-0 pt-14 md:pt-0">
          <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-6 py-3">
            <NotificationBell />
            <span className="rounded-full bg-honey-50 px-3 py-1 text-sm font-semibold text-honey-700">
              {me.points} 🍯
            </span>
            <span className="text-sm text-slate-600">{me.name}</span>
            <button
              onClick={async () => {
                await api("/api/auth/logout", { method: "POST" });
                window.location.href = "/sign-in";
              }}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ログアウト
            </button>
          </header>
          <main className="px-6 py-8 md:px-10">{children}</main>
        </div>
      </div>
    </MeContext.Provider>
  );
}
