import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CREATE WORKS",
  description: "制作案件の発注・管理プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-w-0 px-6 py-8 md:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
