import Database from "better-sqlite3";
import path from "path";
import { BRAND } from "../brand";
import crypto from "crypto";
import refSeed from "./ref-seed.json";

/**
 * 旧 BRIDGE HATCH / FOOD HATCH の初期値。NIGHT 専用の今は「掃除する対象」としてだけ持つ。
 * 看板切替前に起動した DB に残っている業種タブ・デモ案件を見分けるために使う。
 */
const LEGACY_BRIDGE_INDUSTRIES = [
  "美容クリニック", "美容サロン", "美容室", "ネイル", "マツエク", "飲食", "フィットネス",
  "医療・介護", "不動産", "建設・工務店", "買取・リユース", "製造業", "人材・転職",
];
const LEGACY_BRIDGE_DEMO_PROJECTS: { title: string; category: string }[] = [
  { title: "秋の新商品ショート動画", category: "ショート動画編集" },
  { title: "採用ショート動画 台本", category: "台本作成（ショート）" },
  { title: "新商品LPファーストビュー修正", category: "LPファーストビュー" },
  { title: "会社紹介動画編集", category: "動画編集（3分）" },
];
const LEGACY_FOOD_INDUSTRIES = [
  "居酒屋", "カフェ", "ラーメン", "焼肉", "寿司・和食", "イタリアン・フレンチ", "中華",
  "スイーツ・ベーカリー", "定食・食堂", "カレー・エスニック", "テイクアウト・デリバリー", "キッチンカー",
];
const ALL_BRAND_INDUSTRIES = Array.from(new Set([...LEGACY_BRIDGE_INDUSTRIES, ...LEGACY_FOOD_INDUSTRIES, ...BRAND.industries]));
const LEGACY_INDUSTRIES = [...LEGACY_BRIDGE_INDUSTRIES, ...LEGACY_FOOD_INDUSTRIES].filter((n) => !BRAND.industries.includes(n));
/** 以前の看板で入っていた参考アカウント（開発用の初期データ・FOOD の許諾アカウント）。NIGHT では外す */
const LEGACY_REF_HANDLES = [
  "@higakiyakitori", "@dr.norimoto", "@dragonamasora",
  "@rire_omotesando", "@torikichi_official", "@force_gym", "@sakura_fudosan",
];

const CATEGORY_JA: Record<string, string> = {
  kaitori: "買取・リユース",
  beauty_clinic: "美容クリニック",
  beauty_salon: "美容サロン",
  fitness: "フィットネス",
  real_estate: "不動産",
  manufacturing: "製造業",
  human_resources: "人材・転職",
  construction: "建設・工務店",
  food_service: "飲食",
  healthcare: "医療・介護",
};

type RefSeedAccount = {
  userId: string;
  userName: string;
  category?: string[];
  followers?: number;
  videoCount?: number;
  bio?: string;
  userIcon?: { url: string };
  profileUrl?: string;
};

function syncRefAccounts(db: Database.Database) {
  const rows = db.prepare("SELECT id, handle FROM ref_accounts").all() as { id: string; handle: string }[];
  const byHandle = new Map(rows.map((r) => [r.handle, r.id]));
  const insert = db.prepare(
    "INSERT INTO ref_accounts (id, name, handle, industry, followers, bio, icon_url, profile_url, video_count) VALUES (?,?,?,?,?,?,?,?,?)"
  );
  const update = db.prepare(
    "UPDATE ref_accounts SET name=?, industry=?, followers=?, icon_url=?, profile_url=?, video_count=? WHERE id=?"
  );
  const contents = (refSeed as { contents: RefSeedAccount[] }).contents;
  // NIGHT HATCH の参考アカウントは管理画面「TikTok取り込み」から入れる（初期データは空）。
  // 以前の看板（BRIDGE / FOOD）の初期データが残っていたら取り除く。
  const tx = db.transaction(() => {
    const drop = [
      ...LEGACY_REF_HANDLES,
      // 以前の ref-seed.json に入っていた、飲食・美容などの初期データ（source が空で、以前の看板の業種のもの）
      ...(db
        .prepare(`SELECT handle FROM ref_accounts WHERE source = '' AND industry IN (${LEGACY_INDUSTRIES.map(() => "?").join(",")})`)
        .all(...LEGACY_INDUSTRIES) as { handle: string }[]).map((r) => r.handle),
    ];
    const delStats = db.prepare("DELETE FROM ref_video_stats WHERE video_id IN (SELECT v.id FROM ref_videos v JOIN ref_accounts a ON a.id = v.account_id WHERE a.handle = ?)");
    const delVideos = db.prepare("DELETE FROM ref_videos WHERE account_id IN (SELECT id FROM ref_accounts WHERE handle = ?)");
    const delAccount = db.prepare("DELETE FROM ref_accounts WHERE handle = ?");
    for (const h of drop) {
      delStats.run(h);
      delVideos.run(h);
      delAccount.run(h);
    }
    for (const c of contents) {
      const handle = "@" + c.userId;
      const industry = CATEGORY_JA[c.category?.[0] ?? ""] ?? "その他";
      const icon = c.userIcon?.url ?? "";
      const profile = (c.profileUrl ?? "").split("?")[0];
      const existingId = byHandle.get(handle);
      if (existingId) {
        update.run(c.userName, industry, c.followers ?? 0, icon, profile, c.videoCount ?? 0, existingId);
      } else {
        insert.run(crypto.randomUUID(), c.userName, handle, industry, c.followers ?? 0, c.bio ?? "", icon, profile, c.videoCount ?? 0);
        byHandle.set(handle, "new");
      }
    }
  });
  tx();
}

