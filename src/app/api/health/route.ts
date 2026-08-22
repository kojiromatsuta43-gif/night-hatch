// Railway のヘルスチェック用。DBには触れず、プロセスが応答可能かだけを返す。
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, ts: new Date().toISOString() });
}
