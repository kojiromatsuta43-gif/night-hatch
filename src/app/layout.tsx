import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: BRAND.name,
  description: "制作案件の発注・管理プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* 書体: Zen Kaku Gothic New（見出しも本文も同じ書体、太さで階層をつける） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-honey-50 text-hive-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
