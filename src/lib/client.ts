"use client";

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 401) {
    window.location.href = "/sign-in";
    throw new Error("unauthorized");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export type Me = { id: string; email: string; name: string; role: string; points: number; plan?: string; hasSales?: boolean };
