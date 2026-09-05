import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker / Railway 向け: 依存を含む最小構成を .next/standalone に出力する
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "@duckdb/node-api", "@duckdb/node-bindings", "playwright-core"],
  // 企業DB（DuckDB）のネイティブ部品を standalone 出力に確実に含める
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@duckdb/**", "./node_modules/detect-libc/**", "./node_modules/playwright-core/**"],
  },
  // 外部公開（Cloudflareトンネル等）経由で開発サーバーにアクセスするために許可
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
};

export default nextConfig;