/** TikTok取り込みの検索ワード（業態タブと対応）。NIGHT_HATCH_DESIGN.md 9 の案 */
export const TIKTOK_SEARCH_SEED: [string, string][] = [
  ["バーテンダー カクテル", "バー"],
  ["ショットバー", "バー"],
  ["バー 開店準備", "バー"],
  ["ガールズバー 求人", "ガールズバー"],
  ["スナック ママ", "スナック"],
  ["キャバクラ 体入", "キャバクラ"],
  ["キャバクラ 求人", "キャバクラ"],
  ["キャバクラ イベント", "キャバクラ"],
  ["ラウンジ 求人", "ラウンジ"],
  ["ナイトワーク 求人", "キャバクラ"],
];

/**
 * 2回目の初期値（2026-09-28）: お店の公式アカウントを拾いやすい検索語・タグ。
 * 例として名前の挙がった JUNGLE TOKYO（歌舞伎町）も入れておく。
 */
export const TIKTOK_STORE_SEED: ["search" | "hashtag", string, string][] = [
  ["search", "ジャングル東京", "キャバクラ"],
  ["hashtag", "jungletokyo", "キャバクラ"],
  ["search", "キャバクラ 公式", "キャバクラ"],
  ["search", "歌舞伎町 キャバクラ 公式", "キャバクラ"],
  ["search", "キャバクラ 店内紹介", "キャバクラ"],
  ["search", "ラウンジ 公式", "ラウンジ"],
  ["search", "会員制ラウンジ 店内", "ラウンジ"],
  ["search", "ガールズバー 公式", "ガールズバー"],
  ["search", "スナック 公式", "スナック"],
  ["search", "バー 店内紹介", "バー"],
  ["search", "オーセンティックバー", "バー"],
];

/** 3回目の初期値（2026-09-28）: ホストクラブを対象に加えたときの、店舗・グループ公式を拾う検索語 */
export const TIKTOK_HOST_SEED: ["search" | "hashtag", string, string][] = [
  ["search", "ホストクラブ 公式", "ホストクラブ"],
  ["search", "歌舞伎町 ホストクラブ 公式", "ホストクラブ"],
  ["search", "ホストクラブ 店内紹介", "ホストクラブ"],
  ["search", "ホストクラブ グループ 公式", "ホストクラブ"],
  ["search", "ホスト 求人 公式", "ホストクラブ"],
];

