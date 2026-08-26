import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { summarize, InvoiceItem, Rounding } from "@/lib/invoice";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(
    getDb()
      .prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY issued_on DESC, created_at DESC")
      .all(user.id)
  );
}

/** 連番: INV-YYYYMM-001 */
function nextInvoiceNo(userId: string, issuedOn: string): string {
  const ym = (issuedOn || new Date().toISOString().slice(0, 10)).slice(0, 7).replace("-", "");
  const prefix = `INV-${ym}-`;
  const row = getDb()
    .prepare("SELECT invoice_no FROM invoices WHERE user_id = ? AND invoice_no LIKE ? ORDER BY invoice_no DESC LIMIT 1")
    .get(userId, `${prefix}%`) as { invoice_no: string } | undefined;
  const n = row ? Number(row.invoice_no.slice(prefix.length)) + 1 : 1;
  return prefix + String(n).padStart(3, "0");
}

export async function POST(req: Request) {
  const user = await requireUser();
  const b = await req.json();
  const db = getDb();
  const id = crypto.randomUUID();
  const issuedOn: string = b.issued_on || new Date().toISOString().slice(0, 10);
  const items: InvoiceItem[] = Array.isArray(b.items) ? b.items : [];

  const profile = db.prepare("SELECT rounding FROM issuer_profiles WHERE user_id = ?").get(user.id) as
    | { rounding: Rounding }
    | undefined;
  const { subtotal, taxTotal, total } = summarize(items, profile?.rounding ?? "切り捨て");

  db.transaction(() => {
    db.prepare(
      `INSERT INTO invoices
        (id, user_id, partner_id, title, amount, status, issued_on, due_on,
         invoice_no, partner_name, partner_address, subtotal, tax_total, note, project_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id, user.id, b.partner_id ?? null, b.title ?? "", total, b.status ?? "下書き",
      issuedOn, b.due_on ?? null, b.invoice_no || nextInvoiceNo(user.id, issuedOn),
      b.partner_name ?? "", b.partner_address ?? "", subtotal, taxTotal, b.note ?? "",
      b.project_id ?? null
    );
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

  return NextResponse.json({ id });
}
