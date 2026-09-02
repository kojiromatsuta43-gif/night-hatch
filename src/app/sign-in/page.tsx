"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";
import BeeLogo from "@/components/BeeLogo";

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
    <div className="flex min-h-screen items-center justify-center bg-honey-50">
      <form onSubmit={submit} className="w-full max-w-sm border-[3px] border-hive-900 bg-white p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <BeeLogo className="h-14 w-14" />
          <span className="text-2xl font-bold tracking-tight text-hive-900">{BRAND.name}</span>
          <span className="text-xs text-slate-500">{BRAND.tagline}</span>
        </div>
        <label className="block mb-4">
          <span className="text-sm font-semibold">メールアドレス</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-honey-500 focus:outline-none"
          />
        </label>
        <label className="block mb-6">
          <span className="text-sm font-semibold">パスワード</span>
          <span className="relative mt-1 block">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm focus:border-honey-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-xs font-bold text-slate-400 hover:text-hive-900"
            >
              {showPw ? "隠す" : "表示"}
            </button>
          </span>
        </label>
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
        <button className="w-full rounded-lg bg-honey-400 py-2.5 text-sm font-medium text-hive-900 hover:bg-honey-300">
          ログイン
        </button>
        <p className="mt-6 text-center text-xs text-slate-400">
          アカウントの発行はご契約時にご案内します
        </p>
      </form>
    </div>
  );
}
