# CREATE WORKS

制作案件の発注・管理プラットフォーム（SODATSU類似機能のオリジナル実装）。

## 起動

```bash
npm install
npm run dev
```

http://localhost:3000 → デモアカウントでログイン（パスワードは全て `demo1234`）

- client@example.com（発注者）
- creator@example.com（フリーランス）
- admin@example.com（管理者）

## AI機能を有効にする

`.env.local.example` をコピーして `.env.local` を作り、APIキーを設定して再起動。

- `ANTHROPIC_API_KEY` … AIエージェント（台本生成）、ブランドプロファイルのAI抽出
- `GEMINI_API_KEY` … 動画分析（未設定時はデモ結果を表示）

## 機能

- 案件登録（3ステップウィザード、ポイント自動計算・残高消費）
- 案件一覧（カンバン / テーブル）
- AIエージェント（会話型台本生成、NGワードチェック、ブランドプロファイル参照）
- 保存済み台本（お気に入り・検索）
- ブランドプロファイル（確定情報/スタンス/NG事項、資料からのAI抽出）
- 動画分析（シーン分解・フック分析・応用ポイント）
- 発注書・請求書・取引先管理
- チャット（5秒ポーリング）
- ポイント購入（モック決済、Stripe差し替え前提）
- 管理画面（ユーザー管理・NGワード・チャット監視）

## 技術

Next.js (App Router) / TypeScript / Tailwind / better-sqlite3（`data/app.db`）/ Claude API / Gemini API
