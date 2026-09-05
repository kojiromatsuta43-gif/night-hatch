// フォーム営業のキュー処理。scheduler.ts から1分ごとに tick() が呼ばれ、実行中キャンペーンを回す。
// FORM_OUTREACH=off でこのサーバーでは送信しない（別サーバーでワーカーだけ動かす場合）。
import crypto from "crypto";
import type { Browser } from "playwright-core";
import { getDb } from "../db";
import { notify } from "../notifications";
import { consumeFromGrants } from "../points-ledger";
import { activeProvider } from "../llm";
import { ensureFormTables, domainOf, isExcludedDomain, FORM_BLOCK_POINTS, FORM_BLOCK_SIZE, type Campaign, type Job, type JobStatus, type SenderProfile } from "./schema";
import { launchBrowser, submitToCompany, fetchSiteText } from "./engine";
import { composeMessage, findNgWords } from "./message";

const running = new Map<string, { stop: boolean }>();
const CONCURRENCY = Math.max(1, Number(process.env.FORM_CONCURRENCY ?? 1));
const MIN_WAIT = Number(process.env.FORM_MIN_WAIT_MS ?? 8000);
const MAX_WAIT = Number(process.env.FORM_MAX_WAIT_MS ?? 15000);

export const workerEnabled = () => process.env.FORM_OUTREACH !== "off";
export const isRunning = (campaignId: string) => running.has(campaignId);
export function requestStop(campaignId: string) {
  const r = running.get(campaignId);
  if (r) r.stop = true;
}

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}
export function inSendWindow(c: Campaign): boolean {
  const d = jstNow();
  const h = d.getUTCHours();
  const wd = d.getUTCDay();
  if (c.weekdays_only && (wd === 0 || wd === 6)) return false;
  return h >= c.send_window_start && h < c.send_window_end;
}
export function sentToday(campaignId: string): number {
  const day = jstNow().toISOString().slice(0, 10);
  const r = getDb()
    .prepare("SELECT COUNT(*) n FROM form_jobs WHERE campaign_id=? AND status='sent' AND is_test=0 AND substr(datetime(sent_at,'+9 hours'),1,10)=?")
    .get(campaignId, day) as { n: number };
  return r.n;
}

export function loadCampaign(id: string): { campaign: Campaign; sender: SenderProfile } | null {
  ensureFormTables();
  const db = getDb();
  const campaign = db.prepare("SELECT * FROM form_campaigns WHERE id=?").get(id) as Campaign | undefined;
  if (!campaign) return null;
  const sender = db.prepare("SELECT * FROM form_senders WHERE id=?").get(campaign.sender_id) as SenderProfile | undefined;
  if (!sender) return null;
  return { campaign, sender };
}

export type LeadLike = { id?: string | null; company: string; form_url?: string; website?: string; industry?: string; prefecture?: string; contact_name?: string; memo?: string };
export type AddSummary = { added: number; excluded: number; suppressed: number; duplicated: number; noUrl: number };

/** メモ欄に「問合せフォーム: URL」と書かれている古いリード用 */
export function formUrlFromLead(l: LeadLike): string {
  if (l.form_url) return l.form_url;
  const m = (l.memo ?? "").match(/問合せフォーム:\s*(\S+)/);
  return m ? m[1] : "";
}

