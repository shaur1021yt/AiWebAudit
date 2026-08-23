import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { PLANS, calculatePrice, formatPrice, calculateProfit } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { updateAudit } from "@/lib/store";
import { markAuditPaidInDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Must be logged in to pay
    if (!session?.user) {
      return NextResponse.json(
        { error: "Please sign in to purchase a report", requiresAuth: true },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { auditId, planType, referralCode } = body;
    const userId = (session.user as any).id;

    if (!auditId || !planType) {
      return NextResponse.json(
        { error: "Missing auditId or planType" },
        { status: 400 }
      );
    }

    const plan = PLANS[planType];
    if (!plan) {
      return NextResponse.json(
        { error: "Invalid plan type" },
        { status: 400 }
      );
    }

    // Check if admin — free access
    const isAdmin = (session.user as any).role === "ADMIN";
    if (isAdmin) {
      updateAudit(auditId, { paidReport: true, planType });
      await markAuditPaidInDb(auditId, planType);
      await prisma.payment.create({
        data: {
          userId,
          auditId,
          planType,
          basePriceCents: plan.basePriceCents,
          discountPct: 100,
          finalPriceCents: 0,
          status: "completed",
        },
      });
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";
      return NextResponse.json({
        url: `${appUrl}/report/${auditId}?paid=1&plan=${planType}`,
        admin: true,
      });
    }

    // Validate referral code
    let discountPct = 0;
    let referralCodeId: string | null = null;

    if (referralCode) {
      const referral = await prisma.referralCode.findUnique({
        where: { code: referralCode.toUpperCase().trim() },
      });
      if (referral && referral.isActive) {
        discountPct = referral.discountPct;
        referralCodeId = referral.id;
        await prisma.referralCode.update({
          where: { id: referral.id },
          data: { usesCount: { increment: 1 } },
        });
      }
    }

    const finalPriceCents = calculatePrice(plan.basePriceCents, discountPct);

    // Demo mode if PayPal not configured
    if (!isPayPalConfigured()) {
      updateAudit(auditId, { paidReport: true, planType });
      await markAuditPaidInDb(auditId, planType);

      await prisma.payment.create({
        data: {
          userId,
          auditId,
          planType,
          basePriceCents: plan.basePriceCents,
          discountPct,
          finalPriceCents,
          status: "completed",
          referralCodeId,
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";
      return NextResponse.json({
        url: `${appUrl}/report/${auditId}?paid=1&plan=${planType}`,
        demo: true,
        price: formatPrice(finalPriceCents),
        discount: discountPct > 0 ? `${discountPct}% off with code` : null,
        profit: formatPrice(calculateProfit(finalPriceCents)),
      });
    }

    // Create real PayPal order
    const { id: orderId, approveUrl } = await createPayPalOrder({
      amountCents: finalPriceCents,
      description: `SiteAudit AI — ${plan.name}`,
      metadata: {
        auditId,
        planType,
        userId,
        referralCodeId: referralCodeId || "",
      },
    });

    // Record pending payment
    await prisma.payment.create({
      data: {
        userId,
        auditId,
        planType,
        basePriceCents: plan.basePriceCents,
        discountPct,
        finalPriceCents,
        paypalOrderId: orderId,
        status: "pending",
        referralCodeId,
      },
    });

    return NextResponse.json({
      orderId,
      approveUrl,
      price: formatPrice(finalPriceCents),
      discount: discountPct > 0 ? `${discountPct}% off with code` : null,
    });
  } catch (error: any) {
    console.error("PayPal create order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}
