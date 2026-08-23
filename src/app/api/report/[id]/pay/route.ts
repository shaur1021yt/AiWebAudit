import { NextRequest, NextResponse } from "next/server";
import { updateAudit, getAudit } from "@/lib/store";
import { markAuditPaidInDb } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { planType } = await _request.json().catch(() => ({ planType: "full_audit" }));

  const audit = getAudit(id);
  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  // Update in-memory store
  updateAudit(id, { paidReport: true, planType: planType || "full_audit" });

  // Persist to database
  await markAuditPaidInDb(id, planType || "full_audit");

  return NextResponse.json({ success: true, planType: planType || "full_audit" });
}
