import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emptyResponse = {
    overview: {
      totalUsers: 0, totalAudits: 0, completedAudits: 0, failedAudits: 0,
      paidTransactions: 0, conversionRate: 0,
    },
    revenue: {
      totalRevenueCents: 0, totalBaseRevenueCents: 0, totalDiscountGivenCents: 0,
      avgOrderValue: 0, netProfit: 0, totalCosts: 0, processingFees: 0, infraCosts: 0,
    },
    byPlan: {} as Record<string, { count: number; revenue: number }>,
    byDay: {} as Record<string, number>,
    referralCodes: [] as Array<{ code: string; discountPct: number; usesCount: number; isActive: boolean }>,
    referralStats: { totalReferralPayments: 0, referralRevenue: 0 },
    recentPayments: [] as Array<{ id: string; planType: string; finalPriceCents: number; basePriceCents: number; discountPct: number; status: string; createdAt: number }>,
  };

  try {
    // User stats
    const totalUsers = await prisma.user.count({
      where: { email: { not: { contains: "placeholder.local" } } },
    });

    // Audit stats
    const totalAudits = await prisma.audit.count();
    const completedAudits = await prisma.audit.count({ where: { status: "COMPLETED" } });
    const failedAudits = await prisma.audit.count({ where: { status: "FAILED" } });

    // Payment stats
    const completedPayments = await prisma.payment.findMany({
      where: { status: "completed" },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenueCents = completedPayments.reduce((sum, p) => sum + p.finalPriceCents, 0);
    const totalBaseRevenueCents = completedPayments.reduce((sum, p) => sum + p.basePriceCents, 0);
    const totalDiscountGivenCents = totalBaseRevenueCents - totalRevenueCents;

    // Estimate costs — PayPal charges ~2.9% + $0.30
    const processingFees = completedPayments.reduce((sum, p) => sum + Math.floor(p.finalPriceCents * 0.029) + 30, 0);
    const infraCosts = completedAudits * 30; // ~$0.30 per scan
    const totalCosts = processingFees + infraCosts;
    const netProfit = totalRevenueCents - totalCosts;

    // Revenue by plan
    const revenueByPlan: Record<string, { count: number; revenue: number }> = {};
    for (const p of completedPayments) {
      if (!revenueByPlan[p.planType]) {
        revenueByPlan[p.planType] = { count: 0, revenue: 0 };
      }
      revenueByPlan[p.planType].count++;
      revenueByPlan[p.planType].revenue += p.finalPriceCents;
    }

    // Revenue by day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPayments = completedPayments.filter((p) => p.createdAt >= thirtyDaysAgo);
    const revenueByDay: Record<string, number> = {};
    for (const p of recentPayments) {
      const day = p.createdAt.toISOString().split("T")[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + p.finalPriceCents;
    }

    // Referral stats
    const referralCodes = await prisma.referralCode.findMany({
      orderBy: { usesCount: "desc" },
    });
    const referralPayments = completedPayments.filter((p) => p.referralCodeId);
    const referralRevenue = referralPayments.reduce((sum, p) => sum + p.finalPriceCents, 0);

    // Conversion rate
    const paidUsers = new Set(completedPayments.map((p) => p.userId)).size;
    const conversionRate = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0;

    // Average order value
    const avgOrderValue = completedPayments.length > 0
      ? Math.round(totalRevenueCents / completedPayments.length)
      : 0;

    return NextResponse.json({
      overview: {
        totalUsers,
        totalAudits,
        completedAudits,
        failedAudits,
        paidTransactions: completedPayments.length,
        conversionRate,
      },
      revenue: {
        totalRevenueCents,
        totalBaseRevenueCents,
        totalDiscountGivenCents,
        avgOrderValue,
        netProfit,
        totalCosts,
        processingFees,
        infraCosts,
      },
      byPlan: revenueByPlan,
      byDay: revenueByDay,
      referralCodes: referralCodes.map((r) => ({
        code: r.code,
        discountPct: r.discountPct,
        usesCount: r.usesCount,
        isActive: r.isActive,
      })),
      referralStats: {
        totalReferralPayments: referralPayments.length,
        referralRevenue,
      },
      recentPayments: completedPayments.slice(0, 20).map((p) => ({
        id: p.id,
        planType: p.planType,
        finalPriceCents: p.finalPriceCents,
        basePriceCents: p.basePriceCents,
        discountPct: p.discountPct,
        status: p.status,
        createdAt: p.createdAt.getTime(),
      })),
    });
  } catch (error: any) {
    console.warn("Admin revenue API: DB unreachable, returning empty data:", error.message?.slice(0, 80));
    return NextResponse.json(emptyResponse);
  }
}
