import { requireUser } from "@/lib/server/auth";
import { listLeads, leadsToCsv } from "@/lib/server/sales";

/** いまの絞り込み条件のまま CSV で書き出す（最大5,000件） */
export async function GET(req: Request) {
  const user = await requireUser();
  const u = new URL(req.url);
  const g = (k: string) => u.searchParams.get(k) || undefined;
  const num = (k: string) => (u.searchParams.get(k) ? Number(u.searchParams.get(k)) : undefined);
  const { items } = listLeads(user, {
    q: g("q"),
    prefecture: g("pref"),
    industry: g("industry"),
    status: g("status"),
    projectId: g("project"),
    empMin: num("empMin"),
    empMax: num("empMax"),
    page: 1,
    perPage: 5000,
  });
  return new Response(leadsToCsv(items), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
