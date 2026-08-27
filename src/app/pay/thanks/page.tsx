"use client";

import BeeLogo from "@/components/BeeLogo";

/**
 * お支払いが終わった人が最初に見る画面。
 * 支払う人はログインしていないので、この配下は認証なしで開ける（AppShell参照）。
 */
export default function PayThanksPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-honey-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-honey-200 bg-white px-8 py-10 text-center shadow-sm">
        <BeeLogo className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-xl font-bold text-hive-900">お支払いありがとうございました</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          決済が完了しました。領収書はStripeからメールでお送りしています。
          <br />
          このページは閉じていただいて大丈夫です。
        </p>
        <p className="mt-6 text-xs text-slate-400">
          請求元へは自動で通知されます。ご不明な点は請求書に記載の連絡先までお問い合わせください。
        </p>
      </div>
    </div>
  );
}
