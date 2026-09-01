import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { activeProvider, NoProviderError } from "@/lib/server/llm";
import { consumeAi, limitResponse } from "@/lib/server/ai-usage";
import {
  mightBeListRequest, extractFilter, previewList, acquireList, costFor, filterToQuery, describeFilter, companyDbReady,
  scriptSystem, generateSalesReply, LIST_BLOCK, LIST_POINTS, LIST_MAX,
} from "@/lib/server/sales-agent";
import { filterFrom } from "@/lib/server/company-filter";

type Payload =
  | { type: "list_preview"; query: string; description: string; total: number; withPhone: number; sample: { name: string; prefecture: string | null; industry: string | null; employees: number | null; phoneMasked: string | null }[]; count: number; cost: number; unit: string }
  | { type: "list_done"; added: number; skipped: number; charged: number }
  | { type: "list_unavailable" }
  | { type: "sales_script" };
type Msg = { role: "user" | "assistant"; content: string; payload?: Payload };

function loadSession(userId: string, sessionId: string | undefined, title: string) {
  const db = getDb();
  let session = sessionId
    ? (db.prepare("SELECT id, messages FROM agent_sessions WHERE id = ? AND user_id = ? AND kind = 'sales'").get(sessionId, userId) as { id: string; messages: string } | undefined)
    : undefined;
  if (!session) {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO agent_sessions (id, user_id, title, messages, kind) VALUES (?, ?, ?, '[]', 'sales')").run(id, userId, title.slice(0, 40) || "営業AI");
    session = { id, messages: "[]" };
  }
  return { id: session.id, history: JSON.parse(session.messages) as Msg[] };
}

function reply(sessionId: string, history: Msg[], msg: Msg) {
  getDb().prepare("UPDATE agent_sessions SET messages = ? WHERE id = ?").run(JSON.stringify([...history, msg]), sessionId);
  return NextResponse.json({ sessionId, reply: msg.content, payload: msg.payload ?? null });
}

function brandContextFor(userId: string, brandProfileId?: string) {
  const db = getDb();
  let brandContext = "";
  if (brandProfileId) {
    const bp = db.prepare("SELECT * FROM brand_profiles WHERE id = ? AND user_id = ?").get(brandProfileId, userId) as
      | { name: string; facts: string; stances: string; ng_items: string; notes: string }
      | undefined;
    if (bp) brandContext = `\n\n<brand_profile name="${bp.name}">\n確定情報: ${bp.facts}\nスタンス: ${bp.stances}\nNG事項: ${bp.ng_items}\n補足: ${bp.notes}\n</brand_profile>`;
  }
  const ngWords = (db.prepare("SELECT word FROM ng_words").all() as { word: string }[]).map((r) => r.word);
  return { brandContext, ngWords };
}

export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare("SELECT id, title, messages, created_at FROM agent_sessions WHERE user_id = ? AND kind = 'sales' ORDER BY created_at DESC LIMIT 30")
    .all(user.id) as { id: string; title: string; messages: string; created_at: string }[];
  return NextResponse.json(rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at, messages: JSON.parse(r.messages) })));
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role === "freelancer") return NextResponse.json({ error: "営業AIは発注者向けの機能です" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const { id: sessionId, history } = loadSession(user.id, b.sessionId, b.message ?? "営業AI");

  // ─── ボタン: 条件どおりに取得（AIを通さず確実に） ───
  if (b.action?.type === "acquire") {
    const query = String(b.action.query ?? "");
    const count = Math.min(LIST_MAX, Math.max(1, Number(b.action.count) || LIST_BLOCK));
    if (!companyDbReady()) return NextResponse.json({ error: "企業DBがまだ準備できていません" }, { status: 503 });
    const filter = filterFrom(new URL(`http://x/?${query}`));
    try {
      const r = await acquireList(user, filter, count);
      const userMsg: Msg = { role: "user", content: `この条件で ${count} 社を営業リストに取得する` };
      const msg: Msg = {
        role: "assistant",
        content:
          r.added > 0
            ? `${r.added} 社を営業リストに入れました${r.skipped ? `（すでに入っていた ${r.skipped} 社は飛ばしました）` : ""}${r.charged ? `。${r.charged}🍯 を使いました` : ""}。「営業リスト」で確認し、架電案件に紐付けてください。`
            : "条件に合う会社はすべて営業リストに入っていました（新しく追加した会社はありません。ポイントは使っていません）。",
        payload: { type: "list_done", added: r.added, skipped: r.skipped, charged: r.charged },
      };
      return reply(sessionId, [...history, userMsg], msg);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "取得できませんでした" }, { status: 400 });
    }
  }

  const message = String(b.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "メッセージが空です" }, { status: 400 });
  if (!activeProvider()) return NextResponse.json({ error: new NoProviderError().message }, { status: 503 });

  try {
    consumeAi(user.id, "chat", "sales_agent");
  } catch (e) {
    const lr = limitResponse(e);
    if (lr) return NextResponse.json(lr.body, { status: lr.status });
    throw e;
  }
  const userMsg: Msg = { role: "user", content: message };

  // ─── リストの依頼 → 条件に変換 → 件数と見本 ───
  if (mightBeListRequest(message)) {
    let ex: Awaited<ReturnType<typeof extractFilter>> = null;
    try {
      ex = await extractFilter(message);
    } catch {
      ex = null;
    }
    if (ex) {
      if (!companyDbReady()) {
        const msg: Msg = {
          role: "assistant",
          content: `条件は「${describeFilter(ex.filter)}」と読み取りましたが、企業データベースがまだ準備できていません。管理者が取り込むと、ここから直接リストを取得できます。それまでは「営業リスト作成（${LIST_BLOCK}件 ${LIST_POINTS}🍯）」を発注してください。`,
          payload: { type: "list_unavailable" },
        };
        return reply(sessionId, [...history, userMsg], msg);
      }
      const pv = await previewList(ex.filter);
      const cost = costFor(user, ex.count);
      const content =
        pv.total === 0
          ? `「${describeFilter(ex.filter)}」に合う会社は見つかりませんでした。地域や業種をゆるめて言い直してください（例: 業種を「飲食」だけにする）。`
          : `「${describeFilter(ex.filter)}」は ${pv.total.toLocaleString()} 社あります（電話あり ${pv.withPhone.toLocaleString()}）。下の見本を確認して、必要な社数を営業リストに取得してください。${cost ? `料金は ${LIST_BLOCK} 社ごとに ${LIST_POINTS}🍯 です。` : ""}`;
      const msg: Msg = {
        role: "assistant",
        content,
        payload: {
          type: "list_preview",
          query: filterToQuery(ex.filter),
          description: describeFilter(ex.filter),
          total: pv.total,
          withPhone: pv.withPhone,
          sample: pv.sample,
          count: Math.min(ex.count, pv.total || ex.count),
          cost,
          unit: user.role === "admin" ? "社内なので無料" : `${LIST_BLOCK}社ごとに ${LIST_POINTS}🍯`,
        },
      };
      return reply(sessionId, [...history, userMsg], msg);
    }
  }

  // ─── スクリプト作成・営業相談 ───
  const { brandContext, ngWords } = brandContextFor(user.id, b.brandProfileId);
  const system = scriptSystem(brandContext, ngWords);
  let text: string;
  try {
    text = await generateSalesReply(system, [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: message }]);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "生成に失敗しました" }, { status: 502 });
  }
  const isScript = /^#\s|## 受付突破|## 切り返し/m.test(text);
  return reply(sessionId, [...history, userMsg], { role: "assistant", content: text, payload: isScript ? { type: "sales_script" } : undefined });
}
