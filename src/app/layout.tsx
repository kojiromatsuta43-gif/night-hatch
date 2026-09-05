import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: BRAND.name,
  description: "飲食店の集客・メニュー・SNSを、ハッチと一緒に。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* 書体: 本文は Zen Kaku Gothic New、見出しは Shippori Mincho B1（お品書きの雰囲気） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Shippori+Mincho+B1:wght@700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-cream-100 text-hive-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
