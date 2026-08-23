"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, Zap, Crown, Tag, ArrowRight } from "lucide-react";
import { PLANS } from "@/lib/pricing";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  full_audit: <Check className="w-5 h-5 text-green-500" />,
  ai_improvement_plan: <Zap className="w-5 h-5 text-amber-500" />,
  pro_audit: <Crown className="w-5 h-5 text-violet-500" />,
};

const PLAN_ORDER = ["full_audit", "ai_improvement_plan", "pro_audit"];

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [referralCode, setReferralCode] = useState("");
  const [referralDiscount, setReferralDiscount] = useState<number | null>(null);
  const [referralError, setReferralError] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);

  const validateCode = async () => {
    if (!referralCode.trim()) return;
    setValidatingCode(true);
    setReferralError("");
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCode }),
      });
      const data = await res.json();
      if (data.valid) {
        setReferralDiscount(data.discountPct);
      } else {
        setReferralDiscount(null);
        setReferralError(data.error || "Invalid code");
      }
    } catch {
      setReferralError("Failed to validate code");
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSelect = (planId: string) => {
    if (!session) {
      router.push("/dashboard");
      return;
    }
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Get a complete website audit with actionable fixes. One-time payment, no subscription.
        </p>
      </div>

      {/* Referral code input */}
      <div className="max-w-md mx-auto mb-12">
        <div className="flex items-center gap-2 p-1 rounded-lg border border-border/50 bg-card">
          <div className="pl-3">
            <Tag className="w-4 h-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => {
              setReferralCode(e.target.value);
              setReferralDiscount(null);
              setReferralError("");
            }}
            placeholder="Have a referral code?"
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <button
            onClick={validateCode}
            disabled={validatingCode || !referralCode.trim()}
            className="text-sm font-medium text-primary px-3 py-2 hover:bg-primary/5 rounded-md transition-colors disabled:opacity-50"
          >
            {validatingCode ? "..." : "Apply"}
          </button>
        </div>
        {referralDiscount && (
          <p className="text-sm text-green-500 mt-2 text-center">
            ✓ {referralDiscount}% discount applied — prices updated below
          </p>
        )}
        {referralError && (
          <p className="text-sm text-red-500 mt-2 text-center">{referralError}</p>
        )}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const discountedCents = referralDiscount
            ? Math.floor(plan.basePriceCents * (1 - referralDiscount / 100))
            : plan.basePriceCents;
          const isPopular = planId === "ai_improvement_plan";

          return (
            <div
              key={planId}
              className={`rounded-xl border p-6 relative ${
                isPopular
                  ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/5"
                  : "border-border/50 bg-card"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-primary text-primary-foreground px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                {PLAN_ICONS[planId]}
                <h3 className="font-semibold">{plan.name}</h3>
              </div>

              <div className="mb-4">
                {referralDiscount ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      ${(discountedCents / 100).toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      ${(plan.basePriceCents / 100).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold">
                    ${(plan.basePriceCents / 100).toFixed(2)}
                  </span>
                )}
                <p className="text-xs text-muted-foreground mt-1">one-time payment</p>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(planId)}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  isPopular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border/50 text-foreground hover:bg-muted"
                }`}
              >
                {session ? "Get Started" : "Sign In to Purchase"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-center mb-8">Common questions</h2>
        <div className="space-y-6">
          {[
            {
              q: "Do I need to create an account?",
              a: "Yes — sign up for free to track your audits and access purchased reports anytime.",
            },
            {
              q: "How do referral codes work?",
              a: "If someone shared a referral code with you, enter it above for an instant discount. You save money, they earn credits.",
            },
            {
              q: "What payment methods do you accept?",
              a: "PayPal — pay with your PayPal balance, debit card, or credit card through PayPal's secure checkout.",
            },
            {
              q: "Can I get a refund?",
              a: "We offer refunds within 24 hours if you're not satisfied with the audit report.",
            },
          ].map((faq, i) => (
            <div key={i}>
              <h3 className="font-medium mb-1">{faq.q}</h3>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
