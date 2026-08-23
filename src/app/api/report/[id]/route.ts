import { NextRequest, NextResponse } from "next/server";
import { getAudit } from "@/lib/store";
import { loadAuditFromDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try in-memory first
  let audit = getAudit(id);

  // Fall back to database
  if (!audit) {
    const dbAudit = await loadAuditFromDb(id);
    if (dbAudit) {
      audit = {
        id: dbAudit.id,
        url: dbAudit.website?.url || "",
        domain: dbAudit.website?.domain || "",
        status: dbAudit.status,
        result: dbAudit.issues || null,
        error: dbAudit.errorMessage || undefined,
        paidReport: dbAudit.paidReport,
        planType: (dbAudit as any).report?.type?.toLowerCase().replace(/_/g, "_") || null,
        createdAt: dbAudit.createdAt.getTime(),
      };
    }
  }

  if (!audit) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (audit.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Audit not yet complete", status: audit.status },
      { status: 202 }
    );
  }

  return NextResponse.json({
    id: audit.id,
    url: audit.url,
    domain: audit.domain,
    result: audit.result,
    paid: audit.paidReport || false,
    planType: audit.planType || null,
    createdAt: audit.createdAt,
  });
}
