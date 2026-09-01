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
| `ANTHROPIC_API_KEY` | ご自身のキー | Claudeを使う場合（任意）。両方あるときの使い分けは管理画面「AI設定」で用途ごとに選べる（既定: お客様向けは Claude Sonnet 5、裏方は Gemini 3.1 Flash-Lite） |
| `MAX_UPLOAD_MB` | 任意（既定 2048） | 素材・納品ファイルの1ファイル上限。8MBずつ分割して受け取るのでメモリは食わない。ボリュームの空きが300MBを切ると受け付けない |
| `ANTHROPIC_MODEL` / `GEMINI_MODEL` | 任意 | 用途に関係なく一括でモデル名を上書きしたいとき（裏方は除く）。通常は管理画面から設定する |
| `NEXT_PUBLIC_APP_BRAND` | `bridge` または `food` | 看板の切替（未設定なら BRIDGE HATCH） |
| `APIFY_TOKEN` | Apify の API トークン | TikTok 参考動画の自動取り込みを使う場合 |
| `TIKTOK_AUTO_SYNC` | `on`（既定）/ `off` | 毎日の自動取り込みを止めたいとき |
| `TIKTOK_SYNC_HOUR` | `4`（既定・日本時間） | 自動取り込みの時刻 |
| `TIKTOK_SYNC_INTERVAL_DAYS` | `7`（既定） | 自動取り込みの間隔（日） |
| `TIKTOK_RESULTS_PER_QUERY` | `20`（既定） | 設定1件あたりの取り込み本数 |

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

## TikTok 参考動画の自動取り込み（Apify）

管理画面の「TikTok取り込み」タブで @ハンドル／検索ワード／#タグ を業種付きで登録し、「今すぐ全部取り込む」を押すと、
外部データサービス（Apify の TikTok Scraper）から動画・再生数・いいね・投稿日・サムネイルが入ります。
以後は週1回（日本時間4時以降）自動で更新され、再生数の履歴から「今週伸びた動画」を出します。

1. https://apify.com でアカウントを作る（無料プランは月5ドル分の枠。1,000本あたり約1.7ドル）
2. Settings → API tokens でトークンを作る
3. Railway の Variables に `APIFY_TOKEN` として貼り付け → Deploy（値はチャット等に貼らない）
4. 管理画面 → TikTok取り込み で設定を追加 → 今すぐ全部取り込む

費用の目安: 設定1件あたり最新20本。33件の設定を週1回なら月約2,900本＝約5ドル（無料枠内）。毎日にするなら Starter（月29ドル）が必要。

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


## 企業データベース（775万社）の取り込み

営業リスト画面の「企業DBから探す」は、サーバー側の DuckDB（`DATA_DIR/companydb/companies.duckdb`）を検索する。
データは Mac の `~/zerotel-export/ブリッジハッチ営業リスト.duckdb` から Parquet を書き出して、管理画面「企業DB」からアップロードする。

1. **Railway のボリューム容量を確認**（Parquet 数百MB ＋ DuckDB 数百MB〜1GB が必要。トライアルの 0.5GB では足りないので Hobby 以上に）
2. Mac のターミナルで Parquet を書き出す:
   ```
   cd ~/zerotel-export && duckdb ブリッジハッチ営業リスト.duckdb -c "COPY (SELECT * FROM 全企業 ORDER BY 都道府県, 大業界) TO '全企業.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)"
   ```
3. 管理画面 → 企業DB → ファイルを選んでアップロード（8MB ずつ分割送信。画面を閉じない）
4. 「取り込みを開始」→ 数分待つ（法人番号で重複をまとめ、都道府県順に並べ替え。終わると Parquet は自動削除）
5. 営業リスト → 「企業DBから探す」で条件検索 → 先頭N社 or 選んだ会社を営業リストに追加

環境変数（任意）: `COMPANYDB_MEMORY`（既定 1GB）、`COMPANYDB_THREADS`（既定 2）。
