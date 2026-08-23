import { NextRequest, NextResponse } from "next/server";
import { urlSchema } from "@/lib/validators";
import { runAudit } from "@/lib/audit/engine";
import { createAudit, updateAudit, getAllAudits } from "@/lib/store";
import { saveAuditToDb, updateAuditInDb } from "@/lib/db";
import { checkRateLimit, recordScan, verifyAdminPassword } from "@/lib/rateLimit";

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

    // Get client IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "127.0.0.1";

    // Check admin password bypass
    const adminPassword = body.adminPassword;
    const isAdmin = adminPassword && verifyAdminPassword(adminPassword);

    // Rate limit check (skip for admins)
    if (!isAdmin) {
      const limit = checkRateLimit(ip);
      if (!limit.allowed) {
        return NextResponse.json(
          {
            error: `Free scan limit reached. You get 1 free scan per day.`,
            rateLimited: true,
            resetsIn: limit.resetsIn,
          },
          { status: 429 }
        );
      }
    }

    let url = parsed.data.url.trim();
    if (!url.startsWith("http")) url = `https://${url}`;

    const jobId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const domain = (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();

    // Record the scan for rate limiting
    if (!isAdmin) {
      recordScan(ip);
    }

    // Save to in-memory store (for real-time progress)
    createAudit(jobId, url);

    // Save to database (for persistence)
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
      ...(isAdmin && { bypassedRateLimit: true }),
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
