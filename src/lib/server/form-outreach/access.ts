// フォーム営業 API 共通: ログイン・所有者チェック
import { requireUser, type SessionUser } from "../auth";
import { getDb } from "../db";
import { ensureFormTables, type Campaign } from "./schema";

export async function requireFormUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "freelancer") throw new Error("forbidden");
  ensureFormTables();
  return user;
}

/** 自分のキャンペーンだけ（管理者は全部） */
export function ownedCampaign(user: SessionUser, id: string): Campaign | null {
  const c = getDb().prepare("SELECT * FROM form_campaigns WHERE id=?").get(id) as Campaign | undefined;
  if (!c) return null;
  if (user.role !== "admin" && c.user_id !== user.id) return null;
  return c;
}

export const s = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);
export const n = (v: unknown, fb: number) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fb;
};
