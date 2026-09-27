"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";
import BeeLogo from "@/components/BeeLogo";
import Illust from "@/components/Illust";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json();
      setError(data.error ?? "ログインに失敗しました");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 md:flex-row">
      {/* 左: 夜の店先のビジュアル */}
      <div className="relative flex flex-col justify-between overflow-hidden border-b border-gold-300 bg-ink-900 px-8 py-8 text-hive-900 md:w-[46%] md:border-b-0 md:border-r md:px-12 md:py-12">
        {/* 夜の光（ワインとシャンパンのぼかし） */}
        <span className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-night-500/25 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-gold-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-300 bg-ink-700"><BeeLogo className="h-9 w-9" /></span>
          <span className="font-latin text-2xl text-gold-600">{BRAND.name}</span>
        </div>
        <div className="relative my-10 md:my-0">
          <p className="font-latin text-xs text-gold-500">FOR BARS, LOUNGES &amp; CLUBS</p>
          <p className="mt-2 font-display text-[28px] leading-snug md:text-4xl">
            夜のお店の採用と集客、<br className="hidden md:block" />ハッチに任せてください。
          </p>
          <div className="mt-4 h-px w-24 bg-gradient-to-r from-gold-500 to-transparent" aria-hidden="true" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-hive-700">
            キャスト採用・新規集客・SNSとショート動画・イベント・法人の貸切営業・口コミ返信。バー、スナック、キャバクラ、ラウンジの「やらなきゃ」を、メニューから選ぶだけで頼めます。
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {([["nametag", "キャストを採用する"], ["neon", "新規のお客さまを呼ぶ"], ["champagne", "イベントで売上をつくる"]] as const).map(([n, t]) => (
              <div key={n} className="rounded-2xl border border-gold-200 bg-ink-800/80 p-3 text-center">
                <Illust name={n} className="mx-auto h-14 w-14" />
                <div className="mt-1 text-[11px] font-bold text-hive-800">{t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative hidden items-end gap-3 md:flex">
          <BeeLogo className="h-24 w-24 animate-bee-float" />
          <div className="mb-4 rounded-2xl border border-gold-300 bg-ink-800 px-4 py-2.5 text-sm font-bold text-hive-900">おはようございます！</div>
        </div>
      </div>

      {/* 右: 出勤（ログイン） */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-gold-200 bg-white p-8 shadow-sm">
          <p className="font-latin text-xs text-gold-500">SIGN IN</p>
          <h1 className="mt-1 text-2xl text-hive-900">ログイン</h1>
          <p className="page-sub mb-6">お店のアカウントでお入りください。</p>
          <label className="mb-4 block">
            <span className="text-sm font-bold text-hive-900">メールアドレス</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-cream-50 px-3 py-2.5 text-sm text-hive-900 focus:border-gold-500 focus:outline-none"
            />
          </label>
          <label className="mb-6 block">
            <span className="text-sm font-bold text-hive-900">パスワード</span>
            <span className="relative mt-1 block">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-cream-50 px-3 py-2.5 pr-16 text-sm text-hive-900 focus:border-gold-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-xs font-bold text-hive-500 hover:text-hive-900"
              >
                {showPw ? "隠す" : "表示"}
              </button>
            </span>
          </label>
          {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
          <button className="w-full rounded-full bg-night-500 py-3 text-sm font-bold tracking-widest text-white hover:bg-night-600">
            出勤する
          </button>
          <p className="mt-6 text-center text-xs text-hive-500">
            アカウントの発行はご契約時にご案内します
          </p>
        </form>
      </div>
    </div>
  );
}
