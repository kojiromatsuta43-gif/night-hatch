import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { consumeFromGrants } from "@/lib/server/points-ledger";
import { requireUser } from "@/lib/server/auth";
import { generateText, activeProvider, NoProviderError } from "@/lib/server/llm";
import { consumeAi, limitResponse } from "@/lib/server/ai-usage";
import { searchRefVideos, mightBeSearch, extractSearchKeyword, VideoHit } from "@/lib/server/agent-tools";
import { notifyNewJob } from "@/lib/server/notifications";
import { POINTS_BY_CATEGORY } from "@/lib/data";
import { BRAND } from "@/lib/brand";

const SYSTEM = `${BRAND.agent.system}
台本を作るときは以下の形式で出力する:
# タイトル
## フック (0:00-0:03)
セリフ・画面テロップ・映像指示
## 本編
シーンごとにタイムスタンプ、セリフ、テロップ、映像指示
## CTA
締めのセリフとCTA
ユーザーのブランドプロファイルが与えられた場合、確定情報の数値・固有名詞は改変せずそのまま使い、スタンスに従い、NG事項の表現を避けること。
回答は日本語で、簡潔に。`;

// メッセージに載せる追加データ。動画カード・発注フォームなどをUIが描くために使う
type Payload =
  | { type: "videos"; keyword: string; items: VideoHit[] }
  | { type: "script"; refUrl: string; refTitle: string }
  | { type: "order_form"; draft: OrderDraft }
  | { type: "order_confirm"; draft: OrderDraft; points: number; balance: number }
  | { type: "order_done"; projectId: string; title: string; points: number };

type OrderDraft = {
  category: string;
  title: string;
  deadline: string;
  note: string;
  refUrl: string;
  refTitle: string;
  scriptText: string;
};

type Msg = { role: "user" | "assistant"; content: string; payload?: Payload };

/** エージェント経由で発注できるカテゴリ（ポイントは共通表から引く） */
const ORDERABLE = BRAND.orderable;

function loadSession(userId: string, sessionId: string | undefined, title: string) {
  const db = getDb();
  let session = sessionId
    ? (db.prepare("SELECT * FROM agent_sessions WHERE id = ? AND user_id = ?").get(sessionId, userId) as
        | { id: string; messages: string }
        | undefined)
    : undefined;
  if (!session) {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO agent_sessions (id, user_id, title, messages) VALUES (?, ?, ?, '[]')").run(
      id, userId, title.slice(0, 40) || "新しい会話"
    );
    session = { id, messages: "[]" };
  }
  return session;
}