// デプロイ先では永続ボリュームのパスを DATA_DIR で指定する（例: /data）
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export function hashPassword(password: string, salt?: string) {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    points INTEGER NOT NULL,
    deadline TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '募集中',
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS brand_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    facts TEXT NOT NULL DEFAULT '[]',
    stances TEXT NOT NULL DEFAULT '[]',
    ng_items TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS agent_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    messages TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    partner_id TEXT,
    title TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '下書き',
    issued_on TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    partner_id TEXT,
    title TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '下書き',
    issued_on TEXT NOT NULL,
    due_on TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS deliverables (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT '提出',
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    upload_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    delivered_on TEXT NOT NULL DEFAULT '',
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT '式',
    unit_price INTEGER NOT NULL DEFAULT 0,
    tax_rate INTEGER NOT NULL DEFAULT 10,
    reduced INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS issuer_profiles (
    user_id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL DEFAULT '',
    registration_no TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    tel TEXT NOT NULL DEFAULT '',
    bank_name TEXT NOT NULL DEFAULT '',
    branch_name TEXT NOT NULL DEFAULT '',
    account_type TEXT NOT NULL DEFAULT '普通',
    account_no TEXT NOT NULL DEFAULT '',
    account_holder TEXT NOT NULL DEFAULT '',
    seal_upload_id TEXT,
    rounding TEXT NOT NULL DEFAULT '切り捨て',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ng_words (
    id TEXT PRIMARY KEY,
    word TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ref_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    industry TEXT NOT NULL,
    followers INTEGER NOT NULL DEFAULT 0,
    bio TEXT NOT NULL DEFAULT '',
    icon_url TEXT NOT NULL DEFAULT '',
    profile_url TEXT NOT NULL DEFAULT '',
    video_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- ポイントの追加購入。Stripeの決済セッション1件につき1行。
  -- session_id を主キーにすることで、同じ通知が二重に届いても二重付与にならない。
  CREATE TABLE IF NOT EXISTS point_purchases (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    amount_jpy INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS industries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS industry_requests (
    id TEXT PRIMARY KEY,
    industry_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    handled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  -- 同じ人が同じ業種を連打しても1件しか入らないようにする
  CREATE UNIQUE INDEX IF NOT EXISTS ux_industry_requests
    ON industry_requests(industry_name, user_id, handled);
  CREATE TABLE IF NOT EXISTS ref_videos (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    caption TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    thumbnail TEXT NOT NULL DEFAULT '',
    hue INTEGER NOT NULL DEFAULT 220,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS point_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    kind TEXT NOT NULL,
    memo TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL DEFAULT '',
    size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications (user_id, created_at DESC);
  `);

  const count = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
  if (count === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (id, email, name, password, role, points) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const clientId = crypto.randomUUID();
    const adminId = crypto.randomUUID();
    const freelancerId = crypto.randomUUID();
    insertUser.run(clientId, "client@example.com", "デモクライアント", hashPassword("demo1234"), "client", 65);
    insertUser.run(adminId, "admin@example.com", "管理者", hashPassword("demo1234"), "admin", 0);
    insertUser.run(freelancerId, "creator@example.com", "佐藤クリエイター", hashPassword("demo1234"), "freelancer", 120);

    const insertProject = db.prepare(
      "INSERT INTO projects (id, user_id, title, category, description, points, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const pj of BRAND.demoProjects) {
      insertProject.run(crypto.randomUUID(), clientId, pj.title, pj.category, pj.description, pj.points, pj.deadline, pj.status);
    }

    const insertNg = db.prepare("INSERT INTO ng_words (id, word) VALUES (?, ?)");
    for (const w of ["絶対に稼げる", "日本一", "ポッキリ", "高校生可", "18歳未満可", "即日高収入保証"]) {
      insertNg.run(crypto.randomUUID(), w);
    }

    const insertChat = db.prepare("INSERT INTO chat_messages (id, from_id, to_id, body) VALUES (?, ?, ?, ?)");
    insertChat.run(crypto.randomUUID(), freelancerId, clientId, "はじめまして、佐藤です。求人原稿の件で、待遇について質問があります。");
    insertChat.run(crypto.randomUUID(), clientId, freelancerId, "ありがとうございます。何でも聞いてください。");
  }

  const accCols = (db.prepare("PRAGMA table_info(ref_accounts)").all() as { name: string }[]).map((c) => c.name);
  for (const [col, def] of [
    ["icon_url", "TEXT NOT NULL DEFAULT ''"],
    ["profile_url", "TEXT NOT NULL DEFAULT ''"],
    ["video_count", "INTEGER NOT NULL DEFAULT 0"],
    // TikTok自動取り込みの記録
    ["last_synced_at", "TEXT NOT NULL DEFAULT ''"],
    ["source", "TEXT NOT NULL DEFAULT ''"], // 'apify' なら自動取り込みで作られた
    ["persona", "TEXT NOT NULL DEFAULT ''"], // AI審査で付けた一言（例: 福岡のネイルサロン公式）
    ["classified_at", "TEXT NOT NULL DEFAULT ''"], // AI審査済みの日時
  ] as const) {
    if (!accCols.includes(col)) db.exec(`ALTER TABLE ref_accounts ADD COLUMN ${col} ${def}`);
  }

  // チャットを案件ごとのスレッドに分け、ファイルを添付できるようにするための列
  const chatCols = (db.prepare("PRAGMA table_info(chat_messages)").all() as { name: string }[]).map((c) => c.name);
  for (const [col, def] of [["project_id", "TEXT"], ["upload_id", "TEXT"]] as const) {
    if (!chatCols.includes(col)) db.exec(`ALTER TABLE chat_messages ADD COLUMN ${col} ${def}`);
  }

  // 制作メニューをSODATSUの作業ポイント表に合わせたときの旧カテゴリ移行
  for (const [before, after] of [
    ["動画編集", "動画編集（3分）"],
    ["台本作成", "台本作成（ショート）"],
    ["LP作成・修正", "LPファーストビュー"],
    ["サムネイル作成", "サムネイル作成"],
    ["Instagram投稿", "投稿文＋画像"],
    ["チラシ作成", "投稿文＋画像"],
    ["バナー作成", "投稿文＋画像"],
    ["名刺作成", "投稿文＋画像"],
    ["SEO記事作成", "投稿文＋画像"],
    ["LINE構築", "LPファーストビュー"],
  ] as const) {
    if (before !== after) db.prepare("UPDATE projects SET category = ? WHERE category = ?").run(after, before);
  }

  // Stripe連携で追加した列
  const issuerCols = (db.prepare("PRAGMA table_info(issuer_profiles)").all() as { name: string }[]).map((c) => c.name);
  for (const [col, def] of [
    ["stripe_account_id", "TEXT"],
    ["stripe_account_name", "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    if (!issuerCols.includes(col)) db.exec(`ALTER TABLE issuer_profiles ADD COLUMN ${col} ${def}`);
  }

  // チャットのオンライン表示用
  const userCols = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
  if (!userCols.includes("last_seen_at")) db.exec("ALTER TABLE users ADD COLUMN last_seen_at TEXT");
  // 営業AIの会話を発注エージェントの会話と分ける
  const agentCols = (db.prepare("PRAGMA table_info(agent_sessions)").all() as { name: string }[]).map((c) => c.name);
  if (!agentCols.includes("kind")) db.exec("ALTER TABLE agent_sessions ADD COLUMN kind TEXT NOT NULL DEFAULT 'agent'");
  // 会話のピン留め（一覧の上に固定）
  if (!agentCols.includes("pinned")) db.exec("ALTER TABLE agent_sessions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0");

  // AI利用上限（プラン）と追加購入分
  if (!userCols.includes("plan")) db.exec("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'light'");
  if (!userCols.includes("ai_extra")) db.exec("ALTER TABLE users ADD COLUMN ai_extra INTEGER NOT NULL DEFAULT 0");
  // デモの発注者はスタンダードプラン（採用と集客の両方を回す、いちばん多い想定）で見せる
  if (count === 0) db.prepare("UPDATE users SET plan = 'standard' WHERE email = 'client@example.com'").run();
  db.exec(`
  CREATE TABLE IF NOT EXISTS ai_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    task TEXT NOT NULL,
    day TEXT NOT NULL,
    month TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ai_usage_user_day ON ai_usage (user_id, kind, day);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month ON ai_usage (user_id, kind, month);
  `);

  // ─── ハニーP台帳・プラン契約・納品検収・月次レポート ───
  // プラン契約の状態（plan は AI上限にも使うので既存。契約中かどうかを分けて持つ）
  const userCols2 = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
  for (const [col, def] of [
    ["plan_active", "INTEGER NOT NULL DEFAULT 0"],
    ["plan_since", "TEXT"],
    ["stripe_customer_id", "TEXT"],
    ["stripe_subscription_id", "TEXT"],
    ["tiktok_handle", "TEXT NOT NULL DEFAULT ''"], // 月次レポートで動画の伸びを出すための紐付け
  ] as const) {
    if (!userCols2.includes(col)) db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
  }
  db.exec(`
  CREATE TABLE IF NOT EXISTS point_grants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    remaining INTEGER NOT NULL,
    kind TEXT NOT NULL,
    memo TEXT NOT NULL DEFAULT '',
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_point_grants_user ON point_grants (user_id, expires_at);
  -- 提出物の検収状態と、動画の再生位置つき修正指示
  CREATE TABLE IF NOT EXISTS deliverable_comments (
    id TEXT PRIMARY KEY,
    deliverable_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    at_seconds REAL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_dcomments ON deliverable_comments (deliverable_id, created_at);
  `);
  // 月額メニュー（HP保守・SNS運用など）の自動継続
  db.exec(`
  CREATE TABLE IF NOT EXISTS menu_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    base_title TEXT NOT NULL,
    detail TEXT,
    points INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    last_month TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
  const delCols = (db.prepare("PRAGMA table_info(deliverables)").all() as { name: string }[]).map((c) => c.name);
  if (!delCols.includes("status")) db.exec("ALTER TABLE deliverables ADD COLUMN status TEXT NOT NULL DEFAULT ''");
  // 台帳が無い時代の残高を、失効しない付与として1回だけ取り込む
  db.prepare(
    `INSERT INTO point_grants (id, user_id, amount, remaining, kind, memo)
     SELECT lower(hex(randomblob(16))), u.id, u.points, u.points, 'seed', '台帳導入前の残高'
       FROM users u
      WHERE u.points > 0 AND NOT EXISTS (SELECT 1 FROM point_grants g WHERE g.user_id = u.id)`
  ).run();

  // 案件詳細ページ用に追加した列（担当者・依頼日）
  const projCols = (db.prepare("PRAGMA table_info(projects)").all() as { name: string }[]).map((c) => c.name);
  for (const [col, def] of [
    ["assignee_id", "TEXT"],
    ["requested_on", "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    if (!projCols.includes(col)) db.exec(`ALTER TABLE projects ADD COLUMN ${col} ${def}`);
  }
  // 既存の案件は登録日を依頼日として埋める
  db.exec("UPDATE projects SET requested_on = date(created_at) WHERE requested_on = ''");

  // インボイス（適格請求書）対応で追加した列
  const invCols = (db.prepare("PRAGMA table_info(invoices)").all() as { name: string }[]).map((c) => c.name);
  for (const [col, def] of [
    ["invoice_no", "TEXT NOT NULL DEFAULT ''"],
    ["partner_name", "TEXT NOT NULL DEFAULT ''"],
    ["partner_address", "TEXT NOT NULL DEFAULT ''"],
    ["subtotal", "INTEGER NOT NULL DEFAULT 0"],
    ["tax_total", "INTEGER NOT NULL DEFAULT 0"],
    ["note", "TEXT NOT NULL DEFAULT ''"],
    ["project_id", "TEXT"],
    // Stripe決済リンクの状態
    ["stripe_session_id", "TEXT"],
    ["payment_url", "TEXT NOT NULL DEFAULT ''"],
    ["paid_at", "TEXT"],
  ] as const) {
    if (!invCols.includes(col)) db.exec(`ALTER TABLE invoices ADD COLUMN ${col} ${def}`);
  }

  const videoCols = (db.prepare("PRAGMA table_info(ref_videos)").all() as { name: string }[]).map((c) => c.name);
  // TikTok自動取り込み（Apify）で入る数値。手入力の動画は0のまま
  for (const [col, def] of [
    ["thumbnail", "TEXT NOT NULL DEFAULT ''"],
    ["views", "INTEGER NOT NULL DEFAULT 0"],
    ["likes", "INTEGER NOT NULL DEFAULT 0"],
    ["comments", "INTEGER NOT NULL DEFAULT 0"],
    ["shares", "INTEGER NOT NULL DEFAULT 0"],
    ["posted_at", "TEXT NOT NULL DEFAULT ''"],
    ["fetched_at", "TEXT NOT NULL DEFAULT ''"],
    ["source_id", "TEXT NOT NULL DEFAULT ''"], // TikTok側の動画ID。同じ動画を二重登録しないための鍵
  ] as const) {
    if (!videoCols.includes(col)) db.exec(`ALTER TABLE ref_videos ADD COLUMN ${col} ${def}`);
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_ref_videos_source ON ref_videos(source_id) WHERE source_id <> ''");
  db.exec("CREATE INDEX IF NOT EXISTS ix_ref_videos_views ON ref_videos(views DESC)");

  // 再生数の履歴（日ごと）。「今週伸びた動画」はこの差分で出す
  db.exec(`
    CREATE TABLE IF NOT EXISTS ref_video_stats (
      video_id TEXT NOT NULL,
      day TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (video_id, day)
    );
    -- 自動取り込みの設定。profile=@ハンドル、search=検索ワード、hashtag=#タグ
    CREATE TABLE IF NOT EXISTS tiktok_queries (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      value TEXT NOT NULL,
      industry TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      last_result TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tiktok_queries ON tiktok_queries(kind, value);
    -- 取り込みの実行記録（管理画面に出す）
    CREATE TABLE IF NOT EXISTS tiktok_sync_runs (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      queries INTEGER NOT NULL DEFAULT 0,
      videos INTEGER NOT NULL DEFAULT 0,
      accounts INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL DEFAULT ''
    );
  `);

  // ─── 公開サイト「Night HATCH -ナイト・ハッチ-」の掲載情報 ───
  // 契約店（client）1店につき1行。公開されるのは store_opt_in・admin_published・line_url の3つがそろったときだけ。
  // photos は uploads.id の配列（JSON）、tiktok_urls は手入力の TikTok 動画URLの配列（JSON）。
  // user_id が NULL の行は開発用のデモ掲載（ユーザーに紐づかない）。
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      store_name TEXT NOT NULL DEFAULT '',
      genre TEXT NOT NULL DEFAULT '',
      prefecture TEXT NOT NULL DEFAULT '東京都',
      area TEXT NOT NULL DEFAULT '',
      access TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      hours TEXT NOT NULL DEFAULT '',
      holidays TEXT NOT NULL DEFAULT '',
      catch_copy TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      price_system TEXT NOT NULL DEFAULT '',
      recruit_hiring INTEGER NOT NULL DEFAULT 0,
      recruit_trial_wage TEXT NOT NULL DEFAULT '',
      recruit_wage TEXT NOT NULL DEFAULT '',
      recruit_benefits TEXT NOT NULL DEFAULT '',
      recruit_hours TEXT NOT NULL DEFAULT '',
      recruit_message TEXT NOT NULL DEFAULT '',
      line_url TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      tiktok_handle TEXT NOT NULL DEFAULT '',
      tiktok_urls TEXT NOT NULL DEFAULT '[]',
      photos TEXT NOT NULL DEFAULT '[]',
      store_opt_in INTEGER NOT NULL DEFAULT 0,
      agreed_at TEXT,
      admin_published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- 公式LINEボタンのクリック数（個人情報・IPは持たない）。kind は 'drink'（飲みに行く）か 'work'（働く）
    CREATE TABLE IF NOT EXISTS listing_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_listing_clicks ON listing_clicks (listing_id, created_at);
    -- 社内リサーチ用: OpenStreetMap（ODbL）から取り込んだ全国のバー・パブ・ナイトクラブ。お店の掲載とは別物
    CREATE TABLE IF NOT EXISTS osm_bars (
      osm_id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      area TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      hours TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_osm_bars_area ON osm_bars (area);
  `);

  // 参考アカウント・動画の初期データは入れない（FOOD 時代の飲食店アカウントは syncRefAccounts で掃除する）。
  // お手本動画は管理画面「TikTok取り込み」から追加する（spec 9: 取り込み後は全件目視）。
}

/**
 * 業種タブの初期値。以降は管理画面から追加・並べ替えできる。
 * 参考アカウントがまだ0件の業種も「準備中」として最初から並べる。
 * 参考アカウントの整理（syncRefAccounts）のあとに呼ぶこと。
 */
function seedIndustries(db: Database.Database) {
  // 看板切替前に入った、別の看板のデモ案件を消す（提出物などが無いものだけ）
  {
    const delDemo = db.prepare(
      `DELETE FROM projects WHERE title = ? AND category = ?
         AND id NOT IN (SELECT project_id FROM deliverables)`
    );
    for (const pj of LEGACY_BRIDGE_DEMO_PROJECTS) delDemo.run(pj.title, pj.category);
    // FOOD 版のデモ案件（テスト食堂）
    db.prepare(
      `DELETE FROM projects WHERE title LIKE 'テスト食堂の%'
         AND id NOT IN (SELECT project_id FROM deliverables)`
    ).run();
    // NIGHT 版のデモ案件が無ければ、デモクライアントに入れる
    const client = db.prepare("SELECT id FROM users WHERE email = 'client@example.com'").get() as { id: string } | undefined;
    if (client) {
      const exists = db.prepare("SELECT COUNT(*) AS c FROM projects WHERE title = ? AND category = ?");
      const ins = db.prepare(
        "INSERT INTO projects (id, user_id, title, category, description, points, deadline, status, requested_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'))"
      );
      for (const pj of BRAND.demoProjects) {
        if ((exists.get(pj.title, pj.category) as { c: number }).c === 0) {
          ins.run(crypto.randomUUID(), client.id, pj.title, pj.category, pj.description, pj.points, pj.deadline, pj.status);
        }
      }
    }
  }
  // どの看板の初期値を入れたかを覚えておく。看板を切り替えて起動し直したとき、
  // 前の看板の初期値のうち使われていないものは消し、今の看板の初期値を足す。
  db.exec("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  const seededFor = (db.prepare("SELECT value FROM app_meta WHERE key = 'industries_seeded_for'").get() as { value: string } | undefined)?.value;
  if (seededFor !== BRAND.id) {
    const others = ALL_BRAND_INDUSTRIES.filter((n) => !BRAND.industries.includes(n));
    const delUnused = db.prepare(
      `DELETE FROM industries WHERE name = ?
         AND name NOT IN (SELECT DISTINCT industry FROM ref_accounts)
         AND name NOT IN (SELECT industry_name FROM industry_requests)`
    );
    others.forEach((n) => delUnused.run(n));
    const insIndustry = db.prepare("INSERT OR IGNORE INTO industries (id, name, sort_order) VALUES (?, ?, ?)");
    BRAND.industries.forEach((name, i) => insIndustry.run(crypto.randomUUID(), name, (i + 1) * 10));
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('industries_seeded_for', ?)").run(BRAND.id);
  }
  // TikTok取り込みの検索ワードの初期値（NIGHT_HATCH_DESIGN.md 9）。1回だけ入れる。
  // 取り込みは APIFY_TOKEN を入れてから管理画面で手動で行う（初回の自動取り込みはしない。scheduler.ts 参照）。
  const querySeeded = db.prepare("SELECT value FROM app_meta WHERE key = 'tiktok_queries_seeded_for'").get() as { value: string } | undefined;
  if (querySeeded?.value !== BRAND.id) {
    const insQuery = db.prepare("INSERT OR IGNORE INTO tiktok_queries (id, kind, value, industry) VALUES (?, 'search', ?, ?)");
    for (const [value, industry] of TIKTOK_SEARCH_SEED) insQuery.run(crypto.randomUUID(), value, industry);
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('tiktok_queries_seeded_for', ?)").run(BRAND.id);
  }
  // お店の公式アカウント向けの検索語・タグ（2回目の初期値）。1回だけ入れる。
  const storeSeeded = db.prepare("SELECT value FROM app_meta WHERE key = 'tiktok_store_queries_v1'").get() as { value: string } | undefined;
  if (!storeSeeded) {
    const insStore = db.prepare("INSERT OR IGNORE INTO tiktok_queries (id, kind, value, industry) VALUES (?, ?, ?, ?)");
    for (const [kind, value, industry] of TIKTOK_STORE_SEED) insStore.run(crypto.randomUUID(), kind, value, industry);
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('tiktok_store_queries_v1', '1')").run();
  }
  // ホストクラブを対象に追加（2026-09-28）。既存の本番DBにも業種タブと検索語を1回だけ足す
  const hostSeeded = db.prepare("SELECT value FROM app_meta WHERE key = 'host_club_v1'").get() as { value: string } | undefined;
  if (!hostSeeded && BRAND.industries.includes("ホストクラブ")) {
    db.prepare(
      "INSERT OR IGNORE INTO industries (id, name, sort_order) VALUES (?, 'ホストクラブ', (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM industries))"
    ).run(crypto.randomUUID());
    const insHost = db.prepare("INSERT OR IGNORE INTO tiktok_queries (id, kind, value, industry) VALUES (?, ?, ?, ?)");
    for (const [kind, value, industry] of TIKTOK_HOST_SEED) insHost.run(crypto.randomUUID(), kind, value, industry);
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('host_club_v1', '1')").run();
  }
  // 参考アカウント側にしかない業種名は、取りこぼさないよう自動で末尾に足す
  db.prepare(
    `INSERT OR IGNORE INTO industries (id, name, sort_order)
     SELECT lower(hex(randomblob(16))), a.industry,
            (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM industries)
       FROM (SELECT DISTINCT industry FROM ref_accounts WHERE industry <> '') a
      WHERE a.industry NOT IN (SELECT name FROM industries)`
  ).run();

}

/**
 * 公開サイトの掲載のデモ。1回だけ入れる。
 *  - デモのお店（client@example.com）に「テストラウンジ」（六本木のラウンジ）。お店の同意は済み・運営の公開は未
 *  - 開発環境（NODE_ENV !== 'production'）では、それを公開にし、架空のお店を2つ足してサイトを見られるようにする
 */
function seedListings(db: Database.Database) {
  const done = db.prepare("SELECT value FROM app_meta WHERE key = 'listings_seeded_v1'").get();
  if (done) return;
  const dev = process.env.NODE_ENV !== "production";
  const client = db.prepare("SELECT id FROM users WHERE email = 'client@example.com'").get() as { id: string } | undefined;
  const ins = db.prepare(
    `INSERT OR IGNORE INTO listings (id, user_id, slug, store_name, genre, prefecture, area, access, address, hours, holidays,
       catch_copy, description, price_system, recruit_hiring, recruit_trial_wage, recruit_wage, recruit_benefits, recruit_hours,
       recruit_message, line_url, tiktok_handle, store_opt_in, agreed_at, admin_published, published_at)
     VALUES (@id, @user_id, @slug, @store_name, @genre, '東京都', @area, @access, @address, @hours, @holidays,
       @catch_copy, @description, @price_system, @recruit_hiring, @recruit_trial_wage, @recruit_wage, @recruit_benefits, @recruit_hours,
       @recruit_message, @line_url, @tiktok_handle, 1, datetime('now'), @admin_published, CASE WHEN @admin_published = 1 THEN datetime('now') END)`
  );
  const tx = db.transaction(() => {
    if (client) {
      ins.run({
        id: crypto.randomUUID(), user_id: client.id, slug: "test-lounge", store_name: "テストラウンジ", genre: "ラウンジ",
        area: "六本木", access: "六本木駅 3番出口から徒歩2分", address: "",
        hours: "20:00〜翌1:00（L.O. 0:30）", holidays: "日曜・祝日",
        catch_copy: "六本木の夜に、静かな一杯と会話を。",
        description: "落ち着いた照明とソファ席の、大人のためのラウンジです（デモ用の架空のお店です）。\nおひとりさまも、接待のあとの二次会も。キャストとゆっくりお話ししながら、ウイスキーやシャンパンをお楽しみください。",
        price_system: "セット料金（60分）: 8,000円\n延長（30分）: 4,000円\n指名料: 2,000円\n同伴料: 3,000円\nTAX・サービス料: 20%\nカード手数料: なし\n※ボトルの料金は店内のメニューでご確認いただけます",
        recruit_hiring: 1, recruit_trial_wage: "体入時給 4,000円", recruit_wage: "時給 3,500円〜（経験・能力により優遇）",
        recruit_benefits: "日払いOK・終電上がりOK・ヘアメイク無料・衣装貸出・ノルマなし",
        recruit_hours: "20:00〜翌1:00のうち週1日・3時間〜",
        recruit_message: "未経験から始めた先輩がほとんどです。まずは体入で、お店の雰囲気を見に来てください。",
        line_url: "https://lin.ee/test-lounge-demo", tiktok_handle: "", admin_published: dev ? 1 : 0,
      });
    }
    if (dev) {
      ins.run({
        id: crypto.randomUUID(), user_id: null, slug: "demo-bar-shinbashi", store_name: "バー月あかり（デモ）", genre: "バー",
        area: "新橋", access: "JR新橋駅 烏森口から徒歩3分", address: "東京都港区新橋2丁目",
        hours: "18:00〜翌2:00", holidays: "不定休",
        catch_copy: "仕事帰りに一杯だけ。カウンター8席のショットバー。",
        description: "（開発用の架空のお店です）\nバーテンダーがその日の気分に合わせてカクテルをおつくりします。ウイスキーは常時80種類。",
        price_system: "チャージ: 500円\nカクテル: 900円〜\nウイスキー: 800円〜\nサービス料: なし",
        recruit_hiring: 1, recruit_trial_wage: "", recruit_wage: "時給 1,500円〜",
        recruit_benefits: "まかないあり・交通費支給・未経験歓迎", recruit_hours: "18:00〜24:00のうち週2日〜",
        recruit_message: "バーテンダー見習いを募集しています。", line_url: "https://lin.ee/demo-bar", tiktok_handle: "", admin_published: 1,
      });
      ins.run({
        id: crypto.randomUUID(), user_id: null, slug: "demo-club-kabukicho", store_name: "CLUB ルミエール（デモ）", genre: "キャバクラ",
        area: "歌舞伎町", access: "西武新宿駅から徒歩4分", address: "東京都新宿区歌舞伎町1丁目",
        hours: "20:00〜翌1:00", holidays: "日曜",
        catch_copy: "明朗会計の、歌舞伎町のキャバクラ。",
        description: "（開発用の架空のお店です）\n料金はすべて店内・このページに掲示しています。初めての方も安心してどうぞ。",
        price_system: "セット料金（60分）: 6,000円（20:00〜21:00は5,000円）\n延長（30分）: 3,500円\n指名料: 2,000円\n場内指名: 1,000円\nTAX・サービス料: 25%",
        recruit_hiring: 1, recruit_trial_wage: "体入時給 5,000円", recruit_wage: "時給 4,000円〜",
        recruit_benefits: "日払い・送りあり・ヘアメイク無料・ノルマなし・WワークOK", recruit_hours: "20:00〜翌1:00 週1日〜",
        recruit_message: "", line_url: "https://lin.ee/demo-club", tiktok_handle: "", admin_published: 1,
      });
    }
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('listings_seeded_v1', '1')").run();
  });
  tx();
}

export function getDb(): Database.Database {
  if (!global.__db) {
    const fs = require("fs") as typeof import("fs");
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    global.__db = new Database(DB_PATH);
    init(global.__db);
    syncRefAccounts(global.__db);
    seedIndustries(global.__db);
    seedListings(global.__db);
  }
  return global.__db;
}
