"use client";

import { use, useEffect, useState, useCallback } from "react";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { ScoreGauge } from "@/components/ScoreGauge";
import { CategoryScore } from "@/components/CategoryScore";
import { IssueCard } from "@/components/IssueCard";
import { getCategoryIcon, sortIssuesBySeverity, countIssuesBySeverity } from "@/lib/audit/scorer";
import { ArrowRight, Download, Share2, Lock, Check, Zap, Tag, FileText } from "lucide-react";
import { PLANS } from "@/lib/pricing";
import type { Issue } from "@/lib/audit/types";

interface ReportData {
  id: string;
  url: string;
  domain: string;
  result: any;
  paid: boolean;
  planType: string | null;
  createdAt: number;
}

function PayPalCheckoutButtons({
  auditId,
  planType,
  referralCode,
  onDemoComplete,
}: {
  auditId: string;
  planType: string;
  referralCode: string;
  onDemoComplete: (url: string) => void;
}) {
  const [{ options, isPending }] = usePayPalScriptReducer();

  const createOrder = useCallback(async () => {
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditId, planType, referralCode: referralCode || undefined }),
    });
    const data = await res.json();

    if (data.url) {
      // Demo mode or redirect
      onDemoComplete(data.url);
      return "";
    }
    if (data.error) {
      alert(data.error);
      return "";
    }
    return data.orderId;
  }, [auditId, planType, referralCode, onDemoComplete]);

  const onApprove = useCallback(
    async (data: any) => {
      try {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderID }),
        });
        const result = await res.json();
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else if (result.error) {
          alert("Payment failed: " + result.error);
        }
      } catch {
        alert("Payment confirmation failed. Please try again.");
      }
    },
    []
  );

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading PayPal...
      </div>
    );
  }

  return (
    <PayPalButtons
      style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay", height: 48 }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={(err) => {
        console.error("PayPal error:", err);
        alert("Payment failed. Please try again.");
      }}
    />
  );
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralDiscount, setReferralDiscount] = useState<number | null>(null);
  const [referralError, setReferralError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("full_audit");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const paidParam = urlParams.get("paid");
        const planParam = urlParams.get("plan") || "full_audit";

        if (paidParam === "1") {
          await fetch(`/api/report/${id}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planType: planParam }),
          });
        }

        const res = await fetch(`/api/report/${id}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Report not found");
        }
        const reportData = await res.json();
        setData(reportData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const validateReferral = async () => {
    if (!referralCode.trim()) return;
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCode }),
      });
      const d = await res.json();
      if (d.valid) {
        setReferralDiscount(d.discountPct);
        setReferralError("");
      } else {
        setReferralDiscount(null);
        setReferralError(d.error || "Invalid code");
      }
    } catch {
      setReferralError("Failed to validate");
    }
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handlePDF = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Report not found</h1>
        <p className="text-muted-foreground mb-6">
          {error || "This report may have expired or the link is invalid."}
        </p>
        <a href="/" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
          Run a new audit <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const result = data.result;
  const paid = data.paid;
  const planType = data.planType;

  const allIssues: Issue[] = [
    ...result.seo.issues, ...result.performance.issues, ...result.accessibility.issues,
    ...result.mobile.issues, ...result.security.issues, ...result.content.issues,
    ...result.conversion.issues, ...result.image.issues, ...result.links.issues,
  ];

  const sortedIssues = sortIssuesBySeverity(allIssues);
  const severityCounts = countIssuesBySeverity(sortedIssues);

  const categories = [
    { name: "SEO", key: "seo", score: result.seo.score, issues: result.seo.issues.length },
    { name: "Performance", key: "performance", score: result.performance.score, issues: result.performance.issues.length },
    { name: "Accessibility", key: "accessibility", score: result.accessibility.score, issues: result.accessibility.issues.length },
    { name: "Mobile", key: "mobile", score: result.mobile.score, issues: result.mobile.issues.length },
    { name: "Security", key: "security", score: result.security.score, issues: result.security.issues.length },
    { name: "Content", key: "content", score: result.content.score, issues: result.content.issues.length },
    { name: "Conversion", key: "conversion", score: result.conversion.score, issues: result.conversion.issues.length },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <a href={data.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline underline-offset-2">
              {data.domain}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={() => navigator.clipboard.writeText(window.location.origin + "/report/" + id)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
            <Share2 className="w-4 h-4" /> Share
          </button>
          {paid && (
            <button onClick={handlePDF} className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          )}
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h1 className="text-xl font-bold">SiteAudit AI — Website Audit Report</h1>
        <p className="text-sm text-gray-500">{data.domain} • {data.url}</p>
        <p className="text-xs text-gray-400">Generated {new Date(data.createdAt).toLocaleDateString()}</p>
      </div>

      {paid && planType && PLANS[planType] && (
        <div className="mb-6 flex items-center gap-2 text-sm">
          <span className="text-primary"><Check className="w-4 h-4" /></span>
          <span className="font-medium">{PLANS[planType].name}</span>
        </div>
      )}

      {/* Score */}
      <div className="text-center mb-10">
        <ScoreGauge score={result.overallScore} size={180} />
        <p className="text-sm text-muted-foreground mt-4">
          Analyzed {result.pagesCrawled} page{result.pagesCrawled > 1 ? "s" : ""} in {result.duration}s
        </p>
      </div>

      {/* Categories — blurred if not paid */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Category Scores</h2>
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${!paid ? "blur-[4px] select-none pointer-events-none opacity-50" : ""}`}>
          {categories.map((cat, i) => (
            <CategoryScore key={cat.key} name={cat.name} icon={getCategoryIcon(cat.key)} score={cat.score} issueCount={cat.issues} delay={i * 80} />
          ))}
        </div>
        {!paid && (
          <div className="text-center mt-3">
            <Lock className="w-4 h-4 text-muted-foreground inline mr-1" />
            <span className="text-xs text-muted-foreground">Unlock to see category details</span>
          </div>
        )}
      </div>

      {/* Severity summary */}
      <div className="mb-8 flex flex-wrap gap-3">
        {Object.entries(severityCounts).map(([severity, count]) => (
          count > 0 && (
            <div key={severity} className="text-sm">
              <span className={`font-semibold ${
                severity === "critical" ? "text-red-500" : severity === "high" ? "text-orange-500" :
                severity === "medium" ? "text-yellow-500" : severity === "low" ? "text-blue-500" : "text-muted-foreground"
              }`}>{count}</span>
              <span className="text-muted-foreground ml-1">{severity}</span>
            </div>
          )
        ))}
      </div>

      {/* Issues */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">
          {paid ? `All Issues (${allIssues.length})` : `Top Issue (of ${allIssues.length} total)`}
        </h2>
        <div className="space-y-2">
          {/* Show 1 issue free, rest blurred */}
          {sortedIssues.length > 0 && (
            <IssueCard key={sortedIssues[0].id} issue={sortedIssues[0]} locked={false} index={0} />
          )}
          {!paid && sortedIssues.length > 1 && (
            <div className="relative">
              <div className="blur-[4px] select-none pointer-events-none opacity-50 space-y-2">
                {sortedIssues.slice(1, 6).map((issue) => (
                  <div key={issue.id} className="rounded-lg border border-border/50 bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      <span className="text-sm font-medium">{issue.title}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Lock className="w-6 h-6 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">{sortedIssues.length - 1} issues locked</p>
              </div>
            </div>
          )}
          {/* Show all if paid */}
          {paid && sortedIssues.slice(1).map((issue, i) => (
            <IssueCard key={issue.id} issue={issue} locked={false} index={i + 1} />
          ))}
        </div>
      </div>

      {/* AI Improvement Plan (only for AI Plan and Pro) */}
      {paid && (planType === "ai_improvement_plan" || planType === "pro_audit") && (
        <div className="mb-10 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold">AI Improvement Plan</h2>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-2">Do Today</h3>
              <ul className="space-y-1">
                {sortedIssues.filter(i => i.severity === "critical" || i.severity === "high").slice(0, 5).map(issue => (
                  <li key={issue.id} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">→</span>
                    <span>Fix: {issue.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-2">This Week</h3>
              <ul className="space-y-1">
                {sortedIssues.filter(i => i.severity === "medium").slice(0, 5).map(issue => (
                  <li key={issue.id} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">→</span>
                    <span>Improve: {issue.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-2">This Month</h3>
              <ul className="space-y-1">
                {sortedIssues.filter(i => i.severity === "low" || i.severity === "info").slice(0, 5).map(issue => (
                  <li key={issue.id} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">→</span>
                    <span>Optimize: {issue.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA (if not paid) */}
      {!paid && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center no-print">
          <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Unlock Full Report</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Get all {allIssues.length} issues with detailed explanations, fix instructions, and priority recommendations.
            No account needed — just pay and download.
          </p>

          {/* Referral code */}
          <div className="flex items-center gap-2 max-w-xs mx-auto mb-4">
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={referralCode}
              onChange={(e) => { setReferralCode(e.target.value); setReferralDiscount(null); setReferralError(""); }}
              onBlur={validateReferral}
              placeholder="Referral code (optional)"
              className="flex-1 bg-background border border-border/50 px-3 py-1.5 rounded-lg text-sm outline-none focus:border-primary"
            />
          </div>
          {referralDiscount && (
            <p className="text-sm text-green-500 mb-4">✓ {referralDiscount}% discount applied</p>
          )}
          {referralError && (
            <p className="text-sm text-red-500 mb-4">{referralError}</p>
          )}

          {/* Plan selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-6">
            {(["full_audit", "ai_improvement_plan", "pro_audit"] as const).map((planId) => {
              const plan = PLANS[planId];
              const finalCents = referralDiscount
                ? Math.floor(plan.basePriceCents * (1 - referralDiscount / 100))
                : plan.basePriceCents;
              const isPopular = planId === "ai_improvement_plan";
              const isSelected = selectedPlan === planId;
              return (
                <button
                  key={planId}
                  onClick={() => setSelectedPlan(planId)}
                  className={`rounded-xl border p-5 text-left transition-all relative ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                      : "border-border/50 bg-card hover:border-border"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-2.5 left-4 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      MOST POPULAR
                    </div>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: planId === "full_audit" ? "#16a34a" : planId === "ai_improvement_plan" ? "#d97706" : "#7c3aed" }}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-2 mb-3">
                    <p className="text-2xl font-bold">{formatCents(finalCents)}</p>
                    {referralDiscount && (
                      <p className="text-sm text-muted-foreground line-through">{formatCents(plan.basePriceCents)}</p>
                    )}
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {plan.features.slice(0, 4).map(f => <li key={f}>• {f}</li>)}
                  </ul>
                  <div className="mt-3 text-xs font-medium text-primary">
                    {isSelected ? "✓ Selected" : "Click to select"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* PayPal buttons */}
          <div className="max-w-sm mx-auto">
            <PayPalScriptProvider
              options={{
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "sb",
                currency: "USD",
                intent: "capture",
              }}
            >
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <p className="text-sm font-medium mb-3">Pay with PayPal</p>
                <PayPalCheckoutButtons
                  auditId={id}
                  planType={selectedPlan}
                  referralCode={referralCode}
                  onDemoComplete={(url) => { window.location.href = url; }}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Pay with PayPal balance, debit, or credit card
                </p>
              </div>
            </PayPalScriptProvider>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-10 text-xs text-muted-foreground print:mt-6">
        <p>SiteAudit AI — Automated website audit powered by AI</p>
        <p className="mt-1">Report generated {new Date(data.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
