import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb } from "./db";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  points: number;
};

const COOKIE = "cw_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 14;

export async function createSession(userId: string) {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    Date.now() + TTL_MS
  );
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: TTL_MS / 1000 });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
    store.delete(COOKIE);
  }
}

export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token) as
    | { user_id: string; expires_at: number }
    | undefined;
  if (!session || session.expires_at < Date.now()) return null;
  const user = db
    .prepare("SELECT id, email, name, role, points FROM users WHERE id = ?")
    .get(session.user_id) as SessionUser | undefined;
  return user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  return user;
}
