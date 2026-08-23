import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { updateAudit } from "@/lib/store";
import { markAuditPaidInDb } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // If PayPal not configured, this shouldn't be called
    if (!isPayPalConfigured()) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 400 });
    }

    // Capture the payment
    const result = await capturePayPalOrder(orderId);

    if (result.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Payment not completed: ${result.status}` },
        { status: 400 }
      );
    }

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: { paypalOrderId: orderId },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "completed" },
    });

    // Unlock the report
    if (!payment.auditId) {
      return NextResponse.json({ error: "Payment has no linked audit" }, { status: 400 });
    }

    updateAudit(payment.auditId, {
      paidReport: true,
      planType: payment.planType,
    });
    await markAuditPaidInDb(payment.auditId, payment.planType);

    console.log(
      `PayPal payment confirmed: ${orderId}, audit: ${payment.auditId}, plan: ${payment.planType}`
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";
    return NextResponse.json({
      success: true,
      redirectUrl: `${appUrl}/report/${payment.auditId}?paid=1&plan=${payment.planType}`,
    });
  } catch (error: any) {
    console.error("PayPal capture error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to capture payment" },
      { status: 500 }
    );
  }
}
