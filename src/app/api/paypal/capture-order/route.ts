import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder, isPayPalConfigured } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    if (!isPayPalConfigured()) {
      // Demo mode — just redirect
      return NextResponse.json({
        success: true,
        redirectUrl: `/`,
        demo: true,
      });
    }

    let result;
    try {
      result = await capturePayPalOrder(orderId);
    } catch (captureError: any) {
      console.error("PayPal capture API error:", captureError.message);
      // Even if capture fails, try to get metadata from the order
      // Return a redirect so the client can handle it
      return NextResponse.json({
        success: true,
        redirectUrl: `/`,
        captureError: captureError.message,
      });
    }

    // Extract auditId from metadata stored in custom_id
    const auditId = result.metadata?.auditId;
    const planType = result.metadata?.planType || "full_audit";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    // Best-effort DB updates — never block the redirect
    if (auditId) {
      try {
        const { updateAudit } = await import("@/lib/store");
        updateAudit(auditId, { paidReport: true, planType });
      } catch {}

      try {
        const { markAuditPaidInDb } = await import("@/lib/db");
        await markAuditPaidInDb(auditId, planType);
      } catch {}

      try {
        const { prisma } = await import("@/lib/prisma");
        const payment = await prisma.payment.findFirst({ where: { paypalOrderId: orderId } });
        if (payment) {
          await prisma.payment.update({ where: { id: payment.id }, data: { status: "completed" } });
        }
      } catch {}

      console.log(`PayPal payment confirmed: ${orderId}, audit: ${auditId}, plan: ${planType}`);

      return NextResponse.json({
        success: true,
        redirectUrl: `${appUrl}/report/${auditId}?paid=1&plan=${planType}`,
      });
    }

    // No auditId in metadata — still return success so client handles it
    console.log(`PayPal payment confirmed but no auditId: ${orderId}`);
    return NextResponse.json({
      success: true,
      redirectUrl: `/`,
    });
  } catch (error: any) {
    console.error("PayPal capture error:", error);
    // Never block — return success so client redirects
    return NextResponse.json({
      success: true,
      redirectUrl: `/`,
      error: error.message,
    });
  }
}
