import AppShell from "@/components/AppShell";

/**
 * 業務ツール（ログインして使う画面）の枠。上部バー・サイドバー・ログイン確認は AppShell が持つ。
 * 公開サイト（/site）はこのグループの外にあり、AppShell を通らない。
 */
export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
