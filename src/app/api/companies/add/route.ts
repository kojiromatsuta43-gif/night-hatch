import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { addByFilter, addByIds } from "@/lib/server/companydb";
import { filterFrom } from "@/lib/server/company-filter";

/**
 * 営業リストに追加。
 * { ids: number[] } で選んだ会社を、または { filter: "<クエリ文字列>", limit: n } で条件の先頭 n 件を。
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user.role === "freelancer") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  try {
    if (Array.isArray(b?.ids)) return NextResponse.json(await addByIds(user.id, b.ids.map(Number)));
    if (typeof b?.filter === "string") {
      const limit = Number(b?.limit ?? 500);
      const f = filterFrom(new URL(`http://x/?${b.filter}`));
      return NextResponse.json(await addByFilter(user.id, f, Number.isFinite(limit) ? limit : 500));
    }
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "追加に失敗しました" }, { status: 400 });
  }
}
