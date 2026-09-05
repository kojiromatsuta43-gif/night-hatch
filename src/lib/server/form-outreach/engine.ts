// 1社分の送信を実行する（ブラウザ起動〜結果判定〜スクショ）。
import { chromium, type Browser, type BrowserContext, type Page, type Frame } from "playwright-core";
import path from "node:path";
import { SCREENSHOT_DIR, type SenderProfile, type JobStatus } from "./schema";
import { detectRefusal, CAPTCHA_CHECK_SCRIPT } from "./detect";
import { findContactForm } from "./formFinder";
import { collectFields, fillFields, clickNextButton, judgeOutcome, classify } from "./formFiller";

export type SubmitInput = {
  jobId: number;
  formUrl: string;
  siteUrl: string;
  sender: SenderProfile;
  subject: string;
  message: string;
  dryRun?: boolean; // 入力だけしてスクショを撮り、送信はしない
};

export type SubmitResult = {
  status: JobStatus;
  detail: string;
  finalUrl: string;
  screenshot: string;
  log: string[];
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/**
 * ブラウザ起動。本番（Docker）は apt の chromium を CHROMIUM_PATH で指す。
 * ローカル（Mac）は CHROMIUM_PATH が無ければインストール済みの Google Chrome を使う（playwright-core なのでブラウザのダウンロード不要）。
 */
export async function launchBrowser(): Promise<Browser> {
  const common = { headless: process.env.FORM_HEADLESS !== "0", args: ["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"] };
  if (process.env.CHROMIUM_PATH) return chromium.launch({ ...common, executablePath: process.env.CHROMIUM_PATH });
  try {
    return await chromium.launch({ ...common, channel: "chrome" });
  } catch {
    return chromium.launch(common);
  }
}

export async function newContext(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext({ userAgent: UA, locale: "ja-JP", viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
  ctx.setDefaultTimeout(15000);
  return ctx;
}

export async function submitToCompany(browser: Browser, input: SubmitInput): Promise<SubmitResult> {
  const log: string[] = [];
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const shot = path.join(SCREENSHOT_DIR, `job-${input.jobId}.png`);
  const done = async (status: JobStatus, detail: string): Promise<SubmitResult> => {
    let screenshot = "";
    try {
      await page.screenshot({ path: shot, fullPage: false });
      screenshot = shot;
    } catch {}
    const finalUrl = page.url();
    await ctx.close().catch(() => {});
    return { status, detail, finalUrl, screenshot, log };
  };

  try {
    const formPage = await findContactForm(page, input.formUrl, input.siteUrl);
    if (!formPage) return done("skip_no_form", "問い合わせフォームが見つからない");
    log.push(`form: ${formPage}`);

    const pageText: string = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
    const refusal = detectRefusal(pageText);
    if (refusal) return done("skip_refused", `営業お断り文言: 「${refusal}」`);

    const captcha = await page.evaluate(CAPTCHA_CHECK_SCRIPT).catch(() => null);
    if (captcha) return done("skip_captcha", `CAPTCHAあり (${captcha})`);

    // フォーム本体があるフレームを選ぶ（埋め込みフォーム対応）
    let target: Page | Frame = page;
    let fields = await collectFields(page);
    if (!fields.some((f) => classify(f) === "message")) {
      for (const fr of page.frames()) {
        if (fr === page.mainFrame()) continue;
        try {
          const ff = await collectFields(fr);
          if (ff.some((f) => classify(f) === "message")) { target = fr; fields = ff; log.push(`iframe: ${fr.url()}`); break; }
        } catch {}
      }
    }
    if (!fields.some((f) => classify(f) === "message")) return done("skip_no_form", "本文（textarea）欄が無い");

    const report = await fillFields(target, fields, { sender: input.sender, subject: input.subject, message: input.message });
    log.push(`filled: ${report.filled.join(",")}`);
    if (report.unfilled.length) log.push(`unfilled: ${report.unfilled.join(",")}`);
    log.push(...report.log);
    if (!report.hasMessage) return done("failed", "本文欄への入力に失敗");

    if (input.dryRun) return done("queued", "テスト入力のみ（送信していない）");

    const fieldCountBefore = fields.length;
    for (let round = 0; round < 3; round++) {
      const kind = await clickNextButton(target, page, log);
      if (kind === "none") return done("failed", "送信ボタンが見つからない");
      // 確認画面で CAPTCHA が出る場合
      const cap2 = await page.evaluate(CAPTCHA_CHECK_SCRIPT).catch(() => null);
      if (cap2) return done("skip_captcha", `確認画面にCAPTCHA (${cap2})`);
      const outcome = await judgeOutcome(page, fieldCountBefore, kind === "submit");
      log.push(`judge[${round}]: ${outcome.status} ${outcome.detail}`);
      if (outcome.status === "sent") return done("sent", outcome.detail);
      if (outcome.status === "failed") return done("failed", outcome.detail);
      // 確認画面なら次のラウンドで送信ボタンを押す。確認画面の項目は再収集
      if (kind === "confirm") {
        // 確認画面に未入力の必須項目（同意チェック等）が残っていれば埋める
        const more = await collectFields(target);
        if (more.length) {
          const r2 = await fillFields(target, more, { sender: input.sender, subject: input.subject, message: input.message });
          if (r2.filled.length) log.push(`confirm-page filled: ${r2.filled.join(",")}`);
        }
        continue;
      }
      // submit を押したのに判定不能 → もう一度だけ待って判定
      await page.waitForTimeout(3000);
      const again = await judgeOutcome(page, fieldCountBefore);
      if (again.status === "sent") return done("sent", again.detail);
      return done("failed", `送信後の判定不能: ${again.detail}`);
    }
    return done("failed", "確認画面を抜けられない");
  } catch (e) {
    log.push(`exception: ${String(e).slice(0, 200)}`);
    return done("failed", `例外: ${String((e as Error).message ?? e).slice(0, 120)}`);
  }
}

/** 企業HPのテキストを取得（AI個別化用）。失敗時は空文字 */
export async function fetchSiteText(browser: Browser, siteUrl: string): Promise<{ title: string; text: string }> {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  try {
    const url = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(500);
    const title = await page.title();
    const text: string = await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll("script, style, nav, footer, header, noscript"))) el.remove();
      return (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
    });
    return { title, text: text.slice(0, 3000) };
  } catch {
    return { title: "", text: "" };
  } finally {
    await ctx.close().catch(() => {});
  }
}
