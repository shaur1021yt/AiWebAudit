import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getAudit, updateAudit } from "@/lib/store";
import { markAuditPaidInDb } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { PLANS, calculatePrice, formatPrice, calculateProfit } from "@/lib/pricing";

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
        // Increment use count
        await prisma.referralCode.update({
          where: { id: referral.id },
          data: { usesCount: { increment: 1 } },
        });
      }
    }

    const finalPriceCents = calculatePrice(plan.basePriceCents, discountPct);

    // If no Stripe key, demo mode
    if (!process.env.STRIPE_SECRET_KEY) {
      updateAudit(auditId, { paidReport: true, planType });
      await markAuditPaidInDb(auditId, planType);

      // Record payment
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

    // Real Stripe checkout
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";

    const session2 = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `SiteAudit AI — ${plan.name}`,
              description: discountPct > 0
                ? `Website audit (${discountPct}% referral discount applied)`
                : `Website audit report`,
            },
            unit_amount: finalPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/report/${auditId}?paid=1&plan=${planType}`,
      cancel_url: `${appUrl}/report/${auditId}`,
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
        stripeSessionId: session2.id,
        status: "pending",
        referralCodeId,
      },
    });

    return NextResponse.json({
      url: session2.url,
      price: formatPrice(finalPriceCents),
      discount: discountPct > 0 ? `${discountPct}% off with code` : null,
    });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
