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
      <body className="bg-honey-50 text-hive-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
