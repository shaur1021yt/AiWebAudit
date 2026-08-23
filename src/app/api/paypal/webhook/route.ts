import { NextRequest, NextResponse } from "next/server";
import { verifyPayPalWebhook } from "@/lib/paypal";
import { updateAudit } from "@/lib/store";
import { markAuditPaidInDb } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const webhookId = process.env.PAYPAL_WEBHOOK_ID || "";

  // Verify webhook signature if configured
  if (webhookId) {
    const isValid = await verifyPayPalWebhook({ headers, body, webhookId });
    if (!isValid) {
      console.error("PayPal webhook signature invalid");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  try {
    const event = JSON.parse(body);

    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED": {
        // Order approved — capture happens on the frontend via capture-order API
        console.log(`PayPal order approved: ${event.resource?.id}`);
        break;
      }

      case "PAYMENT.CAPTURE.COMPLETED": {
        // Payment captured successfully — this is our confirmation
        const resource = event.resource;
        const customId = resource?.custom_id;

        if (customId) {
          try {
            const meta = JSON.parse(customId);
            const { auditId, planType } = meta;

            if (auditId) {
              // Mark as paid
              updateAudit(auditId, {
                paidReport: true,
                planType: planType || "full_audit",
              });
              await markAuditPaidInDb(auditId, planType || "full_audit");

              // Update payment record
              const orderId = resource?.supplementary_data?.related_ids?.order_id;
              if (orderId) {
                await prisma.payment.updateMany({
                  where: { paypalOrderId: orderId },
                  data: { status: "completed" },
                });
              }

              console.log(
                `PayPal webhook: payment confirmed for audit ${auditId}, plan: ${planType}`
              );
            }
          } catch (e) {
            console.error("Failed to parse PayPal custom_id:", e);
          }
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED": {
        console.log(`PayPal capture event: ${event.event_type}`);
        break;
      }

      default:
        console.log(`Unhandled PayPal event: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
