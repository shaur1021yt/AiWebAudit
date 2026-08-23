import { NextRequest, NextResponse } from "next/server";
import { urlSchema } from "@/lib/validators";
import { runAudit, ScanProgress } from "@/lib/audit/engine";
import { createAudit, updateAudit, getAllAudits } from "@/lib/store";
import { saveAuditToDb, updateAuditInDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = urlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid URL" },
        { status: 400 }
      );
    }

    let url = parsed.data.url.trim();
    if (!url.startsWith("http")) url = `https://${url}`;

    const jobId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const domain = (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();

    // Save to in-memory store (for real-time progress on same instance)
    createAudit(jobId, url);

    // Save to database
    await saveAuditToDb({ id: jobId, url, domain });

    // Run audit synchronously — return result in the response
    // This avoids the background job + polling problem on Vercel serverless
    try {
      const result = await runAudit(url);

      // Store result
      updateAudit(jobId, { status: "COMPLETED", result });
      await updateAuditInDb(jobId, { status: "COMPLETED", result });

      return NextResponse.json({
        jobId,
        status: "COMPLETED",
        result,
      });
    } catch (auditError: any) {
      updateAudit(jobId, { status: "FAILED", error: auditError.message });
      await updateAuditInDb(jobId, { status: "FAILED", errorMessage: auditError.message });

      return NextResponse.json({
        jobId,
        status: "FAILED",
        error: auditError.message || "Audit failed",
      });
    }
  } catch (error) {
    console.error("Audit API error:", error);
    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const audits = getAllAudits().map((a) => ({
    id: a.id,
    url: a.url,
    domain: a.domain,
    status: a.status,
    score: a.result?.overallScore ?? null,
    issueCount: a.result
      ? Object.values(a.result).reduce(
          (sum: number, cat: any) => sum + (cat?.issues?.length || 0),
          0
        )
      : 0,
    duration: a.result?.duration ?? null,
    createdAt: a.createdAt,
  }));

  return NextResponse.json({ audits });
}
