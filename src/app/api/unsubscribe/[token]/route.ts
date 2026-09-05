import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { ensureFormTables } from "@/lib/server/form-outreach/schema";
import { optOut } from "@/lib/server/form-outreach/email";

type Ctx = { params: Promise<{ token: string }> };

function page(title: string, body: string) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;background:#FAF8F3;color:#1C1710;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
.card{background:#fff;border:2px solid #1C1710;border-radius:14px;padding:28px 32px;max-width:460px;text-align:center}h1{font-size:18px;margin:0 0 10px}p{font-size:14px;line-height:1.7;margin:0}
button{margin-top:16px;background:#FFC62E;border:2px solid #1C1710;border-radius:8px;padding:8px 18px;font-weight:700;font:inherit;cursor:pointer}</style></head><body><div class="card">${body}</div></body></html>`;
}

function stop(token: string): { email: string; company: string } | null {
  ensureFormTables();
  const db = getDb();
  const job = db.prepare("SELECT email, company_name FROM form_jobs WHERE unsub_token=? AND email != ''").get(token) as { email: string; company_name: string } | undefined;
  if (!job) return null;
  optOut(job.email, "配信停止リンク");
  return { email: job.email, company: job.company_name };
}

/** 配信停止ページ（メール本文のリンク） */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const r = stop(token);
  if (!r) return new NextResponse(page("配信停止", "<h1>リンクが無効です</h1><p>このリンクは無効か、すでに処理済みです。</p>"), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  return new NextResponse(page("配信停止", `<h1>配信を停止しました</h1><p>${r.email} 宛てのご案内は今後お送りしません。<br>ご迷惑をおかけして申し訳ありませんでした。</p>`), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/** ワンクリック配信停止（メールソフトの「登録解除」ボタン。List-Unsubscribe-Post） */
export async function POST(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  stop(token);
  return NextResponse.json({ ok: true });
}
