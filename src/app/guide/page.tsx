"use client";

import Link from "next/link";
import BeeLogo from "@/components/BeeLogo";

const STEPS = [
  {
    n: 1,
    title: "参考動画から発注する",
    href: "/order",
    body: "「このアカウントみたいに作りたい」から始める発注フロー。業界を選び、参考アカウント → 動画を選ぶと、発注フォームに内容が引き継がれます。",
    highlight: "87アカウント・1,415本の実データを収録",
  },
  {
    n: 2,
    title: "AIエージェントで台本を作る",
    href: "/agent",
    body: "「美容クリニックのクマ取り施術を訴求する30秒のTikTok台本を作って」のように話しかけると、フック・本編・CTAまで構成された台本が出力されます。",
    highlight: "NGワード自動チェック付き",
  },
  {
    n: 3,
    title: "案件の進行を管理する",
    href: "/projects",
    body: "未公開 → 募集中 → 制作待ち → フィードバック → 完了 のカンバンで進捗を管理。テーブル表示にも切り替えられます。",
  },
  {
    n: 4,
    title: "ブランドプロファイルを登録する",
    href: "/brand-profile",
    body: "会社概要のテキストを貼ると、AIが「確定情報 / スタンス / NG事項」に自動で振り分け。以降の台本生成でこの情報が守られます。",
    highlight: "AIが数値・固有名詞を改変しません",
  },
  {
    n: 5,
    title: "参考動画を分析する",
    href: "/video-analysis",
    body: "TikTok・YouTubeのURLを入れると、シーン分解・フック分析・自社への応用ポイントをAIが提案します。",
  },
];

const OTHERS = [
  { label: "ダッシュボード", href: "/", body: "案件数とはちみつP残高の把握" },
  { label: "保存済み台本", href: "/scripts", body: "生成した台本の保存・お気に入り" },
  { label: "発注書・請求書", href: "/issue", body: "取引先管理と書類のステータス管理" },
  { label: "チャット", href: "/chat", body: "クリエイターとのやり取り" },
  { label: "はちみつP", href: "/points", body: "残高・購入・利用履歴" },
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-honey-400 to-honey-500 px-7 py-8 text-hive-900">
        <div className="text-sm font-medium opacity-80">デモのご案内</div>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold">
          <BeeLogo className="h-11 w-11" />
          BRIDGE HATCH
        </h1>
        <p className="mt-3 text-sm leading-relaxed opacity-90">
          制作案件の発注・管理プラットフォームのデモ版です。<br />
          参考動画からの発注、AIによる台本生成、案件進行管理、書類発行までを1つにまとめています。
        </p>
      </div>

      <h2 className="mb-4 text-lg font-bold">まずはこの5つをお試しください</h2>
      <div className="space-y-3">
        {STEPS.map((s) => (
          <Link
            key={s.n}
            href={s.href}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-honey-400"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-honey-400 text-sm font-bold text-hive-900">
              {s.n}
            </span>
            <span className="min-w-0">
              <span className="block font-bold">{s.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-slate-600">{s.body}</span>
              {s.highlight && (
                <span className="mt-2 inline-block rounded-full bg-honey-50 px-3 py-1 text-xs font-medium text-honey-700">
                  {s.highlight}
                </span>
              )}
            </span>
            <span className="ml-auto self-center text-slate-300">›</span>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold">その他の機能</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OTHERS.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-colors hover:border-honey-400"
          >
            <span className="font-semibold">{o.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{o.body}</span>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl bg-slate-100 p-5 text-xs leading-relaxed text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">ご確認いただく際の注意</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>本デモは開発中の環境です。データは予告なくリセットされる場合があります。</li>
          <li>はちみつPの購入は決済を行わないデモ動作です。</li>
          <li>AIの生成結果は必ず人の目でご確認ください。</li>
        </ul>
      </div>
    </div>
  );
}
