import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";

const MOCK = {
  title: "参考動画の分析（デモ結果）",
  summary:
    "GEMINI_API_KEY が未設定のため、これはデモ用のサンプル分析です。キーを設定すると実際の動画をシーン分解します。",
  hook: "冒頭3秒で「○○3選」という有益情報テロップと意外性のある動作を組み合わせ、離脱を防ぐフックになっています。",
  scenes: [
    { time: "0:00-0:03", label: "フック", note: "有益情報に見せかけた導入。テロップで期待値を作る。" },
    { time: "0:03-0:08", label: "ボケ・展開", note: "予想を外す展開で親近感を演出。コメントを誘発。" },
    { time: "0:08-0:15", label: "本編", note: "本題の情報提供。テンポの良いカット割り。" },
    { time: "0:15-0:20", label: "CTA", note: "プロフィール誘導とフォロー訴求で締め。" },
  ],
  retention: ["強いテーマ選定", "3秒以内のフック", "セルフツッコミによる親近感"],
  applications: [
    { priority: "高", note: "「○選」系フックを使う場合は、動画内で必ず回収する。" },
    { priority: "中", note: "コメント欄を活性化させるツッコミどころを1つ仕込む。" },
  ],
};

export async function POST(req: Request) {
  await requireUser();
  const { url } = await req.json();
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ ...MOCK, mock: true });
  }
  // Geminiが直接読めるのはYouTube URLのみ。TikTok等は説明ベースの分析にフォールバック。
  const isYouTube = /youtube\.com|youtu\.be/.test(url);
  let tiktokMeta = "";
  if (!isYouTube && url.includes("tiktok.com")) {
    try {
      const oe = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (oe.ok) {
        const meta = await oe.json();
        tiktokMeta = `\n参考情報 — 投稿者: ${meta.author_name ?? ""} / キャプション: ${meta.title ?? ""}`;
      }
    } catch {
      // メタ取得に失敗しても分析は続行
    }
  }

  const body = {
    contents: [
      {
        parts: [
          ...(isYouTube ? [{ file_data: { file_uri: url } }] : []),
          {
            text: (isYouTube
              ? "このショート動画を分析して、次のJSONだけを返してください:"
              : `次のショート動画URLとキャプションから、想定される構成・フック・改善提案を推定してJSONだけを返してください。URL: ${url}${tiktokMeta}\n形式:`) + " {\"title\":string,\"summary\":string,\"hook\":string,\"scenes\":[{\"time\":string,\"label\":string,\"note\":string}],\"retention\":[string],\"applications\":[{\"priority\":\"高\"|\"中\"|\"低\",\"note\":string}]} 。シーンはタイムスタンプ付きで分解すること。日本語で。",
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  };
    const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL ?? "gemini-3.6-flash"}:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: `Gemini APIエラー: ${detail.slice(0, 300)}` }, { status: 502 });
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try {
    return NextResponse.json({ ...JSON.parse(text), mock: false });
  } catch {
    return NextResponse.json({ error: "分析結果の解析に失敗しました" }, { status: 502 });
  }
}
