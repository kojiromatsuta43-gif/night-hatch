# NIGHT HATCH

**夜のお店の採用と集客を、ハッチと一緒に。**

バー・ガールズバー・スナック・キャバクラ・ラウンジ・会員制クラブ専用の、制作の発注・管理プラットフォームです。
お店の人は「困りごと」からメニューを選んで頼むだけ。求人原稿・体入動画・ショート動画・Googleマップ整備・イベント告知・料金システム表・法人の貸切営業などを、ハニーP（ポイント）で発注できます。

- 事業設計: `NIGHT_HATCH_DESIGN.md`（2026-09-28 初版。プロジェクトの資料側にあります）
- リポジトリ: `kojiromatsuta43-gif/night-hatch`（新規）
- 本番: Railway service `night-hatch`（Variables に `PORT=3000` が必要。手順は `DEPLOY.md`）

## BRIDGE / FOOD との関係

| | BRIDGE HATCH | FOOD HATCH | NIGHT HATCH |
|---|---|---|---|
| 対象 | 中小企業 | 飲食店 | 夜のお店（接待あり・なし両方） |
| 料金 | 補助金前提のプランあり | 同左 | **補助金なしの月額サブスクのみ** |
| デザイン | 黒×黄・角なし太線 | 暖簾とテラコッタ | 夜の帳とシャンパン（ダーク・ワイン×シャンパンゴールド） |

- 仕組み（ハニーP・メニュー発注・台本AI・案件管理・フォーム営業・請求書など）は FOOD HATCH（コミット 0dc172b）から派生
- キャラクター「ハッチ」とハニーP（1ハニーP＝1,200円・税別）は3つで共通。ハッチは白シャツの襟・黒ベスト・金の蝶ネクタイ・額の三日月の夜仕様
- 看板の切替機能はありません。コードは常に NIGHT（`src/lib/brand.ts` → `src/lib/brands/night.ts`）

## コンプライアンス（このルールを外すと事業が成り立たない）

画面・同意事項・AI（ハッチ）のプロンプトの3か所に入れてあります。

1. **補助金の話は一切しない** — 風営法第2条の営業は補助金の対象外。画面にも補助金の記載はありません
2. **18歳未満の出演・採用に関わる制作はしない**。求人には必ず「18歳未満・高校生不可」と、職業安定法の的確表示
3. **性的な表現・露出を売りにした制作はしない**（SNSの規約違反によるアカウント停止も避ける）
4. **色恋営業（恋愛感情に乗じた来店・注文の要求）・料金を誤認させる表現・客引き・スカウトの文面は作らない**（2025年改正風営法）。「お礼・来店案内の定型文」はお礼とイベント案内だけ
5. 風営法の許可（接待ありは1号許可）・深夜酒類提供飲食店の届出を受けている店舗に限る（発注フォームで必ず聞く）
6. 出演者本人の同意は店側で取る／反社会的勢力と関係がない
7. 修正2回まで無料、集客・採用の結果は保証しない

ホストクラブ・性風俗関連特殊営業は当面扱いません。お手本動画（TikTok取り込み）は、取り込み後に**全件目視**で性的な表現・未成年に見える出演・まとめ系を削除してください（AI審査だけでは残ります）。

## どこに何があるか

| 変えたいもの | ファイル |
|---|---|
| メニュー・ハニーP・ヒアリング項目・同意事項・AIの設定 | `src/lib/brands/night.ts` |
| 月額プラン（ライト3万/25P・スタンダード12万/120P・プレミアム25万/250P） | `src/lib/points.ts` |
| 今月のおすすめ（12ヶ月） | `src/lib/seasonal.ts` |
| 配色（ダークテーマのトークン） | `src/app/globals.css` |
| ハッチ・イラスト | `src/components/BeeLogo.tsx`、`src/components/Illust.tsx` |
| TikTok検索語の初期値 | `src/lib/server/db.ts` の `TIKTOK_SEARCH_SEED` |

### 配色のしくみ

既存の画面は明るい地の前提で書かれているため、`slate-*` / `hive-*` / `cream-*` / `night-*`（旧 `food-*`）と状態色のスケールを**反転**しています（小さい番号＝暗い面、大きい番号＝明るい文字）。
新しく書くときは「暗い面 = `ink-*`」「主色ボタン = `bg-night-500 text-white`」「線・飾り = `gold-*`」「ハニーP = `honey-*`」を使ってください。`bg-slate-900` のような「濃い面に白文字」の書き方は反転で明るい面になるので使いません。
請求書の印刷シートは `.paper` クラスで明るい配色に戻しています。

## 開発

```bash
npm install          # better-sqlite3 は同梱の prebuild を使う
npm run dev          # http://localhost:3000
```

`data/app.db` は初回起動時に自動生成・シードされます（消すと作り直し）。デモアカウントのパスワードはすべて `demo1234`。

| アカウント | ロール | 用途 |
|---|---|---|
| client@example.com | client | デモのお店（テストラウンジ・スタンダードプラン） |
| creator@example.com | freelancer | 制作者 |
| admin@example.com | admin | 管理画面（ユーザー / 契約 / NGワード / チャット監視 / 参考アカウント / TikTok取り込み / AI設定） |

AI機能は `GEMINI_API_KEY` または `ANTHROPIC_API_KEY` を `.env.local` に入れると動きます（未設定でもアプリは起動）。

## お手本動画（TikTok取り込み）

初期状態ではお手本動画は0件です（FOOD の飲食店アカウントは入れていません）。画面には「お手本動画は管理画面の『TikTok取り込み』から追加できます」と出ます。

1. Railway に `APIFY_TOKEN` を入れる（クラウドの作業環境からは取得できません）
2. 管理画面 → TikTok取り込み。検索語の初期値（「キャバクラ 体入」「ショットバー」など10件）が業態つきで入っています
3. 「今すぐ全部取り込む」→ 「AIでお手本を審査」→ **全件目視**して不適切なものを削除
4. 1回目を手動で取り込んだあとは、週1回自動で更新されます（手動で1度も取り込んでいなければ自動では動きません）

## 技術構成

- Next.js 16（App Router / Turbopack）、TypeScript、Tailwind CSS v4（`@theme` トークン）
- better-sqlite3（`DATA_DIR`、既定 `data/`）
- 認証は Cookie セッション（scrypt）。AI は Gemini / Claude を切り替え可能（`src/lib/server/llm.ts`）
- 書体: 本文 Zen Kaku Gothic New、見出し Shippori Mincho B1、英字ロゴ Cormorant Garamond（Google Fonts）

## デプロイ

`DEPLOY.md` を参照。要点:

- 新しい GitHub リポジトリ `kojiromatsuta43-gif/night-hatch` に push
- Railway に新サービス `night-hatch`（Dockerfile ビルド）、Volume を `/data` にマウント
- Variables: `PORT=3000`（必須）、`DATA_DIR=/data`、`HOSTNAME=0.0.0.0`、AIキー、Stripe、`APP_PUBLIC_URL`、`APIFY_TOKEN`
