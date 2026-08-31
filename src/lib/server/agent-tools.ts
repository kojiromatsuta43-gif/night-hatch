import { getDb } from "./db";
import { generateJson } from "./llm";

// ============================================================
//  エージェントの道具箱
//  「◯◯で伸びてる動画見せて」→ 自社DB を検索する。
//  TikTok自動取り込み（管理画面）で再生数が入っている動画は再生数順、
//  手入力の動画（再生数0）はフォロワー順で後ろに並ぶ。
// ============================================================

export type VideoHit = {
  id: string;
  caption: string;
  url: string;
  hue: number;
  accountName: string;
  handle: string;
  followers: number;
  industry: string;
  views: number;
  posted_at: string;
};

/** キーワードで参考動画を探す。アカウント名・業種・紹介文・キャプションを横断 */
export function searchRefVideos(keyword: string, limit = 9): VideoHit[] {
  const terms = keyword
    .split(/[\s、,／/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 4);
  if (terms.length === 0 && keyword.trim()) terms.push(keyword.trim());
  if (terms.length === 0) return [];

  const db = getDb();
  const cond = terms
    .map(() => "(v.caption LIKE ? OR a.name LIKE ? OR a.industry LIKE ? OR a.bio LIKE ? OR a.handle LIKE ?)")
    .join(" OR ");
  const params = terms.flatMap((t) => Array(5).fill(`%${t}%`));

  return db
    .prepare(
      `SELECT v.id, v.caption, v.url, v.hue, v.views, v.posted_at,
              a.name AS accountName, a.handle, a.followers, a.industry
         FROM ref_videos v
         JOIN ref_accounts a ON a.id = v.account_id
        WHERE ${cond}
        ORDER BY v.views DESC, a.followers DESC
        LIMIT ?`
    )
    .all(...params, limit) as VideoHit[];
}

/** 発言が「動画を探して」の依頼かどうか。まず正規表現で気配を見て、該当時だけAIに確定させる */
// 「動画」「アカウント」だけでも候補に入れ、最終判断はAI（extractSearchKeyword）に任せる
const SEARCH_HINT =
  /(見せて|みせて|見たい|みたい|探して|さがして|検索|伸びて|のびて|流行|はやっ|バズ|トレンド|人気|参考動画|事例|再生され|動画|アカウント|TikTok|ティックトック)/i;

export function mightBeSearch(message: string): boolean {
  return SEARCH_HINT.test(message);
}

export async function extractSearchKeyword(message: string): Promise<string | null> {
  try {
    const out = await generateJson<{ is_search: boolean; keyword: string }>(
      "あなたは発言の意図を判定する係。ユーザーが「参考になる動画・伸びている動画・バズっている動画を見たい/探したい」と依頼しているかを判定し、探したい主題のキーワード（業種・施術名・商品名など、助詞を除いた短い語）を抜き出す。台本や企画を作ってほしいだけの依頼は is_search=false。",
      `発言: ${message}`,
      {
        type: "object",
        properties: {
          is_search: { type: "boolean" },
          keyword: { type: "string" },
        },
        required: ["is_search", "keyword"],
        additionalProperties: false,
      }
    );
    return out.is_search && out.keyword.trim() ? out.keyword.trim() : null;
  } catch {
    return null;
  }
}
