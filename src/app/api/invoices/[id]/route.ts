import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { summarize, InvoiceItem, Rounding } from "@/lib/invoice";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const db = getDb();
  const invoice = db.prepare("SELECT * FROM invoices WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!invoice) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
  const items = db
    .prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order")
    .all(id);
  return NextResponse.json({ ...invoice, items });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const b = await req.json();
  const db = getDb();

  const owned = db.prepare("SELECT id FROM invoices WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!owned) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });

  // ステータスだけの更新（一覧のプルダウン）
  if (Object.keys(b).length === 1 && typeof b.status === "string") {
    db.prepare("UPDATE invoices SET status = ? WHERE id = ? AND user_id = ?").run(b.status, id, user.id);
    return NextResponse.json({ ok: true });
  }

  const items: InvoiceItem[] = Array.isArray(b.items) ? b.items : [];
  const profile = db.prepare("SELECT rounding FROM issuer_profiles WHERE user_id = ?").get(user.id) as
    | { rounding: Rounding }
    | undefined;
  const { subtotal, taxTotal, total } = summarize(items, profile?.rounding ?? "切り捨て");

  db.transaction(() => {
    db.prepare(
      `UPDATE invoices SET
         partner_id=?, title=?, amount=?, status=?, issued_on=?, due_on=?,
         invoice_no=?, partner_name=?, partner_address=?, subtotal=?, tax_total=?, note=?, project_id=?
       WHERE id=? AND user_id=?`
    ).run(
      b.partner_id ?? null, b.title ?? "", total, b.status ?? "下書き",
      b.issued_on, b.due_on ?? null, b.invoice_no ?? "", b.partner_name ?? "",
      b.partner_address ?? "", subtotal, taxTotal, b.note ?? "", b.project_id ?? null,
      id, user.id
    );
    db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(id);
    const ins = db.prepare(
      `INSERT INTO invoice_items
        (id, invoice_id, sort_order, name, delivered_on, quantity, unit, unit_price, tax_rate, reduced, note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    );
    items.forEach((it, i) => {
      ins.run(
        crypto.randomUUID(), id, i, it.name ?? "", it.delivered_on ?? "",
        Number(it.quantity) || 0, it.unit ?? "式", Number(it.unit_price) || 0,
        Number(it.tax_rate) ?? 10, it.reduced ? 1 : 0, it.note ?? ""
      );
    });
  })();

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(id);
    db.prepare("DELETE FROM invoices WHERE id = ? AND user_id = ?").run(id, user.id);
  })();
  return NextResponse.json({ ok: true });
}
