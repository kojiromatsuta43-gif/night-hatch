import Anthropic from "@anthropic-ai/sdk";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export class NoProviderError extends Error {
  constructor() {
    super(
      "AIのAPIキーが設定されていません。sodatsu-clone/.env.local に GEMINI_API_KEY（無料）または ANTHROPIC_API_KEY を設定し、サーバーを再起動してください。"
    );
  }
}

export function activeProvider(): "anthropic" | "gemini" | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

async function geminiCall(body: unknown): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini APIエラー (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("AIから応答が返りませんでした（安全フィルタの可能性があります）");
  return text;
}

/** 会話形式のテキスト生成 */
export async function generateText(system: string, messages: ChatMessage[]): Promise<string> {
  const provider = activeProvider();
  if (!provider) throw new NoProviderError();

  if (provider === "anthropic") {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      system,
      messages,
    });
    if (response.stop_reason === "refusal") {
      throw new Error("このリクエストには回答できませんでした。表現を変えてお試しください。");
    }
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  return geminiCall({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  });
}

/** JSONスキーマに沿った構造化出力 */
export async function generateJson<T>(
  system: string,
  prompt: string,
  schema: Record<string, unknown>
): Promise<T> {
  const provider = activeProvider();
  if (!provider) throw new NoProviderError();

  if (provider === "anthropic") {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: { type: "json_schema", schema } },
    });
    if (response.stop_reason === "refusal") throw new Error("抽出できませんでした");
    const block = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return JSON.parse(block?.text ?? "{}") as T;
  }

  const text = await geminiCall({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: toGeminiSchema(schema),
    },
  });
  return JSON.parse(text) as T;
}

/** JSON Schema を Gemini の responseSchema 形式に変換（additionalProperties等を除去） */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "additionalProperties") continue;
        out[k] = walk(v);
      }
      return out;
    }
    return node;
  };
  return walk(schema) as Record<string, unknown>;
}
