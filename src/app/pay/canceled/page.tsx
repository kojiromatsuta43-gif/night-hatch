import Link from "next/link";

/** 支払いを途中でやめた人が戻ってくる画面。 */
export default function PayCanceledPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-honey-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        <h1 className="text-xl font-bold text-hive-900">お支払いは完了していません</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          手続きを途中でやめられました。請求書のお支払いリンクから、いつでもやり直せます。
        </p>
        <p className="mt-6 text-xs text-slate-400">
          リンクが見つからない場合は、請求元にお問い合わせください。
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-honey-700 hover:underline">
          トップへ
        </Link>
      </div>
    </div>
  );
}
