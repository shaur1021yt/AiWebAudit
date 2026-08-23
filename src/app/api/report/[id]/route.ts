import { NextRequest, NextResponse } from "next/server";
import { getAudit } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const audit = getAudit(id);

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
