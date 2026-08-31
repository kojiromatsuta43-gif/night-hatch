# Next.js standalone 用のマルチステージビルド
# better-sqlite3 がネイティブモジュールのため、ビルド段でコンパイル環境を用意する

FROM node:22-slim AS deps
WORKDIR /app
# better-sqlite3 の node-gyp ビルドに必要
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 看板の切替（bridge / food）。NEXT_PUBLIC_ 変数はビルド時に画面へ埋め込まれるので、
# Railway の Variables をビルド引数として受け取る必要がある（宣言しないと build に届かない）
ARG NEXT_PUBLIC_APP_BRAND=bridge
ENV NEXT_PUBLIC_APP_BRAND=$NEXT_PUBLIC_APP_BRAND
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 永続ボリュームのマウント先（Railway側で /data にボリュームを割り当てる）
ENV DATA_DIR=/data
ENV HOSTNAME=0.0.0.0
# サーバー側（API・DBの初期値）も同じ看板を見る
ARG NEXT_PUBLIC_APP_BRAND=bridge
ENV NEXT_PUBLIC_APP_BRAND=$NEXT_PUBLIC_APP_BRAND

# standalone 出力には public と .next/static が build スクリプトでコピー済み
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
