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
    <div className="flex min-h-screen flex-col bg-cream-100 md:flex-row">
      {/* 左: 店先のビジュアル */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-food-600 px-8 py-8 text-cream-50 md:w-[46%] md:px-12 md:py-12">
        <div className="noren-inline flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream-100"><BeeLogo className="h-9 w-9" /></span>
          <span className="font-display text-xl tracking-[0.2em]">{BRAND.name}</span>
        </div>
        <div className="my-10 md:my-0">
          <p className="font-display text-3xl leading-snug md:text-4xl">
            お店の困りごと、<br />ハッチに頼んでください。
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-food-100">
            集客・メニュー・SNS・宴会の営業・採用・口コミ返信。飲食店の「やらなきゃ」を、お品書きから選ぶだけで頼めます。
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {([["noren", "お客さんを呼ぶ"], ["donburi", "メニューを作る"], ["phone", "動画で知ってもらう"]] as const).map(([n, t]) => (
              <div key={n} className="rounded-2xl bg-food-700/60 p-3 text-center">
                <Illust name={n} className="mx-auto h-14 w-14" />
                <div className="mt-1 text-[11px] font-bold text-cream-50">{t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden items-end gap-3 md:flex">
          <BeeLogo className="h-24 w-24 animate-bee-float" />
          <div className="mb-4 rounded-2xl bg-cream-50 px-4 py-2.5 text-sm font-bold text-hive-900">いらっしゃいませ！</div>
        </div>
      </div>

      {/* 右: ログイン */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-food-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl text-hive-900">ログイン</h1>
          <p className="page-sub mb-6">お店のアカウントでお入りください。</p>
          <label className="mb-4 block">
            <span className="text-sm font-bold text-hive-900">メールアドレス</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-food-200 bg-cream-50 px-3 py-2.5 text-sm focus:border-food-500 focus:outline-none"
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
                className="w-full rounded-lg border border-food-200 bg-cream-50 px-3 py-2.5 pr-16 text-sm focus:border-food-500 focus:outline-none"
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
          <button className="w-full rounded-full bg-food-500 py-3 text-sm font-bold text-white hover:bg-food-600">
            お店に入る
          </button>
          <p className="mt-6 text-center text-xs text-hive-500">
            アカウントの発行はご契約時にご案内します
          </p>
        </form>
      </div>
    </div>
  );
}
