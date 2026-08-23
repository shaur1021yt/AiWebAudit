import { NextRequest, NextResponse } from "next/server";
import { getAudit } from "@/lib/store";
import { loadAuditFromDb } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try in-memory first (works on same serverless instance)
  let audit = getAudit(id);

  // Fall back to database (for cross-instance polling on Vercel)
  if (!audit) {
    const dbAudit = await loadAuditFromDb(id);
    if (dbAudit) {
      // Reconstruct the shape the frontend expects
      audit = {
        id: dbAudit.id,
        url: dbAudit.website?.url || "",
        domain: dbAudit.website?.domain || "",
        status: dbAudit.status,
        result: dbAudit.issues || null,
        error: dbAudit.errorMessage || undefined,
        progress: undefined,
        createdAt: dbAudit.createdAt.getTime(),
      };
    }
  }

  if (!audit) {
    return NextResponse.json(
      { error: "Audit not found" },
      { status: 404 }
    );
  }

  if (audit.status === "FAILED") {
    return NextResponse.json({
      id,
      status: "FAILED",
      error: audit.error,
    });
  }

  if (audit.status === "COMPLETED") {
    return NextResponse.json({
      id,
      status: "COMPLETED",
      result: audit.result,
    });
  }

  // Still in progress
  return NextResponse.json({
    id,
    status: audit.status,
    progress: audit.progress || [],
  });
}
