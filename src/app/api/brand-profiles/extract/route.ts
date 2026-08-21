import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { generateJson, activeProvider, NoProviderError } from "@/lib/server/llm";

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
};

const SYSTEM =
  "与えられた会社資料テキストから、ブランドプロファイルを抽出する。facts=変えてはいけない確定情報（会社名・所在地・設立・価格・実績数値など、label/value形式）。stances=意見が割れるテーマへの自社の立場。ng_items=避けたい表現・規制。notes=その他の補足。資料に書かれている情報のみを使い、推測で補わない。JSONのみを返す。";

export async function POST(req: Request) {
  await requireUser();
  const { text } = await req.json();
  if (!activeProvider()) {
    return NextResponse.json({ error: new NoProviderError().message }, { status: 503 });
  }
  try {
    const result = await generateJson(SYSTEM, text.slice(0, 100000), SCHEMA);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "抽出に失敗しました" }, { status: 502 });
  }
}
