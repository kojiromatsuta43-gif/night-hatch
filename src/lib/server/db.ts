import Database from "better-sqlite3";
import path from "path";
import { BRAND } from "../brand";
import { bridge } from "../brands/bridge";
import { food } from "../brands/food";
import crypto from "crypto";
import refSeed from "./ref-seed.json";

/** 全看板の業種初期値。看板を切り替えたときに、前の看板の初期値を見分けるために使う */
const ALL_BRAND_INDUSTRIES = Array.from(new Set([...bridge.industries, ...food.industries]));

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
  // 飲食店版（FOOD HATCH）には飲食の参考アカウントだけ入れる。
  // 美容・不動産などの初期データが入っていたら（看板切替前に起動した場合）取り除く。
  const wanted = (c: RefSeedAccount) => BRAND.id !== "food" || c.category?.[0] === "food_service";
  const tx = db.transaction(() => {
    if (BRAND.id === "food") {
      const drop = [
        ...contents.filter((c) => !wanted(c)).map((c) => "@" + c.userId),
        "@dr.norimoto",
        "@dragonamasora",
        // 開発用のミニ初期データのうち飲食以外
        "@rire_omotesando",
        "@force_gym",
        "@sakura_fudosan",
      ];
      const delVideos = db.prepare("DELETE FROM ref_videos WHERE account_id IN (SELECT id FROM ref_accounts WHERE handle = ?)");
      const delAccount = db.prepare("DELETE FROM ref_accounts WHERE handle = ?");
      for (const h of drop) {
        delVideos.run(h);
        delAccount.run(h);
      }
    }
    for (const c of contents) {
      if (!wanted(c)) continue;
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
    for (const w of ["絶対に儲かる", "必ず痩せる", "日本一", "完治"]) {
      insertNg.run(crypto.randomUUID(), w);
    }

    const insertChat = db.prepare("INSERT INTO chat_messages (id, from_id, to_id, body) VALUES (?, ?, ?, ?)");
    insertChat.run(crypto.randomUUID(), freelancerId, clientId, "はじめまして、佐藤です。チラシ案件について質問があります。");
    insertChat.run(crypto.randomUUID(), clientId, freelancerId, "ありがとうございます。何でも聞いてください。");
  }

  const accCols = (db.prepare("PRAGMA table_info(ref_accounts)").all() as { name: string }[]).map((c) => c.name);
  for (const [col, def] of [["icon_url", "TEXT NOT NULL DEFAULT ''"], ["profile_url", "TEXT NOT NULL DEFAULT ''"], ["video_count", "INTEGER NOT NULL DEFAULT 0"]] as const) {
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
  if (!videoCols.includes("thumbnail")) {
    db.exec("ALTER TABLE ref_videos ADD COLUMN thumbnail TEXT NOT NULL DEFAULT ''");
  }

  const licensed = db.prepare("SELECT COUNT(*) AS c FROM ref_accounts WHERE handle = '@higakiyakitori'").get() as { c: number };
  if (licensed.c === 0) {
    const insertLicensed = db.prepare(
      "INSERT INTO ref_accounts (id, name, handle, industry, followers, bio) VALUES (?, ?, ?, ?, ?, ?)"
    );
    insertLicensed.run(crypto.randomUUID(), "焼鳥どん 日垣兄弟", "@higakiyakitori", "飲食", 318400, "全席禁煙の全部大歓迎焼鳥屋 / お子様・お一人様歓迎 店舗一覧・ご予約・FC・通販は下記リンク");
    if (BRAND.id !== "food") {
      insertLicensed.run(crypto.randomUUID(), "クマ取り名人・則本翔", "@dr.norimoto", "美容クリニック", 421700, "CHINOWA CLINIC院長 / 表参道・原宿 ひたすらクマを消す人！症例一覧・ご予約はInstagramから");
      insertLicensed.run(crypto.randomUUID(), "ドラゴン細井 / 美容外科医", "@dragonamasora", "美容クリニック", 238100, "渋谷アマソラクリニック院長 / 医学部受験塾MEDUCATE塾長 形成外科・美容外科医");
    }
  }

  const refCount = (db.prepare("SELECT COUNT(*) AS c FROM ref_accounts").get() as { c: number }).c;
  if (refCount === 0) {
    const insertAccount = db.prepare(
      "INSERT INTO ref_accounts (id, name, handle, industry, followers, bio) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const insertVideo = db.prepare(
      "INSERT INTO ref_videos (id, account_id, caption, url, hue) VALUES (?, ?, ?, ?, ?)"
    );
    const seed: [string, string, string, number, string, [string, number][]][] = [
      ["ヘアサロン RIRE 表参道", "@rire_omotesando", "美容室", 284000, "表参道の髪質改善サロン / ビフォーアフター動画が人気",
        [["【衝撃】ブリーチ3回の髪がこうなる…髪質改善ビフォーアフター", 280],
         ["美容師が絶対にやらないNGヘアケア3選", 310],
         ["「前髪失敗した…」を3分で直す方法", 340],
         ["\u00a5300のアレで艶髪になる裏ワザ", 20],
         ["朝5分でできる巻き髪ルーティン", 50]]],
      ["炭火焼鳥 とり吉", "@torikichi_official", "飲食", 156000, "全席禁煙の焼鳥屋 / 仕込み動画とまかない飯でバズり中",
        [["開店前の仕込み、全部見せます【焼鳥屋の朝】", 25],
         ["まかない対決！新人vs大将", 45],
         ["焼鳥屋が教える家庭で失敗しない焼き方", 15],
         ["常連さんしか知らない裏メニュー3選", 0]]],
      ["パーソナルジム FORCE", "@force_gym", "フィットネス", 198000, "続けられるダイエット / トレーナーの掛け合いが人気",
        [["【検証】1ヶ月毎日スクワットしたら脚はこうなる", 200],
         ["ダイエット中に絶対食べていいコンビニ飯5選", 150],
         ["トレーナーが太っていた頃の話", 260],
         ["運動ゼロで痩せる方法を聞かれた時の返答", 230]]],
      ["さくら不動産 中央店", "@sakura_fudosan", "不動産", 92000, "内見動画とお部屋探しの豆知識 / 若手社員が出演",
        [["家賃5万円で駅徒歩3分の部屋、中はこうなってます", 210],
         ["不動産屋が教える内見で絶対見るべき3ヶ所", 190],
         ["やばい物件の見分け方【実例あり】", 250]]],
    ];
    for (const [name, handle, industry, followers, bio, videos] of seed) {
      const accountId = crypto.randomUUID();
      insertAccount.run(accountId, name, handle, industry, followers, bio);
      for (const [caption, hue] of videos) {
        insertVideo.run(crypto.randomUUID(), accountId, caption, "", hue);
      }
    }
  }
}

/**
 * 業種タブの初期値。以降は管理画面から追加・並べ替えできる。
 * 参考アカウントがまだ0件の業種も「準備中」として最初から並べる。
 * 参考アカウントの整理（syncRefAccounts）のあとに呼ぶこと。
 */
function seedIndustries(db: Database.Database) {
  // 看板切替前に入った、別の看板のデモ案件を消す（提出物などが無いものだけ）
  if (BRAND.id === "food") {
    const delDemo = db.prepare(
      `DELETE FROM projects WHERE title = ? AND category = ?
         AND id NOT IN (SELECT project_id FROM deliverables)`
    );
    for (const pj of bridge.demoProjects) delDemo.run(pj.title, pj.category);
    // 飲食版のデモ案件が無ければ、デモクライアントに入れる
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
  // 参考アカウント側にしかない業種名は、取りこぼさないよう自動で末尾に足す
  db.prepare(
    `INSERT OR IGNORE INTO industries (id, name, sort_order)
     SELECT lower(hex(randomblob(16))), a.industry,
            (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM industries)
       FROM (SELECT DISTINCT industry FROM ref_accounts WHERE industry <> '') a
      WHERE a.industry NOT IN (SELECT name FROM industries)`
  ).run();

}

export function getDb(): Database.Database {
  if (!global.__db) {
    const fs = require("fs") as typeof import("fs");
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    global.__db = new Database(DB_PATH);
    init(global.__db);
    syncRefAccounts(global.__db);
    seedIndustries(global.__db);
  }
  return global.__db;
}
