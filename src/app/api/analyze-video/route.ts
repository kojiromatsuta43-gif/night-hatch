import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { consumeAi, limitResponse } from "@/lib/server/ai-usage";
import { resolveModel } from "@/lib/server/ai-settings";

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

/** 動画分析は Gemini 固定（動画を読めるのが Gemini だけ）。モデル名だけ設定に従う */
function geminiModelFor(task: "extract") {
  const r = resolveModel(task);
  return r?.provider === "gemini" ? r.model : process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { url } = (await req.json()) as { url?: string };
  const target = (url ?? "").trim();

  const isYouTube = /youtube\.com|youtu\.be/.test(target);
  const isTikTok = /tiktok\.com/.test(target);
  if (!isYouTube && !isTikTok) {
    return NextResponse.json(
      { error: "TikTok または YouTube の動画URLを入力してください。" },
      { status: 400 }
    );
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ ...MOCK, mock: true, source: isTikTok ? "tiktok" : "youtube", inferred: isTikTok });
  }

  try {
    consumeAi(user.id, "gen", "analyze_video");
  } catch (e) {
    const lr = limitResponse(e);
    if (lr) return NextResponse.json(lr.body, { status: lr.status });
    throw e;
  }

  // Geminiが動画そのものを読めるのはYouTubeのみ。
  // TikTokは公開情報（投稿者・キャプション・サムネイル）を集めてから推定分析する。
  let tiktokMeta = "";
  let thumbnail = "";
  let author = "";
  let caption = "";
  if (isTikTok) {
    try {
      const oe = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(target)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (oe.ok) {
        const meta = await oe.json();
        author = meta.author_name ?? "";
        caption = meta.title ?? "";
        thumbnail = meta.thumbnail_url ?? "";
        tiktokMeta = `\n投稿者: ${author}\nキャプション: ${caption}`;
      }
    } catch {
      // メタ取得に失敗しても、URLだけで推定を続行する
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
              : `TikTokのショート動画を分析します。動画そのものは再生できないため、下記の公開情報とTikTokの一般的な構成パターンから推定してください。推定であることを summary の冒頭に必ず明記すること。\nURL: ${target}${tiktokMeta}\n形式:`) + " {\"title\":string,\"summary\":string,\"hook\":string,\"scenes\":[{\"time\":string,\"label\":string,\"note\":string}],\"retention\":[string],\"applications\":[{\"priority\":\"高\"|\"中\"|\"低\",\"note\":string}]} 。シーンはタイムスタンプ付きで分解すること。日本語で。",
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  };
    const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelFor("extract")}:generateContent?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: `Gemini APIエラー: ${detail.slice(0, 300)}` }, { status: 502 });
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try {
    return NextResponse.json({
      ...JSON.parse(text),
      mock: false,
      source: isTikTok ? "tiktok" : "youtube",
      inferred: isTikTok,
      thumbnail,
      author,
      caption,
    });
  } catch {
    return NextResponse.json({ error: "分析結果の解析に失敗しました" }, { status: 502 });
  }
}
