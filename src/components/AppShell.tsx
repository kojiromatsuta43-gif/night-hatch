"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import MascotProvider from "./MascotProvider";
import { api, Me } from "@/lib/client";

const MeContext = createContext<{ me: Me | null; refresh: () => void }>({ me: null, refresh: () => {} });
export const useMe = () => useContext(MeContext);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // ログイン不要で開ける画面。
  //  /sign-in … ログイン画面
  //  /pay/…   … 請求先（お客様の取引先）が支払い後に戻ってくる画面
  const isPublic = pathname === "/sign-in" || pathname.startsWith("/pay");
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
  if (!checked) return <div className="flex min-h-screen items-center justify-center text-hive-500">じゅんびちゅう…</div>;
  if (!me) return null;

  return (
    <MascotProvider>
    <MeContext.Provider value={{ me, refresh }}>
      <div className="min-h-screen">
        <TopNav role={me.role} name={me.name} points={me.points} plan={me.plan} />
        <div className="flex min-h-[calc(100vh-56px)]">
          <Sidebar role={me.role} />
          <main className="min-w-0 flex-1 px-4 pb-28 pt-8 sm:px-6 md:px-10 md:pb-10">{children}</main>
        </div>
      </div>
    </MeContext.Provider>
    </MascotProvider>
  );
}
