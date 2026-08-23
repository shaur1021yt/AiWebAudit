// Pricing configuration with inflated base prices.
// Referral codes give discounts that still leave 20-35% profit.

export interface PlanConfig {
  id: string;
  name: string;
  basePriceCents: number;     // Display/inflated price (what they see)
  displayPrice: string;        // "$29.99"
  features: string[];
}

export const PLANS: Record<string, PlanConfig> = {
  full_audit: {
    id: "full_audit",
    name: "Full Audit",
    basePriceCents: 2999,      // $29.99 base
    displayPrice: "$29.99",
    features: [
      "All detected issues",
      "Severity ratings",
      "Step-by-step fix instructions",
      "Priority recommendations",
      "PDF download",
    ],
  },
  ai_improvement_plan: {
    id: "ai_improvement_plan",
    name: "AI Improvement Plan",
    basePriceCents: 4999,      // $49.99 base
    displayPrice: "$49.99",
    features: [
      "Everything in Full Audit",
      "AI-generated improvement plan",
      "Today / This Week / This Month timeline",
      "Implementation-ready code snippets",
      "Priority matrix",
    ],
  },
  pro_audit: {
    id: "pro_audit",
    name: "Pro Audit",
    basePriceCents: 9999,      // $99.99 base
    displayPrice: "$99.99",
    features: [
      "Everything in AI Plan",
      "Deep link analysis",
      "Content improvement suggestions",
      "Technical SEO blueprint",
      "Page-by-page breakdown",
      "Shareable report link",
    ],
  },
};

// Default referral discount — 25% off
export const DEFAULT_REFERRAL_DISCOUNT = 25;

/**
 * Calculate the final price after referral discount.
 * Returns cents.
 */
export function calculatePrice(basePriceCents: number, discountPct: number): number {
  const discount = Math.floor(basePriceCents * (discountPct / 100));
  return basePriceCents - discount;
}

/**
 * Format cents to display string.
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Calculate your profit per sale.
 * PayPal charges ~2.9% + $0.30 per transaction.
 * Plus ~$0.30 for compute/storage.
 */
export function calculateProfit(finalPriceCents: number): number {
  const paypalFee = Math.floor(finalPriceCents * 0.029) + 30; // 2.9% + $0.30
  const infraCost = 30;        // ~$0.30 compute/storage
  return finalPriceCents - paypalFee - infraCost;
}