function reply(sessionId: string, history: Msg[], msg: Msg, extra: Record<string, unknown> = {}) {
  const newHistory = [...history, msg];
  getDb().prepare("UPDATE agent_sessions SET messages = ? WHERE id = ?").run(JSON.stringify(newHistory), sessionId);
  return NextResponse.json({ sessionId, reply: msg.content, payload: msg.payload ?? null, ...extra });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const b = await req.json();
  const db = getDb();

  const session = loadSession(user.id, b.sessionId, b.message ?? "発注の相談");
  const history = JSON.parse(
    (db.prepare("SELECT messages FROM agent_sessions WHERE id = ?").get(session.id) as { messages: string }).messages
  ) as Msg[];

  // ─── ボタン操作（決まった手順はAIを通さず確実に動かす） ───
  const action = b.action as { type: string; [k: string]: unknown } | undefined;

  if (action?.type === "make_script") {
    return makeScript(user, session.id, history, String(action.videoId ?? ""), b.brandProfileId);
  }

  if (action?.type === "start_order") {
    const d = normalizeDraft(action.draft);
    const userMsg: Msg = { role: "user", content: "この内容で発注に進みたい" };
    const msg: Msg = {
      role: "assistant",
      content: "発注条件を入力してください。件名と納期が決まれば、内容確認に進めます。",
      payload: { type: "order_form", draft: d },
    };
    return reply(session.id, [...history, userMsg], msg);
  }

  if (action?.type === "confirm_order") {
    const d = normalizeDraft(action.draft);
    if (!ORDERABLE.includes(d.category)) {
      return NextResponse.json({ error: "このカテゴリはエージェントから発注できません" }, { status: 400 });
    }
    if (!d.title.trim()) return NextResponse.json({ error: "件名を入力してください" }, { status: 400 });
    if (!d.deadline || d.deadline < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: "納期は今日以降の日付にしてください" }, { status: 400 });
    }
    const points = POINTS_BY_CATEGORY[d.category] ?? 10;
    const userMsg: Msg = { role: "user", content: "発注条件を入力した" };
    const msg: Msg = {
      role: "assistant",
      content:
        points > user.points
          ? `内容を確認してください。※ハニーPが足りません（必要 ${points} / 残高 ${user.points}）。「ハニーP」画面から追加購入できます。`
          : "内容を確認してください。よければ「この内容で発注する」を押してください。",
      payload: { type: "order_confirm", draft: d, points, balance: user.points },
    };
    return reply(session.id, [...history, userMsg], msg);
  }

  if (action?.type === "place_order") {
    const d = normalizeDraft(action.draft);
    if (!ORDERABLE.includes(d.category) || !d.title.trim() || !d.deadline) {
      return NextResponse.json({ error: "発注内容が不完全です。内容確認からやり直してください" }, { status: 400 });
    }
    const points = POINTS_BY_CATEGORY[d.category] ?? 10;
    if (user.points < points) {
      return NextResponse.json({ error: `ハニーPが足りません（必要 ${points} / 残高 ${user.points}）` }, { status: 400 });
    }
    const projectId = crypto.randomUUID();
    const description = d.scriptText
      ? `AIエージェントで作成した台本を基に制作してください。\n\n${d.note}`.trim()
      : (d.note || (d.refTitle ? `参考動画「${d.refTitle}」のような${d.category}を希望` : `${d.category}を希望（詳細はAIエージェントで相談済み）`));
    db.transaction(() => {
      db.prepare(
        "INSERT INTO projects (id, user_id, title, category, description, points, deadline, status, detail, requested_on, assignee_id) VALUES (?,?,?,?,?,?,?,'募集中',?,?,NULL)"
      ).run(
        projectId, user.id, d.title, d.category, description, points, d.deadline,
        JSON.stringify({
          参考動画: d.refUrl,
          参考動画タイトル: d.refTitle,
          台本: d.scriptText,
          その他指示: d.note,
          発注元: "AIエージェント",
        }),
        new Date().toISOString().slice(0, 10)
      );
      db.prepare("UPDATE users SET points = points - ? WHERE id = ?").run(points, user.id);
      consumeFromGrants(db, user.id, points);
      db.prepare(
        "INSERT INTO point_transactions (id, user_id, amount, kind, memo) VALUES (?, ?, ?, 'spend', ?)"
      ).run(crypto.randomUUID(), user.id, -points, `案件登録: ${d.title}`);
      if (d.scriptText) {
        db.prepare("INSERT INTO scripts (id, user_id, title, content) VALUES (?, ?, ?, ?)").run(
          crypto.randomUUID(), user.id, d.title, d.scriptText
        );
      }
    })();
    notifyNewJob({ id: projectId, title: d.title, category: d.category, deadline: d.deadline, assignee_id: null });

    const userMsg: Msg = { role: "user", content: "この内容で発注する" };
    const msg: Msg = {
      role: "assistant",
      content: `発注が完了しました。「${d.title}」を募集中として登録し、フリーランスに通知しました。${d.scriptText ? "台本は「保存済み台本」にも保存してあります。" : ""}`,
      payload: { type: "order_done", projectId, title: d.title, points },
    };
    return reply(session.id, [...history, userMsg], msg);
  }

  // ─── 自由入力 ───
  const message = String(b.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "メッセージが空です" }, { status: 400 });

  if (!activeProvider()) {
    return NextResponse.json({ error: new NoProviderError().message }, { status: 503 });
  }

  const userMsg: Msg = { role: "user", content: message };

  // 「◯◯で伸びてる動画見せて」→ 自社DBを検索してカードで返す
  if (mightBeSearch(message)) {
    const keyword = await extractSearchKeyword(message);
    if (keyword) {
      const items = searchRefVideos(keyword);
      const content =
        items.length > 0
          ? `「${keyword}」に近い参考動画が ${items.length} 件見つかりました。気になる動画の「この動画で台本を作る」を押すと、その動画を参考にした台本をつくり、そのまま発注まで進めます。`
          : `「${keyword}」に合う参考動画は、いま登録されている参考動画の中には見つかりませんでした。${BRAND.agent.searchEmptyHint}`;
      const msg: Msg = { role: "assistant", content, payload: { type: "videos", keyword, items } };
      return reply(session.id, [...history, userMsg], msg, { ngFlags: [] });
    }
  }

  // 通常の会話（プランの回数上限を1回消費）
  try {
    consumeAi(user.id, "chat", "agent_chat");
  } catch (e) {
    const lr = limitResponse(e);
    if (lr) return NextResponse.json(lr.body, { status: lr.status });
    throw e;
  }
  const { system, ngWords } = buildSystem(user.id, b.brandProfileId);
  let text: string;
  try {
    text = await generateText(system, [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ], { task: "chat" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "生成に失敗しました" }, { status: 502 });
  }
  const flagged = ngWords.filter((w) => text.includes(w));
  return reply(session.id, [...history, userMsg], { role: "assistant", content: text }, { ngFlags: flagged });
}

