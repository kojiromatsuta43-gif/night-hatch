import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
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
    insertProject.run(crypto.randomUUID(), clientId, "地域イベント告知チラシ", "チラシ作成", "秋の商店街イベントの告知チラシ", 21, "2026-08-30", "募集中");
    insertProject.run(crypto.randomUUID(), clientId, "採用ショート動画 台本", "台本作成", "エンジニア採用向けTikTok台本", 4, "2026-09-05", "制作待ち");
    insertProject.run(crypto.randomUUID(), clientId, "新商品LPファーストビュー修正", "LP作成・修正", "CVR改善のためのFV差し替え", 40, "2026-09-10", "フィードバック");
    insertProject.run(crypto.randomUUID(), clientId, "会社紹介動画編集", "動画編集", "展示会用90秒動画の編集", 30, "2026-08-25", "完了");

    const insertNg = db.prepare("INSERT INTO ng_words (id, word) VALUES (?, ?)");
    for (const w of ["絶対に儲かる", "必ず痩せる", "日本一", "完治"]) {
      insertNg.run(crypto.randomUUID(), w);
    }

    const insertChat = db.prepare("INSERT INTO chat_messages (id, from_id, to_id, body) VALUES (?, ?, ?, ?)");
    insertChat.run(crypto.randomUUID(), freelancerId, clientId, "はじめまして、佐藤です。チラシ案件について質問があります。");
    insertChat.run(crypto.randomUUID(), clientId, freelancerId, "ありがとうございます。何でも聞いてください。");
  }

  const videoCols = (db.prepare("PRAGMA table_info(ref_videos)").all() as { name: string }[]).map((c) => c.name);
  if (!videoCols.includes("thumbnail")) {
    db.exec("ALTER TABLE ref_videos ADD COLUMN thumbnail TEXT NOT NULL DEFAULT ''");
  }

  const licensed = db.prepare("SELECT COUNT(*) AS c FROM ref_accounts WHERE handle = '@dr.norimoto'").get() as { c: number };
  if (licensed.c === 0) {
    const insertLicensed = db.prepare(
      "INSERT INTO ref_accounts (id, name, handle, industry, followers, bio) VALUES (?, ?, ?, ?, ?, ?)"
    );
    insertLicensed.run(crypto.randomUUID(), "クマ取り名人・則本翔", "@dr.norimoto", "美容クリニック", 421700, "CHINOWA CLINIC院長 / 表参道・原宿 ひたすらクマを消す人！症例一覧・ご予約はInstagramから");
    insertLicensed.run(crypto.randomUUID(), "焼鳥どん 日垣兄弟", "@higakiyakitori", "飲食", 318400, "全席禁煙の全部大歓迎焼鳥屋 / お子様・お一人様歓迎 店舗一覧・ご予約・FC・通販は下記リンク");
    insertLicensed.run(crypto.randomUUID(), "ドラゴン細井 / 美容外科医", "@dragonamasora", "美容クリニック", 238100, "渋谷アマソラクリニック院長 / 医学部受験塾MEDUCATE塾長 形成外科・美容外科医");
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

export function getDb(): Database.Database {
  if (!global.__db) {
    const fs = require("fs") as typeof import("fs");
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    global.__db = new Database(DB_PATH);
    init(global.__db);
  }
  return global.__db;
}
