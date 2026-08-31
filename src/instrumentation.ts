/**
 * サーバー起動時に一度だけ呼ばれる（Next.js の仕組み）。
 * 定期処理（TikTok の自動取り込み）をここから始める。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { start } = await import("./lib/server/scheduler");
    start();
  }
}
