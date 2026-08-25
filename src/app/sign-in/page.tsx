"use client";

import { useState } from "react";
import BeeLogo from "@/components/BeeLogo";

export default function SignInPage() {
  const [email, setEmail] = useState("client@example.com");
  const [password, setPassword] = useState("demo1234");
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
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <BeeLogo className="h-14 w-14" />
          <span className="text-2xl font-bold tracking-tight text-hive-900">BRIDGE HATCH</span>
        </div>
        <label className="block mb-4">
          <span className="text-sm font-semibold">メールアドレス</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-honey-500 focus:outline-none"
          />
        </label>
        <label className="block mb-6">
          <span className="text-sm font-semibold">パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-honey-500 focus:outline-none"
          />
        </label>
        {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
        <button className="w-full rounded-lg bg-honey-400 py-2.5 text-sm font-medium text-hive-900 hover:bg-honey-300">
          ログイン
        </button>
        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          デモアカウント（パスワードはすべて demo1234）
          <ul className="mt-1 space-y-0.5">
            <li>client@example.com（発注者）</li>
            <li>creator@example.com（フリーランス）</li>
            <li>admin@example.com（管理者）</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
