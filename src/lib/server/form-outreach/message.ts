// 文面生成: テンプレート差し込み / AI個別生成 / ハイブリッド（テンプレの {{AI冒頭}} だけAI）
// AIは本体の llm.ts（管理画面の用途別モデル設定に従う。task='sales'）
import { getDb } from "../db";
import { generateText, activeProvider } from "../llm";
import type { Campaign, Job, SenderProfile } from "./schema";

export type Vars = Record<string, string>;

export function buildVars(job: Pick<Job, "company_name" | "industry" | "sub_industry" | "prefecture" | "representative">, sender: SenderProfile): Vars {
  return {
    会社名: job.company_name,
    企業名: job.company_name,
    業種: job.sub_industry || job.industry,
    都道府県: job.prefecture,
    代表者名: job.representative,
    代表者: job.representative ? `${job.representative}様` : "ご担当者様",
    自社名: sender.company,
    担当者: sender.person,
    自社メール: sender.reply_email || sender.email,
    自社電話: sender.tel,
    自社URL: sender.url,
  };
}

export function renderTemplate(tpl: string, vars: Vars): string {
  return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

const SYSTEM_BASE = `あなたは日本のBtoB営業担当のアシスタントです。企業の問い合わせフォームに送る営業メッセージを書きます。
守ること:
- 丁寧なビジネス日本語。誇張・断定・虚偽の実績は書かない。絵文字・記号装飾は使わない
- 相手企業の情報に触れるときは、渡された情報にある事実だけを使う。無い情報は推測で書かない
- 「お忙しいところ恐れ入ります」等の定型は最小限。相手にとっての具体的なメリットを1つに絞る
- 出力は本文だけ。前置きや説明、引用符は付けない`;

function companyInfo(job: Job, site: { title: string; text: string }, textLimit: number) {
  return [
    `会社名: ${job.company_name}`,
    job.industry && `業種: ${job.industry}${job.sub_industry ? ` / ${job.sub_industry}` : ""}`,
    job.prefecture && `所在地: ${job.prefecture}`,
    site.title && `サイトタイトル: ${site.title}`,
    site.text && `サイト本文（抜粋）: ${site.text.slice(0, textLimit)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** ハイブリッド: テンプレの {{AI冒頭}} 部分だけを企業ごとに生成 */
export async function generateOpening(job: Job, campaign: Campaign, site: { title: string; text: string }): Promise<string> {
  const user = `次の企業に送る営業メッセージの「冒頭の1〜2文」だけを書いてください。この後にこちらのサービス紹介文が続きます。
相手企業の事業内容やサイトの内容に具体的に触れ、「なぜ貴社に連絡したか」が伝わるようにしてください。挨拶（突然のご連絡失礼いたします 等）は不要で、いきなり本題の1〜2文だけを出力してください。60〜120文字。

【相手企業】
${companyInfo(job, site, 2000)}

【こちらのサービス（参考）】
${campaign.template_text.slice(0, 800)}

${campaign.ai_instruction ? `【追加指示】\n${campaign.ai_instruction}` : ""}`;
  const out = await generateText(SYSTEM_BASE, [{ role: "user", content: user }], { task: "sales" });
  return out.replace(/^["「]|["」]$/g, "").trim().slice(0, 300);
}

/** 全文AI生成 */
export async function generateFullMessage(job: Job, sender: SenderProfile, campaign: Campaign, site: { title: string; text: string }): Promise<string> {
  const user = `次の企業の問い合わせフォームに送る営業メッセージ全文を書いてください。400〜600文字。冒頭で相手企業の事業に具体的に触れ、こちらのサービスが相手にどう役立つかを1点に絞って伝え、最後に「ご興味があればご返信ください」と連絡先で締め、末尾に「不要な場合はその旨ご連絡いただければ以後のご連絡は控える」旨の一文を入れてください。

【相手企業】
${companyInfo(job, site, 2500)}

【こちらのサービス・伝えたいこと】
${campaign.template_text}

【送信者】
${sender.company} ${sender.person}
メール: ${sender.reply_email || sender.email}${sender.tel ? ` / 電話: ${sender.tel}` : ""}${sender.url ? ` / ${sender.url}` : ""}

${campaign.ai_instruction ? `【追加指示】\n${campaign.ai_instruction}` : ""}`;
  return (await generateText(SYSTEM_BASE, [{ role: "user", content: user }], { task: "sales" })).trim();
}

/** キャンペーンのモードに応じて最終文面を作る */
export async function composeMessage(job: Job, sender: SenderProfile, campaign: Campaign, site: { title: string; text: string }): Promise<{ subject: string; message: string; aiUsed: boolean }> {
  const vars = buildVars(job, sender);
  const subject = renderTemplate(campaign.subject_text || "サービスのご案内", vars);
  let message: string;
  let aiUsed = false;
  const canAi = activeProvider() !== null;

  if (campaign.mode === "ai" && canAi) {
    message = await generateFullMessage(job, sender, campaign, site);
    aiUsed = true;
  } else if (campaign.mode === "hybrid" && canAi && campaign.template_text.includes("{{AI冒頭}}")) {
    const opening = await generateOpening(job, campaign, site);
    message = renderTemplate(campaign.template_text, { ...vars, AI冒頭: opening });
    aiUsed = true;
  } else {
    const fallbackOpening = vars.業種
      ? `${vars.業種}の事業を展開されている貴社に、ぜひご案内したいサービスがありご連絡いたしました。`
      : "貴社のホームページを拝見し、ぜひご案内したいサービスがありご連絡いたしました。";
    message = renderTemplate(campaign.template_text, { ...vars, AI冒頭: fallbackOpening });
  }
  return { subject, message: message.trim(), aiUsed };
}

/** 本体の NGワード（管理画面で管理）に引っかかる語を返す */
export function findNgWords(text: string): string[] {
  const rows = getDb().prepare("SELECT word FROM ng_words").all() as { word: string }[];
  return rows.map((r) => r.word).filter((w) => w && text.includes(w));
}

export const DEFAULT_TEMPLATE = `{{会社名}}
{{代表者}}

突然のご連絡失礼いたします。{{自社名}}の{{担当者}}と申します。

{{AI冒頭}}

私どもは貴社の近隣でお店を営んでおります。歓送迎会・忘年会の二次会や貸切パーティー、会食後のご利用に向けて、法人様向けの貸切プランをご用意しております。
料金はすべて事前にご案内する明朗会計で、人数やご予算に合わせたご相談も承っております。社内行事のご予定がございましたら、ぜひ一度ご検討ください。

もしご興味がございましたら、下記までご連絡いただけますと幸いです。貸切プランのご案内資料をお送りいたします。

{{自社名}} {{担当者}}
メール: {{自社メール}}
電話: {{自社電話}}
{{自社URL}}

※本メッセージが不要な場合は、お手数ですが上記メールまでその旨ご連絡ください。以後のご連絡は控えさせていただきます。`;