/** 動画を1本選んで台本を作る */
async function makeScript(
  user: { id: string },
  sessionId: string,
  history: Msg[],
  videoId: string,
  brandProfileId?: string
) {
  const db = getDb();
  const video = db
    .prepare(
      `SELECT v.caption, v.url, a.name AS accountName, a.handle, a.followers, a.industry, a.bio
         FROM ref_videos v JOIN ref_accounts a ON a.id = v.account_id WHERE v.id = ?`
    )
    .get(videoId) as
    | { caption: string; url: string; accountName: string; handle: string; followers: number; industry: string; bio: string }
    | undefined;
  if (!video) return NextResponse.json({ error: "動画が見つかりません" }, { status: 404 });

  if (!activeProvider()) {
    return NextResponse.json({ error: new NoProviderError().message }, { status: 503 });
  }
  try {
    consumeAi(user.id, "gen", "agent_script");
  } catch (e) {
    const lr = limitResponse(e);
    if (lr) return NextResponse.json(lr.body, { status: lr.status });
    throw e;
  }
  const { system } = buildSystem(user.id, brandProfileId);
  const prompt = `次の参考動画をお手本に、同じ切り口・同じ熱量で、依頼主の商品/サービスに応用できるショート動画の台本を1本作ってください。
参考動画の情報:
- 投稿者: ${video.accountName}（${video.handle} / フォロワー${video.followers.toLocaleString()}人 / 業種: ${video.industry}）
- キャプション: ${video.caption}
- 投稿者の紹介文: ${video.bio}
動画そのものは見られないため、キャプションと業種から構成を推定してよい。冒頭に「この台本は参考動画のキャプションからの推定を含みます」と1行入れること。`;

  let text: string;
  try {
    text = await generateText(system, [{ role: "user", content: prompt }], { task: "chat" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "生成に失敗しました" }, { status: 502 });
  }

  const userMsg: Msg = { role: "user", content: `この動画で台本を作って: ${video.caption.slice(0, 40)}` };
  const msg: Msg = {
    role: "assistant",
    content: text,
    payload: { type: "script", refUrl: video.url, refTitle: video.caption.slice(0, 60) },
  };
  return reply(sessionId, [...history, userMsg], msg, { ngFlags: [] });
}

function buildSystem(userId: string, brandProfileId?: string) {
  const db = getDb();
  let brandContext = "";
  if (brandProfileId) {
    const bp = db
      .prepare("SELECT * FROM brand_profiles WHERE id = ? AND user_id = ?")
      .get(brandProfileId, userId) as
      | { name: string; facts: string; stances: string; ng_items: string; notes: string }
      | undefined;
    if (bp) {
      brandContext = `\n\n<brand_profile name="${bp.name}">\n確定情報: ${bp.facts}\nスタンス: ${bp.stances}\nNG事項: ${bp.ng_items}\n補足: ${bp.notes}\n</brand_profile>`;
    }
  }
  const ngWords = (db.prepare("SELECT word FROM ng_words").all() as { word: string }[]).map((r) => r.word);
  const system =
    SYSTEM + brandContext + (ngWords.length ? `\n\nプラットフォーム共通NGワード（絶対に使わない）: ${ngWords.join("、")}` : "");
  return { system, ngWords };
}

function normalizeDraft(raw: unknown): OrderDraft {
  const d = (raw ?? {}) as Record<string, unknown>;
  const pick = (k: string, max: number) => String(d[k] ?? "").slice(0, max);
  return {
    category: pick("category", 40) || "ショート動画編集",
    title: pick("title", 120),
    deadline: pick("deadline", 10),
    note: pick("note", 2000),
    refUrl: pick("refUrl", 500),
    refTitle: pick("refTitle", 120),
    scriptText: pick("scriptText", 20000),
  };
}

export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare("SELECT id, title, messages, created_at FROM agent_sessions WHERE user_id = ? AND kind = 'agent' ORDER BY created_at DESC LIMIT 30")
    .all(user.id) as { id: string; title: string; messages: string; created_at: string }[];
  return NextResponse.json(
    rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at, messages: JSON.parse(r.messages) }))
  );
}
