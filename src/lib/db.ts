import { prisma } from "@/lib/prisma";

/**
 * Save a new audit to the database.
 */
export async function saveAuditToDb(data: {
  id: string;
  url: string;
  domain: string;
  userId?: string;
}) {
  try {
    const userId = data.userId || `anon-${data.id.slice(0, 16)}`;

    // Ensure user exists
    let user;
    try {
      user = await prisma.user.upsert({
        where: { email: `${userId}@siteaudit.local` },
        update: {},
        create: { email: `${userId}@siteaudit.local`, password: "anon" },
      });
    } catch {
      // If user creation fails (e.g. DB down), skip DB entirely
      console.log("Skipping DB save — user creation failed");
      return null;
    }

    const website = await prisma.website.upsert({
      where: { userId_url: { userId: user.id, url: data.url } },
      update: {},
      create: { url: data.url, domain: data.domain, userId: user.id },
    });

    const audit = await prisma.audit.create({
      data: { id: data.id, websiteId: website.id, userId: user.id, status: "QUEUED" },
    });

    return audit;
  } catch (error: any) {
    console.error("Failed to save audit to DB:", error.message);
    return null;
  }
}

/**
 * Update audit status and results in the database.
 */
export async function updateAuditInDb(
  id: string,
  data: {
    status?: string;
    result?: any;
    errorMessage?: string;
  }
) {
  try {
    const updateData: any = {};

    if (data.status) {
      updateData.status = data.status;
    }

    if (data.result) {
      const r = data.result;
      updateData.overallScore = r.overallScore;
      updateData.seoScore = r.seo?.score;
      updateData.performanceScore = r.performance?.score;
      updateData.accessibilityScore = r.accessibility?.score;
      updateData.mobileScore = r.mobile?.score;
      updateData.securityScore = r.security?.score;
      updateData.contentScore = r.content?.score;
      updateData.conversionScore = r.conversion?.score;
      updateData.issues = r;
      updateData.pagesCrawled = r.pagesCrawled;
      updateData.linksChecked = r.linksChecked;
      updateData.duration = r.duration;
      updateData.metadata = r.metadata;
    }

    if (data.errorMessage) {
      updateData.errorMessage = data.errorMessage;
    }

    await prisma.audit.update({
      where: { id },
      data: updateData,
    });
  } catch (error: any) {
    console.error("Failed to update audit in DB:", error.message);
  }
}

/**
 * Mark an audit as paid in the database.
 */
export async function markAuditPaidInDb(auditId: string, planType: string) {
  try {
    const audit = await prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) return;

    await prisma.audit.update({
      where: { id: auditId },
      data: { paidReport: true },
    });

    // Create a report record
    const reportType =
      planType === "pro_audit" ? "PRO_AUDIT" :
      planType === "ai_improvement_plan" ? "AI_IMPROVEMENT_PLAN" :
      "FULL_AUDIT";

    await prisma.report.create({
      data: {
        auditId,
        userId: audit.userId,
        type: reportType as any,
      },
    });
  } catch (error: any) {
    console.error("Failed to mark audit as paid in DB:", error.message);
  }
}

/**
 * Get audits for a specific user from the database.
 */
export async function getUserAuditsFromDb(userId: string, limit = 50) {
  try {
    const audits = await prisma.audit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { website: true, report: true },
    });
    return audits;
  } catch (error: any) {
    console.error("Failed to load user audits from DB:", error.message);
    return [];
  }
}

/**
 * Load audit from database.
 */
export async function loadAuditFromDb(id: string) {
  try {
    const audit = await prisma.audit.findUnique({
      where: { id },
      include: { report: true, website: true },
    });
    return audit;
  } catch (error: any) {
    console.error("Failed to load audit from DB:", error.message);
    return null;
  }
}

/**
 * Get all audits from the database (for admin).
 */
export async function getAllAuditsFromDb(limit = 50) {
  try {
    const audits = await prisma.audit.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { website: true },
    });
    return audits;
  } catch (error: any) {
    console.error("Failed to load audits from DB:", error.message);
    return [];
  }
}

/**
 * Get admin stats from the database.
 */
export async function getAdminStatsFromDb() {
  try {
    const totalUsers = await prisma.user.count({
      where: { email: { not: { contains: "placeholder.local" } } },
    });
    const totalAudits = await prisma.audit.count();
    const completedAudits = await prisma.audit.count({ where: { status: "COMPLETED" } });
    const failedAudits = await prisma.audit.count({ where: { status: "FAILED" } });
    const paidAudits = await prisma.audit.count({ where: { paidReport: true } });
    const totalSubscriptions = await prisma.subscription.count();

    const avgScoreResult = await prisma.audit.aggregate({
      where: { status: "COMPLETED", overallScore: { not: null } },
      _avg: { overallScore: true },
    });

    return {
      totalUsers,
      totalAudits,
      completedAudits,
      failedAudits,
      paidCount: paidAudits,
      avgScore: Math.round(avgScoreResult._avg.overallScore || 0),
      totalSubscriptions,
    };
  } catch (error: any) {
    console.error("Failed to load admin stats from DB:", error.message);
    return {
      totalUsers: 0,
      totalAudits: 0,
      completedAudits: 0,
      failedAudits: 0,
      paidCount: 0,
      avgScore: 0,
      totalSubscriptions: 0,
    };
  }
}
