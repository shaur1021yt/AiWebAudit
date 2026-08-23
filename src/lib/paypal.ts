// PayPal REST API v2 client — no SDK dependency, just fetch.
// Uses OAuth2 client_credentials flow to get access tokens.

const PAYPAL_BASE = "https://api-m.paypal.com";
const PAYPAL_SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

function getBase(): string {
  const env = process.env.PAYPAL_ENV || "sandbox";
  return env === "live" ? PAYPAL_BASE : PAYPAL_SANDBOX_BASE;
}

let _token: { value: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt) return _token.value;

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const res = await fetch(`${getBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal token error: ${err}`);
  }

  const data = await res.json();
  _token = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh 1 min early
  };
  return _token.value;
}

/**
 * Create a PayPal order.
 * Returns { id, approveUrl }
 */
export async function createPayPalOrder(params: {
  amountCents: number;
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string; approveUrl: string }> {
  const token = await getPayPalAccessToken();
  const currency = params.currency || "USD";
  const amount = (params.amountCents / 100).toFixed(2);

  const res = await fetch(`${getBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: params.description,
          amount: {
            currency_code: currency,
            value: amount,
          },
          ...(params.metadata ? { custom_id: JSON.stringify(params.metadata) } : {}),
        },
      ],
      application_context: {
        brand_name: "SiteAudit AI",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal order creation failed: ${err}`);
  }

  const order = await res.json();
  const approveLink = order.links?.find((l: any) => l.rel === "approve");
  return { id: order.id, approveUrl: approveLink?.href || "" };
}

/**
 * Capture (confirm) a PayPal order after user approves.
 * Returns the captured payment details.
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  status: string;
  payerEmail: string | null;
  grossAmount: string;
  currency: string;
  metadata?: Record<string, string>;
}> {
  const token = await getPayPalAccessToken();

  const res = await fetch(`${getBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture failed: ${err}`);
  }

  const data = await res.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  // Extract metadata from custom_id
  let metadata: Record<string, string> | undefined;
  try {
    const customId = data.purchase_units?.[0]?.custom_id;
    if (customId) metadata = JSON.parse(customId);
  } catch {}

  return {
    status: data.status,
    payerEmail: data.payer?.email_address || null,
    grossAmount: capture?.amount?.value || "0",
    currency: capture?.amount?.currency_code || "USD",
    metadata,
  };
}

/**
 * Verify a PayPal webhook signature.
 */
export async function verifyPayPalWebhook(params: {
  headers: Record<string, string>;
  body: string;
  webhookId: string;
}): Promise<boolean> {
  const token = await getPayPalAccessToken();

  const res = await fetch(`${getBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: params.headers["paypal-auth-algo"],
      cert_url: params.headers["paypal-cert-url"],
      encoding: params.headers["paypal-encoding"],
      ewp: params.headers["paypal-ewp"],
      signature: params.headers["paypal-transmission-sig"],
      timestamp: params.headers["paypal-transmission-time"],
      webhook_event: JSON.parse(params.body),
      webhook_id: params.webhookId,
    }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

export function isPayPalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}
