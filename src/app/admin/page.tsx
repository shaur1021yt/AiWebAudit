"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users, BarChart3, DollarSign, TrendingUp, AlertCircle,
  Loader2, Shield, Globe, FileText, ArrowRight, Tag,
  CreditCard, Eye, Zap, Crown, Copy, Check,
} from "lucide-react";

interface RevenueData {
  overview: {
    totalUsers: number;
    totalAudits: number;
    completedAudits: number;
    failedAudits: number;
    paidTransactions: number;
    conversionRate: number;
  };
  revenue: {
    totalRevenueCents: number;
    totalBaseRevenueCents: number;
    totalDiscountGivenCents: number;
    avgOrderValue: number;
    netProfit: number;
    totalCosts: number;
    processingFees: number;
    infraCosts: number;
  };
  byPlan: Record<string, { count: number; revenue: number }>;
  byDay: Record<string, number>;
  referralCodes: Array<{ code: string; discountPct: number; usesCount: number; isActive: boolean }>;
  referralStats: { totalReferralPayments: number; referralRevenue: number };
  recentPayments: Array<{
    id: string;
    planType: string;
    finalPriceCents: number;
    basePriceCents: number;
    discountPct: number;
    status: string;
    createdAt: number;
  }>;
}

const PLAN_LABELS: Record<string, string> = {
  full_audit: "Full Audit",
  ai_improvement_plan: "AI Plan",
  pro_audit: "Pro Audit",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(25);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any).role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetch("/api/admin/revenue")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [session, status]);

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { overview: o, revenue: r } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">SiteAudit AI — Business Overview</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{session?.user?.email}</p>
          <p className="text-xs text-primary">Admin — Free unlimited access</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: formatCents(r.totalRevenueCents), icon: <DollarSign className="w-4 h-4" />, color: "text-green-500" },
          { label: "Net Profit", value: formatCents(r.netProfit), icon: <TrendingUp className="w-4 h-4" />, color: r.netProfit > 0 ? "text-green-500" : "text-red-500" },
          { label: "Total Users", value: String(o.totalUsers), icon: <Users className="w-4 h-4" />, color: "" },
          { label: "Conversion Rate", value: `${o.conversionRate}%`, icon: <BarChart3 className="w-4 h-4" />, color: "" },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {stat.icon}
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Financials */}
        <div className="rounded-lg border border-border/50 bg-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Financial Summary
          </h2>
          <div className="space-y-3">
            {[
              { label: "Gross Revenue", value: formatCents(r.totalBaseRevenueCents) },
              { label: "Referral Discounts Given", value: `-${formatCents(r.totalDiscountGivenCents)}`, color: "text-amber-500" },
              { label: "Net Revenue", value: formatCents(r.totalRevenueCents), bold: true },
              { label: "Processing Fees (~$0.50/txn)", value: `-${formatCents(r.processingFees)}` },
              { label: "Infrastructure (~$0.30/scan)", value: `-${formatCents(r.infraCosts)}` },
              { label: "Total Costs", value: `-${formatCents(r.totalCosts)}` },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-medium ${item.color || ""} ${item.bold ? "text-lg" : ""}`}>
                  {item.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-sm font-semibold">Net Profit</span>
              <span className={`text-lg font-bold ${r.netProfit > 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCents(r.netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* By Plan */}
        <div className="rounded-lg border border-border/50 bg-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Revenue by Plan
          </h2>
          <div className="space-y-3">
            {Object.entries(data.byPlan).map(([plan, stats]) => (
              <div key={plan} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  {plan === "full_audit" && <Check className="w-4 h-4 text-green-500" />}
                  {plan === "ai_improvement_plan" && <Zap className="w-4 h-4 text-amber-500" />}
                  {plan === "pro_audit" && <Crown className="w-4 h-4 text-violet-500" />}
                  <span className="text-sm font-medium">{PLAN_LABELS[plan] || plan}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCents(stats.revenue)}</p>
                  <p className="text-xs text-muted-foreground">{stats.count} sales</p>
                </div>
              </div>
            ))}
            {Object.keys(data.byPlan).length === 0 && (
              <p className="text-sm text-muted-foreground">No sales yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Audit stats + Referral codes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Audit overview */}
        <div className="rounded-lg border border-border/50 bg-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Audit Overview
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Scans", value: String(o.totalAudits) },
              { label: "Completed", value: String(o.completedAudits), color: "text-green-500" },
              { label: "Failed", value: String(o.failedAudits), color: "text-red-500" },
              { label: "Paid Reports", value: String(o.paidTransactions) },
              { label: "Avg Order", value: formatCents(r.avgOrderValue) },
              { label: "Revenue/Scan", value: o.completedAudits > 0 ? formatCents(Math.round(r.totalRevenueCents / o.completedAudits)) : "—" },
            ].map((stat, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color || ""}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Referral codes */}
        <div className="rounded-lg border border-border/50 bg-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Referral Codes
          </h2>
          <div className="space-y-2 mb-4">
            {data.referralCodes.length > 0 ? data.referralCodes.map((code) => (
              <div key={code.code} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-muted/50 px-2 py-0.5 rounded">{code.code}</code>
                  <span className="text-xs text-muted-foreground">{code.discountPct}% off</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{code.usesCount} uses</span>
                  <button onClick={() => copyCode(code.code)} className="p-1 hover:bg-muted rounded">
                    {copiedCode === code.code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No referral codes yet</p>
            )}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                Referral revenue: {formatCents(data.referralStats.referralRevenue)} ({data.referralStats.totalReferralPayments} sales)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent payments */}
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden mb-8">
        <div className="p-4 border-b border-border/50">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Recent Payments
          </h2>
        </div>
        {data.recentPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No payments yet</div>
        ) : (
          <div>
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center gap-4 p-4 border-b border-border/30 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{PLAN_LABELS[payment.planType] || payment.planType}</span>
                    {payment.discountPct > 0 && (
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">
                        -{payment.discountPct}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString()} {new Date(payment.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCents(payment.finalPriceCents)}</p>
                  {payment.discountPct > 0 && (
                    <p className="text-xs text-muted-foreground line-through">{formatCents(payment.basePriceCents)}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  payment.status === "completed"
                    ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Scan a site", href: "/", icon: <Zap className="w-4 h-4" /> },
          { label: "Dashboard", href: "/dashboard", icon: <BarChart3 className="w-4 h-4" /> },
          { label: "Pricing", href: "/pricing", icon: <DollarSign className="w-4 h-4" /> },
          { label: "All audits", href: "/api/audit", icon: <Globe className="w-4 h-4" /> },
        ].map((link) => (
          <a key={link.href} href={link.href} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-card hover:shadow-md transition-shadow text-sm font-medium">
            {link.icon}
            {link.label}
            <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
          </a>
        ))}
      </div>
    </div>
  );
}
