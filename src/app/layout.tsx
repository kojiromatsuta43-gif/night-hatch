import { BRAND } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#140F1C" };

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" style={{ colorScheme: "dark" }}>
      <head>
        {/* 書体: 本文は Zen Kaku Gothic New、見出しは Shippori Mincho B1、英字ロゴは Cormorant Garamond */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Shippori+Mincho+B1:wght@700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-ink-950 text-hive-900 antialiased">
        {children}
      </body>
    </html>
  );
}
