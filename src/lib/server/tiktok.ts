import crypto from "crypto";
import { getDb } from "./db";
import { generateJson, activeProvider } from "./llm";

/**
 * TikTok の参考動画を外部データサービス（Apify の TikTok Scraper）から取り込む。
 *
 * すべてサーバー側で動き、ブラウザには業者名も鍵も出ない。
 * 鍵は Railway の Variables `APIFY_TOKEN` に入れる（コードには書かない）。
 *
 * 流れ: 取り込み設定（@ハンドル／検索ワード／#タグ）を業種ごとにまとめて1回の実行にし、
 *       返ってきた動画を source_id（TikTok側の動画ID）で二重登録せずに更新する。
 *       再生数は日ごとに履歴（ref_video_stats）へ残し、「今週伸びた動画」の計算に使う。
 */

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR = process.env.APIFY_TIKTOK_ACTOR ?? "clockworks~tiktok-scraper";
const PER_QUERY = Number(process.env.TIKTOK_RESULTS_PER_QUERY ?? 20);
// 検索・タグで見つかった投稿のうち、お手本にならないものを除く条件
//  - 日本語が入っていないキャプション（海外の投稿）
//  - フォロワーが多すぎるアカウント（テレビ局・芸能人など、中小企業のお手本にならない）
const MAX_FOLLOWERS = Number(process.env.TIKTOK_MAX_FOLLOWERS ?? 2_000_000);
const JP = /[\u3040-\u30ff\u4e00-\u9fff]/;
export function looksJapanese(text: string): boolean {
  return JP.test(text ?? "");
}

export class NoApifyTokenError extends Error {
  constructor() {
    super("TikTok取り込みの鍵（APIFY_TOKEN）が設定されていません。Railway の Variables に追加してください。");
  }
}

export type TikTokQuery = {
  id: string;
  kind: "profile" | "search" | "hashtag";
  value: string;
  industry: string;
  active: number;
  last_run_at: string | null;
  last_result: string;
};

/** Apify から返る1本ぶん（必要な項目だけ。無い項目は空のまま扱う） */
type ApifyItem = {
  id?: string | number;
  text?: string;
  createTimeISO?: string;
  createTime?: number;
  webVideoUrl?: string;
  playCount?: number;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  videoMeta?: { coverUrl?: string; originalCoverUrl?: string };
  authorMeta?: {
    name?: string; // @なしのハンドル
    nickName?: string;
    signature?: string;
    avatar?: string;
    fans?: number;
    video?: number;
    profileUrl?: string;
  };
};

export type SyncResult = {
  runId: string;
  queries: number;
  videos: number;
  accounts: number;
  message: string;
};

function token(): string {
  const t = (process.env.APIFY_TOKEN ?? "").trim();
  if (!t) throw new NoApifyTokenError();
  return t;
}

