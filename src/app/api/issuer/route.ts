import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

const EMPTY = {
  company_name: "",
  registration_no: "",
  postal_code: "",
  address: "",
  tel: "",
  bank_name: "",
  branch_name: "",
  account_type: "普通",
  account_no: "",
  account_holder: "",
  seal_upload_id: null as string | null,
  rounding: "切り捨て",
};

export async function GET() {
  const user = await requireUser();
  const row = getDb().prepare("SELECT * FROM issuer_profiles WHERE user_id = ?").get(user.id);
  return NextResponse.json(row ?? { user_id: user.id, ...EMPTY });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  const b = await req.json();
  const v = { ...EMPTY, ...b };
  getDb()
    .prepare(
      `INSERT INTO issuer_profiles
        (user_id, company_name, registration_no, postal_code, address, tel,
         bank_name, branch_name, account_type, account_no, account_holder, seal_upload_id, rounding, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         company_name=excluded.company_name, registration_no=excluded.registration_no,
         postal_code=excluded.postal_code, address=excluded.address, tel=excluded.tel,
         bank_name=excluded.bank_name, branch_name=excluded.branch_name,
         account_type=excluded.account_type, account_no=excluded.account_no,
         account_holder=excluded.account_holder, seal_upload_id=excluded.seal_upload_id,
         rounding=excluded.rounding, updated_at=datetime('now')`
    )
    .run(
      user.id, v.company_name, v.registration_no, v.postal_code, v.address, v.tel,
      v.bank_name, v.branch_name, v.account_type, v.account_no, v.account_holder,
      v.seal_upload_id || null, v.rounding
    );
  return NextResponse.json({ ok: true });
}
