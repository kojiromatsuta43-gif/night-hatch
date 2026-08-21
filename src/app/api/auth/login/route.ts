import { NextResponse } from "next/server";
import { getDb, verifyPassword } from "@/lib/server/db";
import { createSession } from "@/lib/server/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | { id: string; password: string; role: string }
    | undefined;
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, role: user.role });
}
