import { NextRequest, NextResponse } from "next/server";
import { getAudit } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const audit = getAudit(id);

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
