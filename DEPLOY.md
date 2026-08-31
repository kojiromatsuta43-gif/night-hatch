# デプロイ手順（Railway）

常時稼働させて、誰でもURLでアクセスできる状態にする手順です。
開発PCの起動が不要になり、URLも固定されます。

所要時間：初回15分程度 / 費用：月$5〜12程度（約750〜1,800円）

> 料金は「$5の固定費 + 使用量」の従量制です。$5ぶんの使用枠が含まれますが、
> 常時起動のアプリでは超過する見込みです。Railwayの設定で使用上限を決められるため、
> 想定外の高額請求を防げます（手順7参照）。

## なぜRailwayか

このアプリはSQLiteのファイルにデータを保存するため、**永続ディスクを持てるホスティング**が必要です。Vercelのようなサーバーレス環境では、再起動のたびにデータが消えてしまいます。

Railwayは永続ボリュームに対応しており、GitHubリポジトリを繋ぐだけで自動デプロイされます。

## 手順

### 1. アカウント作成

https://railway.com → GitHubアカウントでサインアップ（そのままリポジトリを繋げられます）

### 2. プロジェクト作成

1. 「New Project」→「Deploy from GitHub repo」
2. `create-works` を選択
3. Railwayが自動でNext.jsを検出し、ビルドが始まります

### 3. 永続ボリュームを追加（重要）

これを忘れると、再デプロイのたびにデータが消えます。

1. サービスを選択 →「Variables」の隣の「Settings」
2. 「Volumes」→「Add Volume」
3. **Mount path** に `/data` と入力

### 4. 環境変数を設定

「Variables」タブで以下を追加します。

| 変数名 | 値 | 必須 |
|---|---|---|
| `DATA_DIR` | `/data` | **必須**（手順3のボリュームを使うため） |
| `HOSTNAME` | `0.0.0.0` | **必須**（外部からの接続を受けるため） |
| `GEMINI_API_KEY` | ご自身のキー | AI機能を使う場合 |
| `ANTHROPIC_API_KEY` | ご自身のキー | Claudeを使う場合（任意） |
| `NEXT_PUBLIC_APP_BRAND` | `bridge` または `food` | 看板の切替（未設定なら BRIDGE HATCH） |

`PORT` はRailwayが自動で設定するため、こちらで指定する必要はありません。

### 5. 公開URLを発行

1. 「Settings」→「Networking」→「Generate Domain」
2. `create-works-production.up.railway.app` のようなURLが発行されます

このURLが固定の公開アドレスになります。

### 6. 初回データ投入

デプロイ直後はデータベースが空の状態から作られます（参考アカウント87件は自動投入されますが、動画は入っていません）。

1. 発行されたURLを開く
3. 「管理」→「参考アカウント」→「動画を一括インポート」

これで動画データが入ります。以降は永続ボリュームに保存されるため、再デプロイしても消えません。

### 7. 使用上限を設定（推奨）

想定外の課金を防ぐため、上限を決めておきます。

1. 画面右上のアカウントメニュー →「Usage」
2. 「Usage Limits」→ 上限額を設定（例：$15）
3. 上限に達するとサービスが停止し、それ以上は課金されません

## 運用

- **コードを更新したら**：`git push` するだけでRailwayが自動的に再デプロイします
- **ログを見たい**：Railwayの「Deployments」→ 該当デプロイ →「View Logs」
- **停止したい**：「Settings」→「Danger」→ サービスを削除、または一時停止

## FOOD HATCH（飲食店版）を別サービスとして立てる

BRIDGE HATCH と FOOD HATCH は同じコードで、`NEXT_PUBLIC_APP_BRAND` の値だけで看板・制作メニュー・業種タブ・AIの口調が切り替わります。
飲食店版は **同じリポジトリから2つ目のサービス** を作ります（DBもボリュームも別になるので、顧客データは混ざりません）。

1. Railway のプロジェクト画面で「+ New」→「GitHub Repo」→ 同じ `create-works` リポジトリを選ぶ
2. できたサービスの名前を `food-hatch` に変える（Settings → Service Name）
3. 手順3と同じく Volume を追加（Mount path `/data`）
4. Variables に以下を入れて **Deploy** を押す
   - `NEXT_PUBLIC_APP_BRAND` = `food` ← これが看板の切替
   - `DATA_DIR` = `/data`、`HOSTNAME` = `0.0.0.0`
   - `GEMINI_API_KEY`（BRIDGE 側と同じ値でよい）
   - Stripe を使うなら `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`（同じ Stripe アカウントでよい。Webhook は FOOD 側のURLでもう1本登録する）
   - `APP_PUBLIC_URL` = 手順5で発行したURL
5. Settings → Networking → Generate Domain（`food-hatch-production.up.railway.app` のようなURL）

`NEXT_PUBLIC_` 付きの変数はビルド時に埋め込まれるので、値を変えたら必ず再デプロイしてください。
制作メニューの中身は `src/lib/brands/food.ts`（飲食）と `src/lib/brands/bridge.ts`（BRIDGE）にあり、単価や質問項目はここを直せば両方の画面に反映されます。

## 本番運用に移る場合の追加作業

このデモ設定のまま社外に出す場合は、最低限これらを実施してください。

1. **デモアカウントの削除** — `src/lib/server/db.ts` のシード処理から `client@` / `creator@` / `admin@example.com` を削除し、正規のアカウントを作る仕組みに置き換える
2. **ログイン画面のデモ情報の削除** — `src/app/sign-in/page.tsx` 下部にパスワードが表示されています
3. **ポイント購入の実装** — 現在はモック。Stripeへの差し替えが必要
4. **バックアップ** — Railwayのボリュームは自動バックアップされません。定期的に `/data/app.db` を取得する仕組みを検討してください

## 代替案

| サービス | 費用 | 備考 |
|---|---|---|
| Railway | 月$5〜 | 推奨。永続ボリューム対応、GitHub連携が簡単 |
| Fly.io | 無料枠あり | ボリューム対応。設定はやや複雑 |
| Render | 月$7〜 | 永続ディスクは有料プランのみ |
| Vercel | 無料 | **SQLiteでは不可**。Turso等の外部DBへの移行が必要 |
