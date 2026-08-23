import { NextRequest, NextResponse } from "next/server";
import { createPayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { PLANS, calculatePrice, formatPrice, calculateProfit } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { updateAudit, getAudit } from "@/lib/store";
import { markAuditPaidInDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auditId, planType, referralCode } = body;

    if (!auditId || !planType) {
      return NextResponse.json({ error: "Missing auditId or planType" }, { status: 400 });
    }

    const plan = PLANS[planType];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Validate referral code
    let discountPct = 0;
    let referralCodeId: string | null = null;

    if (referralCode) {
      try {
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
      } catch {
        // DB might be down, continue without referral
      }
    }

    const finalPriceCents = calculatePrice(plan.basePriceCents, discountPct);

    // Demo mode if PayPal not configured
    if (!isPayPalConfigured()) {
      updateAudit(auditId, { paidReport: true, planType });
      await markAuditPaidInDb(auditId, planType);

      // Try to record payment (DB might be down)
      try {
        await prisma.payment.create({
          data: {
            auditId,
            planType,
            basePriceCents: plan.basePriceCents,
            discountPct,
            finalPriceCents,
            status: "completed",
            referralCodeId,
          },
        });
      } catch {
        // Payment recording is best-effort
      }

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
        referralCodeId: referralCodeId || "",
      },
    });

    // Record pending payment (best-effort)
    try {
      await prisma.payment.create({
        data: {
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
    } catch {
      // Payment recording is best-effort
    }

    return NextResponse.json({
      orderId,
      approveUrl,
      price: formatPrice(finalPriceCents),
      discount: discountPct > 0 ? `${discountPct}% off with code` : null,
    });
  } catch (error: any) {
    console.error("PayPal create order error:", error);
    return NextResponse.json({ error: error.message || "Failed to create payment" }, { status: 500 });
  }
}