/** 営業リストの会社をキャンペーンのジョブとして登録。除外・重複はこの時点で振り分けて理由を残す */
export function addLeadsToCampaign(campaignId: string, leads: LeadLike[]): AddSummary {
  ensureFormTables();
  const db = getDb();
  const summary: AddSummary = { added: 0, excluded: 0, suppressed: 0, duplicated: 0, noUrl: 0 };
  const insert = db.prepare(`
    INSERT INTO form_jobs (campaign_id, lead_id, company_name, form_url, site_url, industry, prefecture, representative, domain, status, result_text)
    VALUES (@campaign_id, @lead_id, @company_name, @form_url, @site_url, @industry, @prefecture, @representative, @domain, @status, @result_text)`);
  const isSuppressed = db.prepare("SELECT 1 FROM form_suppressions WHERE domain=?");
  const recentlySent = db.prepare("SELECT 1 FROM form_jobs WHERE domain=? AND status='sent' AND is_test=0 AND sent_at > datetime('now','-90 days')");
  const inCampaign = db.prepare("SELECT 1 FROM form_jobs WHERE campaign_id=? AND domain=?");

  db.transaction(() => {
    for (const l of leads) {
      const formUrl = formUrlFromLead(l);
      const site = l.website ?? "";
      const domain = domainOf(formUrl || site);
      if (!domain) {
        summary.noUrl++;
        continue;
      }
      if (inCampaign.get(campaignId, domain)) {
        summary.duplicated++;
        continue;
      }
      let status: JobStatus = "queued";
      let reason = "";
      if (isExcludedDomain(domain)) {
        status = "skip_suppressed";
        reason = "官公庁・学校等のドメインは既定で除外";
        summary.excluded++;
      } else if (isSuppressed.get(domain)) {
        status = "skip_suppressed";
        reason = "除外リストに登録済み";
        summary.suppressed++;
      } else if (recentlySent.get(domain)) {
        status = "skip_duplicate";
        reason = "90日以内に送信済み";
        summary.duplicated++;
      } else {
        summary.added++;
      }
      insert.run({
        campaign_id: campaignId,
        lead_id: l.id ?? null,
        company_name: l.company,
        form_url: formUrl,
        site_url: site,
        industry: l.industry ?? "",
        prefecture: l.prefecture ?? "",
        representative: l.contact_name ?? "",
        domain,
        status,
        result_text: reason,
      });
    }
  })();
  return summary;
}

async function getSiteInfo(browser: Browser, job: Job, needed: boolean): Promise<{ title: string; text: string }> {
  if (!needed || !job.domain) return { title: "", text: "" };
  const db = getDb();
  const cached = db.prepare("SELECT title, text FROM form_site_cache WHERE domain=? AND fetched_at > datetime('now','-180 days')").get(job.domain) as
    | { title: string; text: string }
    | undefined;
  if (cached) return cached;
  const info = await fetchSiteText(browser, job.site_url || job.form_url);
  db.prepare(
    "INSERT INTO form_site_cache(domain,title,text) VALUES(?,?,?) ON CONFLICT(domain) DO UPDATE SET title=excluded.title,text=excluded.text,fetched_at=datetime('now')"
  ).run(job.domain, info.title, info.text);
  return info;
}

/** プレビュー用: 文面だけ作る（送信しない） */
export async function previewMessage(campaignId: string, jobId?: number) {
  const loaded = loadCampaign(campaignId);
  if (!loaded) throw new Error("キャンペーンが見つかりません");
  const db = getDb();
  const job = (jobId
    ? db.prepare("SELECT * FROM form_jobs WHERE id=? AND campaign_id=?").get(jobId, campaignId)
    : db.prepare("SELECT * FROM form_jobs WHERE campaign_id=? AND status='queued' AND is_test=0 ORDER BY id LIMIT 1").get(campaignId)) as Job | undefined;
  if (!job) throw new Error("待機中の会社がありません。先に営業リストから追加してください");
  let site = { title: "", text: "" };
  if (loaded.campaign.mode !== "template" && activeProvider()) {
    const browser = await launchBrowser();
    try {
      site = await getSiteInfo(browser, job, true);
    } finally {
      await browser.close().catch(() => {});
    }
  }
  const composed = await composeMessage(job, loaded.sender, loaded.campaign, site);
  return { job, ...composed };
}

/**
 * クライアントは FORM_BLOCK_SIZE 通ごとに FORM_BLOCK_POINTS ハニーを前払い。管理者は無料。
 * 残高が足りなければ false（キャンペーンを止めて通知する）
 */
