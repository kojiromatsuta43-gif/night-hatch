import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { generateText, activeProvider, NoProviderError } from "@/lib/server/llm";

const SYSTEM = `あなたは「BRIDGE HATCHエージェント」。中小企業のSNS運用・制作発注を支援するアシスタントです。
主な仕事: ショート動画の台本作成、構成案の提案、発注内容の整理、競合分析のアドバイス。
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

export async function POST(req: Request) {
  const user = await requireUser();
  const { sessionId, message, brandProfileId } = await req.json();
  const db = getDb();

  if (!activeProvider()) {
    return NextResponse.json({ error: new NoProviderError().message }, { status: 503 });
  }

  let session = sessionId
    ? (db.prepare("SELECT * FROM agent_sessions WHERE id = ? AND user_id = ?").get(sessionId, user.id) as
        | { id: string; messages: string }
        | undefined)
    : undefined;
  if (!session) {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO agent_sessions (id, user_id, title, messages) VALUES (?, ?, ?, '[]')").run(
      id, user.id, message.slice(0, 40)
    );
    session = { id, messages: "[]" };
  }

  const history = JSON.parse(session.messages) as { role: "user" | "assistant"; content: string }[];

  let brandContext = "";
  if (brandProfileId) {
    const bp = db.prepare("SELECT * FROM brand_profiles WHERE id = ? AND user_id = ?").get(brandProfileId, user.id) as
      | { name: string; facts: string; stances: string; ng_items: string; notes: string }
      | undefined;
    if (bp) {
      brandContext = `\n\n<brand_profile name="${bp.name}">\n確定情報: ${bp.facts}\nスタンス: ${bp.stances}\nNG事項: ${bp.ng_items}\n補足: ${bp.notes}\n</brand_profile>`;
    }
  }
  const ngWords = (db.prepare("SELECT word FROM ng_words").all() as { word: string }[]).map((r) => r.word);
  const system =
    SYSTEM + brandContext + (ngWords.length ? `\n\nプラットフォーム共通NGワード（絶対に使わない）: ${ngWords.join("、")}` : "");

  let text: string;
  try {
    text = await generateText(system, [...history, { role: "user", content: message }]);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "生成に失敗しました" }, { status: 502 });
  }

  const flagged = ngWords.filter((w) => text.includes(w));
  const newHistory = [...history, { role: "user", content: message }, { role: "assistant", content: text }];
  db.prepare("UPDATE agent_sessions SET messages = ? WHERE id = ?").run(JSON.stringify(newHistory), session.id);

  return NextResponse.json({ sessionId: session.id, reply: text, ngFlags: flagged });
}

export async function GET() {
  const user = await requireUser();
  const rows = getDb()
    .prepare("SELECT id, title, messages, created_at FROM agent_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30")
    .all(user.id) as { id: string; title: string; messages: string; created_at: string }[];
  return NextResponse.json(
    rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at, messages: JSON.parse(r.messages) }))
  );
}