export function isTikTokSyncConfigured(): boolean {
  return Boolean((process.env.APIFY_TOKEN ?? "").trim());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Actor を起動して終わるまで待ち、結果の一覧を返す */
async function runActor(input: Record<string, unknown>, maxWaitMs = 15 * 60 * 1000): Promise<ApifyItem[]> {
  const t = token();
  const start = await fetch(`${APIFY_BASE}/acts/${ACTOR}/runs?token=${encodeURIComponent(t)}&waitForFinish=60`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(90_000),
  });
  if (!start.ok) {
    const body = await start.text().catch(() => "");
    throw new Error(`取り込みサービスの起動に失敗しました (HTTP ${start.status}) ${body.slice(0, 200)}`);
  }
  let run = (await start.json()).data as { id: string; status: string; defaultDatasetId: string };

  const deadline = Date.now() + maxWaitMs;
  while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
    if (Date.now() > deadline) throw new Error("取り込みに時間がかかりすぎたため中断しました（後でもう一度お試しください）");
    await sleep(10_000);
    const res = await fetch(`${APIFY_BASE}/actor-runs/${run.id}?token=${encodeURIComponent(t)}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`実行状況の確認に失敗しました (HTTP ${res.status})`);
    run = (await res.json()).data;
  }
  if (run.status !== "SUCCEEDED") throw new Error(`取り込みが完了しませんでした（状態: ${run.status}）`);

  const items = await fetch(
    `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items?token=${encodeURIComponent(t)}&clean=true&format=json`,
    { signal: AbortSignal.timeout(120_000) }
  );
  if (!items.ok) throw new Error(`結果の取得に失敗しました (HTTP ${items.status})`);
  const data = (await items.json()) as unknown;
  return Array.isArray(data) ? (data as ApifyItem[]) : [];
}

function normHandle(name: string): string {
  const h = name.trim().replace(/^https?:\/\/(www\.)?tiktok\.com\//i, "").replace(/[/?].*$/, "");
  return h.startsWith("@") ? h : `@${h}`;
}

/** 返ってきた動画を DB に反映する。戻り値は 追加/更新した動画数と 新規アカウント数 */
function upsertItems(items: ApifyItem[], industry: string, strict: boolean): { videos: number; accounts: number } {
  const db = getDb();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const findAccount = db.prepare("SELECT id, industry FROM ref_accounts WHERE handle = ?");
  const insertAccount = db.prepare(
    `INSERT INTO ref_accounts (id, name, handle, industry, followers, bio, icon_url, profile_url, video_count, last_synced_at, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'apify')`
  );
  const updateAccount = db.prepare(
    `UPDATE ref_accounts SET name = COALESCE(NULLIF(?, ''), name), followers = CASE WHEN ? > 0 THEN ? ELSE followers END,
        bio = COALESCE(NULLIF(?, ''), bio), icon_url = COALESCE(NULLIF(?, ''), icon_url),
        profile_url = COALESCE(NULLIF(?, ''), profile_url), video_count = CASE WHEN ? > 0 THEN ? ELSE video_count END,
        last_synced_at = ? WHERE id = ?`
  );
  const findVideo = db.prepare("SELECT id FROM ref_videos WHERE source_id = ?");
  const findVideoByUrl = db.prepare("SELECT id FROM ref_videos WHERE url = ? AND source_id = ''");
  const insertVideo = db.prepare(
    `INSERT INTO ref_videos (id, account_id, caption, url, thumbnail, hue, views, likes, comments, shares, posted_at, fetched_at, source_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const updateVideo = db.prepare(
    `UPDATE ref_videos SET caption = COALESCE(NULLIF(?, ''), caption), url = COALESCE(NULLIF(?, ''), url),
        thumbnail = COALESCE(NULLIF(?, ''), thumbnail), views = ?, likes = ?, comments = ?, shares = ?,
        posted_at = COALESCE(NULLIF(?, ''), posted_at), fetched_at = ?, source_id = ? WHERE id = ?`
  );
  const upsertStat = db.prepare(
    "INSERT OR REPLACE INTO ref_video_stats (video_id, day, views, likes) VALUES (?, ?, ?, ?)"
  );

  let videos = 0;
  let accounts = 0;
  const tx = db.transaction(() => {
    for (const it of items) {
      const sourceId = String(it.id ?? "").trim();
      const url = (it.webVideoUrl ?? "").trim();
      if (!sourceId && !url) continue;
      const a = it.authorMeta ?? {};
      if (!a.name) continue;
      const handle = normHandle(a.name);
      // 検索・タグ由来は、日本語の投稿で、フォロワーが多すぎない投稿者だけ
      if (strict) {
        if (!looksJapanese(`${it.text ?? ""} ${a.nickName ?? ""} ${a.signature ?? ""}`)) continue;
        if ((a.fans ?? 0) > MAX_FOLLOWERS) continue;
      }

      // アカウント（無ければ作る。業種は取り込み設定のもの）
      let acc = findAccount.get(handle) as { id: string; industry: string } | undefined;
      if (!acc) {
        const id = crypto.randomUUID();
        insertAccount.run(
          id, a.nickName || a.name, handle, industry || "その他", a.fans ?? 0, a.signature ?? "",
          a.avatar ?? "", a.profileUrl ?? `https://www.tiktok.com/${handle}`, a.video ?? 0, now
        );
        acc = { id, industry };
        accounts++;
      } else {
        updateAccount.run(
          a.nickName ?? "", a.fans ?? 0, a.fans ?? 0, a.signature ?? "", a.avatar ?? "",
          a.profileUrl ?? "", a.video ?? 0, a.video ?? 0, now, acc.id
        );
      }

      const caption = (it.text ?? "").trim().slice(0, 300) || "参考動画";
      const cover = it.videoMeta?.coverUrl || it.videoMeta?.originalCoverUrl || "";
      const posted = it.createTimeISO || (it.createTime ? new Date(it.createTime * 1000).toISOString() : "");
      const views = Number(it.playCount ?? 0) || 0;
      const likes = Number(it.diggCount ?? 0) || 0;
      const comments = Number(it.commentCount ?? 0) || 0;
      const shares = Number(it.shareCount ?? 0) || 0;

      // 既存の動画: source_id が同じ → 更新。手入力で同じURLのものがあれば、それに source_id を付けて更新
      let v = (sourceId ? findVideo.get(sourceId) : undefined) as { id: string } | undefined;
      if (!v && url) v = findVideoByUrl.get(url) as { id: string } | undefined;
      let videoId: string;
      if (v) {
        updateVideo.run(caption, url, cover, views, likes, comments, shares, posted, now, sourceId, v.id);
        videoId = v.id;
      } else {
        videoId = crypto.randomUUID();
        insertVideo.run(videoId, acc.id, caption, url, cover, Math.floor(Math.random() * 360), views, likes, comments, shares, posted, now, sourceId);
      }
      upsertStat.run(videoId, today, views, likes);
      videos++;
    }
  });
  tx();
  return { videos, accounts };
}

let syncing = false;
export function isSyncing() {
  return syncing;
}

/**
 * 取り込みを実行する。queryIds を渡すとその設定だけ、省略時は有効な設定すべて。
 * 業種ごとに1回の実行にまとめる（検索ワードで見つかった投稿者に業種を付けるため）。
 */
export async function runTikTokSync(queryIds?: string[]): Promise<SyncResult> {
  if (syncing) throw new Error("取り込みを実行中です。終わるまでお待ちください。");
  token(); // 未設定なら早めに止める
  const db = getDb();
  let queries = db.prepare("SELECT * FROM tiktok_queries WHERE active = 1 ORDER BY created_at").all() as TikTokQuery[];
  if (queryIds?.length) queries = queries.filter((q) => queryIds.includes(q.id));
  if (queries.length === 0) throw new Error("取り込む設定がありません。@ハンドルか検索ワードを登録してください。");

  const runId = crypto.randomUUID();
  db.prepare("INSERT INTO tiktok_sync_runs (id, queries) VALUES (?, ?)").run(runId, queries.length);
  syncing = true;
  let videos = 0;
  let accounts = 0;
  const notes: string[] = [];
  try {
    const groups = new Map<string, TikTokQuery[]>();
    for (const q of queries) {
      const key = q.industry || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(q);
    }
    for (const [industry, qs] of groups) {
      const input: Record<string, unknown> = {
        resultsPerPage: PER_QUERY,
        profileSorting: "latest",
        excludePinnedPosts: false,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
        shouldDownloadSlideshowImages: false,
        shouldDownloadAvatars: false,
      };
      const profiles = qs.filter((q) => q.kind === "profile").map((q) => normHandle(q.value).slice(1));
      const searches = qs.filter((q) => q.kind === "search").map((q) => q.value.trim());
      const hashtags = qs.filter((q) => q.kind === "hashtag").map((q) => q.value.trim().replace(/^#/, ""));
      if (profiles.length) input.profiles = profiles;
      if (searches.length) {
        input.searchQueries = searches;
        input.searchSection = "/video";
      }
      if (hashtags.length) input.hashtags = hashtags;

      let items: ApifyItem[] = [];
      let err = "";
      try {
        items = await runActor(input);
        // @ハンドル指定の投稿者は無条件、検索・タグ由来は日本語＆フォロワー上限で絞る
        const wanted = new Set(profiles.map((h) => `@${h}`.toLowerCase()));
        const fromProfiles = items.filter((it) => wanted.has(normHandle(it.authorMeta?.name ?? "").toLowerCase()));
        const fromSearch = items.filter((it) => !wanted.has(normHandle(it.authorMeta?.name ?? "").toLowerCase()));
        const r1 = upsertItems(fromProfiles, industry, false);
        const r2 = upsertItems(fromSearch, industry, true);
        const r = { videos: r1.videos + r2.videos, accounts: r1.accounts + r2.accounts };
        videos += r.videos;
        accounts += r.accounts;
      } catch (e) {
        err = e instanceof Error ? e.message : String(e);
        notes.push(`${industry || "業種なし"}: ${err}`);
      }
      const stamp = db.prepare("UPDATE tiktok_queries SET last_run_at = ?, last_result = ? WHERE id = ?");
      for (const q of qs) stamp.run(new Date().toISOString(), err ? `失敗: ${err.slice(0, 120)}` : `${items.length}本`, q.id);
    }
    const pruned = pruneImported();
    // AIでお手本になるアカウントだけ残す（鍵が無いときは飛ばす）
    let judged = { checked: 0, removed: 0 };
    try {
      judged = await classifyImported();
    } catch (e) {
      notes.push(`AI審査: ${e instanceof Error ? e.message : String(e)}`);
    }
    const message =
      (notes.length ? notes.join(" / ") : `動画${videos}本を取り込み（新規アカウント${accounts}）`) +
      (pruned.accounts > 0 ? `／海外・大手${pruned.accounts}件を整理` : "") +
      (judged.checked > 0 ? `／AI審査${judged.checked}件（除外${judged.removed}）` : "");
    db.prepare("UPDATE tiktok_sync_runs SET finished_at = ?, status = ?, videos = ?, accounts = ?, message = ? WHERE id = ?").run(
      new Date().toISOString(), notes.length && videos === 0 ? "failed" : "done", videos, accounts, message, runId
    );
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('tiktok_last_sync_at', ?)").run(new Date().toISOString());
    return { runId, queries: queries.length, videos, accounts, message };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    db.prepare("UPDATE tiktok_sync_runs SET finished_at = ?, status = 'failed', message = ? WHERE id = ?").run(
      new Date().toISOString(), message, runId
    );
    throw e;
  } finally {
    syncing = false;
  }
}

/** 直近7日間の再生数の伸び（動画ごと）。履歴が無い動画は 0 */
export function viewGrowth7d(videoIds: string[]): Map<string, number> {
  const out = new Map<string, number>();
  if (videoIds.length === 0) return out;
  const db = getDb();
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  // 7日以上前の記録があればその最新、無ければ一番古い記録（取り込みを始めたばかりのとき）と比べる
  const stmt = db.prepare(
    `SELECT s.video_id, v.views - s.views AS growth
       FROM ref_video_stats s JOIN ref_videos v ON v.id = s.video_id
      WHERE s.video_id = ?
      ORDER BY (s.day <= ?) DESC, CASE WHEN s.day <= ? THEN s.day ELSE '' END DESC, s.day ASC
      LIMIT 1`
  );
  for (const id of videoIds) {
    const row = stmt.get(id, since, since) as { growth: number } | undefined;
    out.set(id, row ? Math.max(0, row.growth) : 0);
  }
  return out;
}

/**
 * 自動取り込みで入ったアカウントのうち、お手本にならないものを消す。
 *  - 日本語の動画が1本も無い（海外の投稿者）
 *  - フォロワーが多すぎる（テレビ局・芸能人など）
 * 手動で登録したアカウント（source が空）と、@ハンドルで指定したものは消さない。
 */
export function pruneImported(): { accounts: number; videos: number } {
  const db = getDb();
  const profiles = new Set(
    (db.prepare("SELECT value FROM tiktok_queries WHERE kind = 'profile'").all() as { value: string }[]).map((q) => normHandle(q.value).toLowerCase())
  );
  const rows = db
    .prepare(
      `SELECT a.id, a.handle, a.name, a.bio, a.followers,
              (SELECT GROUP_CONCAT(caption, ' ') FROM ref_videos v WHERE v.account_id = a.id) AS captions
         FROM ref_accounts a WHERE a.source = 'apify'`
    )
    .all() as { id: string; handle: string; name: string; bio: string; followers: number; captions: string | null }[];
  const delVideos = db.prepare("DELETE FROM ref_videos WHERE account_id = ?");
  const delStats = db.prepare("DELETE FROM ref_video_stats WHERE video_id IN (SELECT id FROM ref_videos WHERE account_id = ?)");
  const delAccount = db.prepare("DELETE FROM ref_accounts WHERE id = ?");
  let accounts = 0;
  let videos = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      if (profiles.has(r.handle.toLowerCase())) continue;
      const jp = looksJapanese(`${r.captions ?? ""} ${r.name} ${r.bio}`);
      if (jp && r.followers <= MAX_FOLLOWERS) continue;
      const n = (db.prepare("SELECT COUNT(*) AS c FROM ref_videos WHERE account_id = ?").get(r.id) as { c: number }).c;
      delStats.run(r.id);
      delVideos.run(r.id);
      delAccount.run(r.id);
      accounts++;
      videos += n;
    }
  });
  tx();
  return { accounts, videos };
}

let classifying = false;
export function isClassifying() {
  return classifying;
}

/**
 * 自動取り込みで入ったアカウントを AI で審査し、
 * 「その業種の事業者・店舗・専門家の公式/個人アカウント」だけを残す。
 * 一般ユーザーの体験投稿、まとめ・切り抜き、ニュース、業種違い、芸能人は外す。
 * 残したものには persona（例: 福岡のネイルサロン公式）を付けて一覧に出す。
 */
export async function classifyImported(maxAccounts = 600): Promise<{ checked: number; removed: number }> {
  if (!activeProvider()) return { checked: 0, removed: 0 };
  if (classifying) throw new Error("AI審査を実行中です");
  classifying = true;
  const db = getDb();
  try {
    const rows = db
      .prepare(
        `SELECT a.id, a.handle, a.name, a.bio, a.industry, a.followers,
                (SELECT GROUP_CONCAT(substr(caption, 1, 80), ' ／ ') FROM (
                   SELECT caption FROM ref_videos v WHERE v.account_id = a.id ORDER BY views DESC LIMIT 3)) AS captions
           FROM ref_accounts a
          WHERE a.source = 'apify' AND a.classified_at = ''
          ORDER BY a.created_at LIMIT ?`
      )
      .all(maxAccounts) as { id: string; handle: string; name: string; bio: string; industry: string; followers: number; captions: string | null }[];
    if (rows.length === 0) return { checked: 0, removed: 0 };

    const system = `あなたは中小企業向けSNS支援サービスの審査係。TikTokアカウントが、指定された業種の「事業者・店舗・またはその業界で働く専門家（美容師、ネイリスト、トレーナー、営業担当、職人など）」の公式または個人アカウントで、中小企業がお手本にできるものかを判定する。
残す(keep=true): 店舗・会社・院の公式、オーナーやスタッフ、その業界のプロが自分の仕事や店を発信しているもの。
外す(keep=false): 一般ユーザーの体験談・レビュー、まとめ・切り抜き・転載、ニュース・メディア、業種と関係ない、芸能人・インフルエンサーのタイアップだけ、海外の投稿者、内容が判断できない。
keep=true のときは persona に「福岡のネイルサロン公式」「大阪の焼肉店の店主」のように、地域（分かれば）＋業態＋立場を20字以内で書く。`;
    const schema = {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: { handle: { type: "string" }, keep: { type: "boolean" }, persona: { type: "string" } },
            required: ["handle", "keep", "persona"],
            additionalProperties: false,
          },
        },
      },
      required: ["results"],
      additionalProperties: false,
    };
    const mark = db.prepare("UPDATE ref_accounts SET persona = ?, classified_at = ? WHERE id = ?");
    const delVideos = db.prepare("DELETE FROM ref_videos WHERE account_id = ?");
    const delStats = db.prepare("DELETE FROM ref_video_stats WHERE video_id IN (SELECT id FROM ref_videos WHERE account_id = ?)");
    const delAccount = db.prepare("DELETE FROM ref_accounts WHERE id = ?");

    let checked = 0;
    let removed = 0;
    const CHUNK = 10; // AIの1回の応答が長くなりすぎない量
    const CONCURRENCY = 3; // AIの応答待ちが長いので複数同時に投げる（多すぎると混雑エラーになる）
    const chunks: typeof rows[] = [];
    for (let i = 0; i < rows.length; i += CHUNK) chunks.push(rows.slice(i, i + CHUNK));
    let cursor = 0;
    let failures = 0;

    const judgeChunk = async (chunk: typeof rows) => {
      const prompt = chunk
        .map(
          (r, n) =>
            `${n + 1}. handle=${r.handle}\n業種=${r.industry}\n名前=${r.name}\nフォロワー=${r.followers}\n紹介文=${(r.bio ?? "").replace(/\s+/g, " ").slice(0, 120)}\n投稿=${(r.captions ?? "").replace(/\s+/g, " ").slice(0, 240)}`
        )
        .join("\n\n");
      let out: { results: { handle: string; keep: boolean; persona: string }[] };
      try {
        out = await generateJson(system, `次の${chunk.length}件を判定してください。\n\n${prompt}`, schema);
      } catch (e) {
        failures++;
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[tiktok classify]", msg.slice(0, 300));
        db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('tiktok_classify_error', ?)").run(
          `${new Date().toISOString()} ${msg.slice(0, 300)}`
        );
        // AIの混雑（429など）なら少し待ってから続ける
        await sleep(15_000);
        return; // 失敗ぶんは判定済みにせず次回に回す
      }
      const byHandle = new Map(out.results.map((x) => [x.handle.trim().toLowerCase(), x]));
      const now = new Date().toISOString();
      db.transaction(() => {
        for (const r of chunk) {
          const j = byHandle.get(r.handle.toLowerCase());
          if (!j) continue;
          checked++;
          if (j.keep) {
            mark.run(j.persona.slice(0, 40), now, r.id);
          } else {
            delStats.run(r.id);
            delVideos.run(r.id);
            delAccount.run(r.id);
            removed++;
          }
        }
      })();
    };
    const worker = async () => {
      while (cursor < chunks.length && failures < 8) {
        const c = chunks[cursor++];
        await judgeChunk(c);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));
    if (checked === 0 && failures > 0) throw new Error("AI審査の応答が得られませんでした（AIの鍵と残高を確認してください）");
    if (failures === 0) db.prepare("DELETE FROM app_meta WHERE key = 'tiktok_classify_error'").run();
    return { checked, removed };
  } finally {
    classifying = false;
  }
}
