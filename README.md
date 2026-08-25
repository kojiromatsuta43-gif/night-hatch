# CREATE WORKS

制作案件の発注・管理プラットフォーム。参考動画からの発注、AIによる台本生成、案件進行管理、書類発行までを1つにまとめたデモアプリです。

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # APIキーを記入（下記参照）
npm run dev
```

http://localhost:3000 → デモアカウントでログイン（パスワードは全て `demo1234`）

| アカウント | ロール | 用途 |
|---|---|---|
| client@example.com | client | 発注者。案件登録・AIエージェント |
| creator@example.com | freelancer | フリーランス側 |
| admin@example.com | admin | 管理画面（ユーザー / NGワード / チャット監視 / 参考動画インポート） |

## APIキー

`.env.local` に以下のいずれかを設定します（キー未設定でもアプリは起動し、AI機能のみ無効になります）。

| 変数 | 用途 | 取得先 |
|---|---|---|
| `GEMINI_API_KEY` | AIエージェント・ブランドプロファイル抽出・動画分析 | https://aistudio.google.com/apikey （無料枠あり） |
| `ANTHROPIC_API_KEY` | 同上（設定時はエージェントと抽出がClaudeを優先） | https://platform.claude.com/ |

プロバイダの切り替えは `src/lib/server/llm.ts` の `activeProvider()` に集約されています。

## 技術構成

- **Next.js 16**（App Router / Turbopack）、TypeScript、Tailwind CSS v4
- **better-sqlite3** — DBファイルは `data/app.db`（Git管理外。初回起動時に自動生成・シード）
- **認証** — Cookieセッション（scrypt でパスワードハッシュ）。`src/lib/server/auth.ts`
- **AI** — Gemini / Claude を切り替え可能な抽象レイヤ（`src/lib/server/llm.ts`）

## ディレクトリ

```
src/
├── app/
│   ├── api/              APIルート（projects, agent, ref-accounts, admin など）
│   ├── order/            案件登録: 参考アカウント一覧 → 動画選択
│   ├── order/create/     発注ウィザード（3ステップ）
│   ├── projects/         案件一覧（カンバン / テーブル）
│   ├── agent/            AIエージェント（会話型台本生成）
│   ├── brand-profile/    ブランドプロファイル（AI抽出付き）
│   ├── video-analysis/   参考動画のAI分析
│   ├── issue/            発注書・請求書・取引先
│   ├── admin/            管理画面
│   └── guide/            デモの歩き方
├── components/           AppShell（認証ガード）, Sidebar
└── lib/server/           db.ts（スキーマ・シード）, auth.ts, llm.ts
```

## 主な機能

- **参考動画からの発注** — 87アカウント・約1,400本のTikTok動画から選び、発注フォームに引き継ぎ。TikTok公式埋め込みで再生可能
- **AIエージェント** — 会話で台本生成（フック / 本編 / CTA構成）。NGワード自動チェック、ブランドプロファイル参照
- **ブランドプロファイル** — 資料テキストからAIが「確定情報 / スタンス / NG事項」を構造化抽出。以降の生成でこの情報を保持
- **案件管理** — 未公開 → 募集中 → 制作待ち → フィードバック → 完了 のカンバン
- **ポイント** — 案件登録時に消費、購入はモック（Stripe差し替え前提）
- **管理画面** — ユーザー一覧、NGワード管理、チャット監視（NGワード検出をハイライト）、参考動画の一括インポート

## 参考動画データについて

`data/app.db` はGit管理外のため、クローン直後は参考アカウントに動画が入っていません。

管理画面（admin でログイン）→「参考アカウント」タブ →「動画を一括インポート」で取り込めます。取得元は `SOURCE_CMS_BASE` 環境変数で変更可能です（`src/app/api/admin/import-videos/route.ts`）。

個別に追加する場合は、同じ画面でTikTokのURLを貼るだけでキャプションとサムネイルが自動取得されます（oEmbed）。

## 既知の制約 / 未実装

- ポイント購入は決済を行わないモック実装
- フリーランス側の応募・納品フローは未実装
- 案件詳細ページは未実装（一覧のステータス変更のみ）
- SQLiteをファイルで持つため、Vercel等のサーバーレス環境には非対応。デプロイ先はRailway / Fly.io / VPS等（永続ボリュームが必要）を想定

## キャラクター切替（遊び心の機能）

ヘッダーのタブでマスコット・ポイントの呼び名・配色が切り替わります。

- **常時表示**: 🐝ハチ（はちみつP🍯・既定）／ 🐖ぶた（飼料P🌿）
- **秘密**: 🦝たぬ（無糖レモンP🍋）— 合言葉を入れた端末にだけタブに出る

| やりたいこと | 方法 |
|---|---|
| たぬを出す | URLの末尾に `?fun=on` を付けて開く（例: `https://.../?fun=on`） |
| たぬをその場で隠す | タブの右の「✕」を押す（選択中ならハチに戻る。ぶたの選択はそのまま） |
| URLで隠す | URLの末尾に `?fun=off` を付けて開く |
| たぬを常時表示にする | `src/lib/mascot.ts` の `SECRET_MASCOTS` から `"tanuki"` を外す |
| 切替機能ごと無効化 | `src/lib/mascot.ts` の `MASCOT_SWITCHER_ENABLED` を `false` にする（全員ハチ固定） |

- 解錠状態も選んだキャラも **その端末のブラウザにだけ** 保存されます（localStorage）。サーバー・DBには一切保存していないので、**お客様や他の社員の画面には出ません**。
- 合言葉は開いた直後にURLから自動で消えるため、アドレスバーや履歴に残りません。

### コードごと削除する場合
1. `src/lib/mascot.ts` / `src/components/MascotProvider.tsx` / `src/components/PigLogo.tsx` / `src/components/TanukiLogo.tsx` / `src/components/LemonCanLogo.tsx` / `src/components/MascotSwitcher.tsx` を削除
2. `src/app/globals.css` 末尾の `html[data-mascot="pig"]` / `html[data-mascot="tanuki"]` ブロックを削除
3. `<Mascot .../>` を `<BeeLogo .../>` に、`<PointInline />` を `🍯` に、`{mascot.pointName}` を `はちみつP` に戻す
