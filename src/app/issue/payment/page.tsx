"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";

type Status = {
  keys: { publishableKey: boolean; secretKey: boolean; clientId: boolean; webhookSecret: boolean };
  mode: "test" | "live" | null;
  ready: boolean;
  apiReachable: boolean;
  apiError: string;
  connected: boolean;
  accountName: string;
  redirectUri: string;
};

const KEY_LABELS: { key: keyof Status["keys"]; name: string; where: string }[] = [
  { key: "publishableKey", name: "STRIPE_PUBLISHABLE_KEY", where: "開発者 → APIキー（pk_test_… から始まる方）" },
  { key: "secretKey", name: "STRIPE_SECRET_KEY", where: "開発者 → APIキー（sk_test_… から始まる方）" },
  { key: "clientId", name: "STRIPE_CONNECT_CLIENT_ID", where: "設定 → Connect → アカウント登録のオプション → OAuth（ca_… ）" },
  { key: "webhookSecret", name: "STRIPE_WEBHOOK_SECRET", where: "開発者 → Webhook → エンドポイントを追加（whsec_… ）" },
];

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-400"
      }`}
    >
      {ok ? "✓" : "—"}
    </span>
  );
}

function PaymentSettings() {
  const search = useSearchParams();
  const [st, setSt] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<Status>("/api/stripe/status")
      .then(setSt)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const m = search.get("msg");
    if (!m) return;
    const t = setTimeout(() => setMsg(m), 0);
    return () => clearTimeout(t);
  }, [search]);

  if (loading) return <div className="text-sm text-slate-400">読み込み中...</div>;
  if (!st) return <div className="text-sm text-rose-600">状態を取得できませんでした。</div>;

  const doneCount = Object.values(st.keys).filter(Boolean).length;

  return (
    <div className="max-w-3xl">
      <Link href="/issue" className="text-sm text-slate-500 hover:text-slate-700">← 発注書・請求書</Link>
      <h1 className="mt-1 mb-1 text-2xl font-bold">決済の設定（Stripe）</h1>
      <p className="mb-6 text-sm text-slate-500">
        ご自身のStripeアカウントを繋ぐと、請求書に決済リンクを付けられるようになります。
        <b className="text-hive-900">お代金はお客様のStripeへ直接入金され、当社が預かることはありません。</b>
      </p>

      {msg && (
        <div className="mb-5 rounded-xl border border-night-300 bg-night-50 px-4 py-3 text-sm text-hive-900">{msg}</div>
      )}

      {/* 1. 鍵の設定状況 */}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-hive-900">1. Stripeの鍵</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${doneCount === 4 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {doneCount} / 4 設定済み
          </span>
          {st.mode && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.mode === "test" ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-700"}`}>
              {st.mode === "test" ? "テスト環境" : "本番環境"}
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {KEY_LABELS.map((k) => (
            <div key={k.key} className="flex items-start gap-3">
              <Dot ok={st.keys[k.key]} />
              <div className="min-w-0">
                <div className="font-mono text-sm font-medium">{k.name}</div>
                {!st.keys[k.key] && <div className="text-xs text-slate-500">{k.where}</div>}
              </div>
            </div>
          ))}
        </div>

        {doneCount < 4 && (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            Railway → プロジェクト <b>blissful-learning</b> → サービス <b>food-hatch</b> → <b>Variables</b> タブで、
            上の名前のまま追加してください。保存すると自動で再起動され、この画面の印が緑になります。
            <br />
            <b className="text-hive-900">鍵はチャットやメールに貼らず、Railwayの入力欄に直接貼り付けてください。</b>
          </div>
        )}

        {st.keys.secretKey && (
          <div className={`mt-4 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${st.apiReachable ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
            <Dot ok={st.apiReachable} />
            <div>
              {st.apiReachable
                ? "Stripeに接続できています。"
                : `Stripeに接続できませんでした: ${st.apiError}`}
            </div>
          </div>
        )}
      </section>

      {/* 2. アカウント連携 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-hive-900">2. ご自身のStripeアカウントを連携</h2>
          {st.connected && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">連携済み</span>
          )}
        </div>

        {st.connected ? (
          <>
            <p className="mb-4 text-sm text-slate-600">
              {st.accountName ? <b>{st.accountName}</b> : "Stripeアカウント"} と連携しています。
              請求書に決済リンクを付けられる状態です。
            </p>
            <button
              onClick={async () => {
                if (!confirm("連携を解除しますか？\n（Stripeのアカウント自体は消えません）")) return;
                await api("/api/stripe/disconnect", { method: "POST" });
                setMsg("連携を解除しました");
                load();
              }}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:border-rose-300 hover:text-rose-600"
            >
              連携を解除する
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600">
              ボタンを押すとStripeの画面が開きます。ログインして許可すると、この画面に戻ってきます。
            </p>
            {st.ready ? (
              <a
                href="/api/stripe/connect"
                className="inline-block rounded-lg bg-night-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-night-600"
              >
                ご自身のStripeを連携する →
              </a>
            ) : (
              <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
                先に上の鍵（シークレットキーとクライアントID）を設定してください。
              </div>
            )}
          </>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        カード決済手数料はStripeの料率（国内カード3.6%）が受取側にかかります。{BRAND.name}は決済手数料を上乗せしません。
      </p>
    </div>
  );
}

export default function PaymentSettingsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">読み込み中...</div>}>
      <PaymentSettings />
    </Suspense>
  );
}
