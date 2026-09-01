import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { bulkLeads } from "@/lib/server/sales";

/** まとめて: 案件に紐付け / 状態変更 / 削除 */
export async function POST(req: Request) {
  const user = await requireUser();
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String) : [];
  const type = String(b?.type ?? "");
  try {
    let changed = 0;
    if (type === "assign") changed = bulkLeads(user, ids, { type: "assign", projectId: b?.projectId ? String(b.projectId) : null });
    else if (type === "status") changed = bulkLeads(user, ids, { type: "status", status: String(b?.status ?? "") });
    else if (type === "delete") changed = bulkLeads(user, ids, { type: "delete" });
    else return NextResponse.json({ error: "操作が不正です" }, { status: 400 });
    return NextResponse.json({ changed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "操作できませんでした" }, { status: 400 });
  }
}
