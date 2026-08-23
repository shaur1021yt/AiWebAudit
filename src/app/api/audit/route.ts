import { NextRequest, NextResponse } from "next/server";
import { urlSchema } from "@/lib/validators";
import { runAudit } from "@/lib/audit/engine";
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

    // Save to database (for persistence across serverless instances)
    await saveAuditToDb({ id: jobId, url, domain });

    // Run audit in background (non-blocking)
    runAudit(url, (progress) => {
      updateAudit(jobId, { status: "SCANNING", progress });
    })
      .then(async (result) => {
        updateAudit(jobId, { status: "COMPLETED", result, progress: undefined });
        await updateAuditInDb(jobId, { status: "COMPLETED", result });
      })
      .catch(async (error) => {
        updateAudit(jobId, { status: "FAILED", error: error.message || "Unknown error", progress: undefined });
        await updateAuditInDb(jobId, { status: "FAILED", errorMessage: error.message });
      });

    return NextResponse.json({
      jobId,
      status: "QUEUED",
      message: "Audit started successfully",
    });
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
