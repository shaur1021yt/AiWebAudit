import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/paypal";
import { updateAudit } from "@/lib/store";
import { markAuditPaidInDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    if (!isPayPalConfigured()) {
      return NextResponse.json({ error: "PayPal not configured" }, { status: 400 });
    }

    const result = await capturePayPalOrder(orderId);

    if (result.status !== "COMPLETED") {
      return NextResponse.json({ error: `Payment not completed: ${result.status}` }, { status: 400 });
    }

    // Find the auditId from metadata (stored in PayPal order metadata)
    const auditId = result.metadata?.auditId;
    const planType = result.metadata?.planType || "full_audit";

    if (!auditId) {
      return NextResponse.json({ error: "No audit ID found in payment" }, { status: 400 });
    }

    // Unlock the report
    updateAudit(auditId, { paidReport: true, planType });
    await markAuditPaidInDb(auditId, planType);

    // Try to update payment record (best-effort)
    try {
      const { prisma } = await import("@/lib/prisma");
      const payment = await prisma.payment.findFirst({ where: { paypalOrderId: orderId } });
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "completed" } });
      }
    } catch {
      // Payment recording is best-effort
    }

    console.log(`PayPal payment confirmed: ${orderId}, audit: ${auditId}, plan: ${planType}`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3456";
    return NextResponse.json({
      success: true,
      redirectUrl: `${appUrl}/report/${auditId}?paid=1&plan=${planType}`,
    });
  } catch (error: any) {
    console.error("PayPal capture error:", error);
    return NextResponse.json({ error: error.message || "Failed to capture payment" }, { status: 500 });
  }
}