function chargeIfNeeded(campaign: Campaign): boolean {
  const db = getDb();
  const owner = db.prepare("SELECT id, role, points FROM users WHERE id=?").get(campaign.user_id) as { id: string; role: string; points: number } | undefined;
  if (!owner || owner.role === "admin") return true;
  const paidFor = Math.floor(campaign.charged_points / FORM_BLOCK_POINTS) * FORM_BLOCK_SIZE;
  if (campaign.sent_count < paidFor) return true;
  if (owner.points < FORM_BLOCK_POINTS) {
    notify(owner.id, {
      id: `form-points:${campaign.id}:${campaign.sent_count}`,
      kind: "form",
      title: `フォーム営業「${campaign.name}」を一時停止しました`,
      body: `ハニーが足りません（次の${FORM_BLOCK_SIZE}通に${FORM_BLOCK_POINTS}🍯必要）。補充すると自動で再開します。`,
      link: `/sales/form/${campaign.id}`,
    });
    return false;
  }
  db.transaction(() => {
    db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(FORM_BLOCK_POINTS, owner.id);
    consumeFromGrants(db, owner.id, FORM_BLOCK_POINTS);
    db.prepare("INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'spend', ?)").run(
      crypto.randomUUID(), owner.id, -FORM_BLOCK_POINTS, `フォーム営業 ${FORM_BLOCK_SIZE}通: ${campaign.name}`
    );
    db.prepare("UPDATE form_campaigns SET charged_points = charged_points + ? WHERE id = ?").run(FORM_BLOCK_POINTS, campaign.id);
  })();
  return true;
}

/** 1ジョブを処理して結果をDBに保存 */
export async function processJob(browser: Browser, jobId: number, opts: { dryRun?: boolean } = {}): Promise<Job> {
  const db = getDb();
  const job = db.prepare("SELECT * FROM form_jobs WHERE id=?").get(jobId) as Job;
  const loaded = loadCampaign(job.campaign_id);
  if (!loaded) throw new Error("campaign not found");
  const { campaign, sender } = loaded;
  db.prepare("UPDATE form_jobs SET status='sending', attempts=attempts+1, updated_at=datetime('now') WHERE id=?").run(jobId);

  const finish = (status: JobStatus, result: string, extra: Partial<Job> = {}) => {
    db.prepare(
      `UPDATE form_jobs SET status=@status, result_text=@result_text, message_used=COALESCE(@message_used, message_used),
        screenshot_path=COALESCE(@screenshot_path, screenshot_path), form_url=COALESCE(@form_url, form_url),
        sent_at=CASE WHEN @status='sent' THEN datetime('now') ELSE sent_at END, updated_at=datetime('now') WHERE id=@id`
    ).run({ id: jobId, status, result_text: result, message_used: extra.message_used ?? null, screenshot_path: extra.screenshot_path ?? null, form_url: extra.form_url ?? null });
    if (status === "sent" && !job.is_test) {
      db.prepare("UPDATE form_campaigns SET sent_count = sent_count + 1 WHERE id=?").run(job.campaign_id);
      if (job.lead_id) {
        db.prepare("UPDATE sales_leads SET memo = CASE WHEN memo LIKE '%フォーム送信済%' THEN memo ELSE trim(memo || ' / フォーム送信済 ' || date('now','+9 hours'), ' /') END, updated_at=datetime('now') WHERE id=?").run(job.lead_id);
      }
    }
    return db.prepare("SELECT * FROM form_jobs WHERE id=?").get(jobId) as Job;
  };

  if (!job.is_test && db.prepare("SELECT 1 FROM form_suppressions WHERE domain=?").get(job.domain)) return finish("skip_suppressed", "除外リストに登録済み");

  let subject = "";
  let message = "";
  try {
    const needSite = campaign.mode !== "template" && activeProvider() !== null;
    const site = await getSiteInfo(browser, job, needSite);
    const composed = await composeMessage(job, sender, campaign, site);
    subject = composed.subject;
    message = composed.message;
  } catch (e) {
    return finish("failed", `文面生成エラー: ${String((e as Error).message ?? e).slice(0, 150)}`);
  }
  const ng = findNgWords(message);
  if (ng.length) return finish("failed", `NGワード検出: ${ng.join(", ")}`, { message_used: message });

  const r = await submitToCompany(browser, { jobId, formUrl: job.form_url, siteUrl: job.site_url, sender, subject, message, dryRun: opts.dryRun });
  const detail = [r.detail, ...r.log].join("\n");
  if (r.status === "skip_refused" && job.domain) {
    db.prepare("INSERT OR IGNORE INTO form_suppressions(id, domain, reason) VALUES(?,?,?)").run(crypto.randomUUID(), job.domain, "営業お断り文言を検知（自動）");
  }
  const status: JobStatus = opts.dryRun ? "queued" : r.status;
  return finish(status, detail, { message_used: message, screenshot_path: r.screenshot, form_url: r.finalUrl && r.status !== "skip_no_form" ? r.finalUrl : undefined });
}

