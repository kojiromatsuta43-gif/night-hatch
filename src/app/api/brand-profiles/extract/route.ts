import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/server/auth";

const SCHEMA = {
  type: "object",
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "string" } },
        required: ["label", "value"],
        additionalProperties: false,
      },
    },
    stances: { type: "array", items: { type: "string" } },
    ng_items: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
  required: ["facts", "stances", "ng_items", "notes"],
  additionalProperties: false,
} as const;

export async function POST(req: Request) {
  await requireUser();
  const { text } = await req.json();
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEYが設定されていません。.env.local に追記して再起動してください。" },
      { status: 503 }
    );
  }
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 8000,
    system:
      "与えられた会社資料テキストから、ブランドプロファイルを抽出する。facts=変えてはいけない確定情報（会社名・所在地・設立・価格・実績数値など、label/value形式）。stances=意見が割れるテーマへの自社の立場。ng_items=避けたい表現・規制。notes=その他の補足。資料に書かれている情報のみを使い、推測で補わない。",
    messages: [{ role: "user", content: text.slice(0, 100000) }],
    output_config: { format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
  });
  if (response.stop_reason === "refusal") {
    return NextResponse.json({ error: "抽出できませんでした" }, { status: 422 });
  }
  const block = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return NextResponse.json(JSON.parse(block?.text ?? "{}"));
}