/** キャンペーンのキューを回す。停止要求・送信時間帯・日次上限・残高を守る */
export async function runCampaign(campaignId: string, opts: { ignoreWindow?: boolean } = {}): Promise<{ processed: number; reason: string }> {
  if (running.has(campaignId)) return { processed: 0, reason: "already running" };
  const state = { stop: false };
  running.set(campaignId, state);
  const db = getDb();
  let processed = 0;
  let reason = "queue empty";
  let stoppedForPoints = false;
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const worker = async () => {
      while (!state.stop) {
        const loaded = loadCampaign(campaignId);
        if (!loaded) return;
        const { campaign } = loaded;
        if (campaign.status !== "running") { reason = "停止"; return; }
        if (!opts.ignoreWindow && !inSendWindow(campaign)) { reason = "送信時間帯外"; return; }
        if (sentToday(campaignId) >= campaign.daily_limit) { reason = "本日の上限に到達"; return; }
        if (!chargeIfNeeded(campaign)) { reason = "ハニー不足"; stoppedForPoints = true; return; }
        const next = db.prepare("SELECT id FROM form_jobs WHERE campaign_id=? AND status='queued' AND is_test=0 ORDER BY id LIMIT 1").get(campaignId) as { id: number } | undefined;
        if (!next) return;
        const claimed = db.prepare("UPDATE form_jobs SET status='sending' WHERE id=? AND status='queued'").run(next.id).changes;
        if (!claimed) continue;
        try {
          await processJob(browser!, next.id);
          processed++;
        } catch (e) {
          db.prepare("UPDATE form_jobs SET status='failed', result_text=?, updated_at=datetime('now') WHERE id=?").run(`例外: ${String(e).slice(0, 150)}`, next.id);
        }
        await new Promise((r) => setTimeout(r, MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT)));
      }
      reason = "停止要求";
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } catch (e) {
    reason = `起動エラー: ${String((e as Error).message ?? e).slice(0, 120)}`;
    console.error("[form-outreach]", reason);
  } finally {
    await browser?.close().catch(() => {});
    running.delete(campaignId);
    const left = (db.prepare("SELECT COUNT(*) n FROM form_jobs WHERE campaign_id=? AND status='queued' AND is_test=0").get(campaignId) as { n: number }).n;
    const cur = (db.prepare("SELECT status, user_id, name FROM form_campaigns WHERE id=?").get(campaignId) as { status: string; user_id: string; name: string } | undefined);
    if (cur && cur.status === "running") {
      // 時間帯外・上限・残高不足は running のまま残し、スケジューラが再開する。残りゼロなら完了
      if (left === 0) {
        db.prepare("UPDATE form_campaigns SET status='done' WHERE id=?").run(campaignId);
        const c = db.prepare("SELECT COUNT(*) n FROM form_jobs WHERE campaign_id=? AND is_test=0 AND status='sent'").get(campaignId) as { n: number };
        const s = db.prepare("SELECT COUNT(*) n FROM form_jobs WHERE campaign_id=? AND is_test=0 AND status LIKE 'skip_%'").get(campaignId) as { n: number };
        notify(cur.user_id, { kind: "form", title: `フォーム営業「${cur.name}」が完了しました`, body: `${c.n}件送信・${s.n}件スキップ`, link: `/sales/form/${campaignId}` });
      } else if (state.stop) {
        db.prepare("UPDATE form_campaigns SET status='paused' WHERE id=?").run(campaignId);
      }
    }
    if (stoppedForPoints) { /* 残高補充後、スケジューラが自動再開 */ }
  }
  return { processed, reason };
}

/** scheduler から1分ごと: 実行中キャンペーンを拾う */
export function tick() {
  if (!workerEnabled()) return;
  try {
    ensureFormTables();
    const ids = getDb().prepare("SELECT id FROM form_campaigns WHERE status='running'").all() as { id: string }[];
    for (const { id } of ids) {
      if (!isRunning(id)) {
        void runCampaign(id).then((r) => {
          if (r.processed) console.log(`[form-outreach] ${id}: ${r.processed}件 (${r.reason})`);
        });
      }
    }
  } catch (e) {
    console.error("[form-outreach tick]", e instanceof Error ? e.message : e);
  }
}
