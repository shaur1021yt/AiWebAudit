"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Globe,
  BarChart3,
  FileText,
  Settings,
  CreditCard,
  ArrowRight,
  Plus,
  Clock,
  Loader2,
  AlertCircle,
  Lock,
  LogOut,
  User,
  Check,
  Crown,
  Zap,
} from "lucide-react";

interface AuditEntry {
  id: string;
  url: string;
  domain: string;
  status: string;
  score: number | null;
  issueCount: number;
  duration: number | null;
  paidReport: boolean;
  hasReport: boolean;
  createdAt: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("audits");

  // Login form
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (session) {
      fetch("/api/user/audits")
        .then((r) => r.json())
        .then((data) => {
          setAudits(data.audits || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Auto sign in after registration
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInResult?.error) throw new Error("Sign in failed after registration");
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) throw new Error("Invalid email or password");
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ---- NOT LOGGED IN: show login/signup ----
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    const freeAudits = audits.length; // won't have any, but for structure
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {authMode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {authMode === "signin"
              ? "Sign in to view your audit history and reports."
              : "Sign up to track your audits and unlock full reports."}
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6">
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "signup" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary"
                  placeholder="Your name"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary"
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>

            {authError && (
              <p className="text-sm text-red-500">{authError}</p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {authLoading
                ? "Loading..."
                : authMode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === "signin" ? "signup" : "signin");
                setAuthError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {authMode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Free accounts include audit history. Pay once per report to unlock full details.
        </p>
      </div>
    );
  }

  // ---- LOGGED IN: show dashboard ----
  const completed = audits.filter((a) => a.status === "COMPLETED");
  const paidAudits = audits.filter((a) => a.paidReport);
  const unpaidAudits = audits.filter((a) => !a.paidReport);
  const avgScore =
    completed.length > 0
      ? Math.round(completed.reduce((s, a) => s + (a.score || 0), 0) / completed.length)
      : 0;
  const uniqueDomains = new Set(audits.map((a) => a.domain)).size;

  const tabs = [
    { id: "audits", label: "Audits", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "reports", label: "Reports", icon: <FileText className="w-4 h-4" /> },
    { id: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {session.user?.name || session.user?.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => signOut()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
          <Link
            href="/"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Audit
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Audits", value: String(audits.length), icon: <BarChart3 className="w-4 h-4" /> },
          { label: "Websites", value: String(uniqueDomains), icon: <Globe className="w-4 h-4" /> },
          { label: "Paid Reports", value: String(paidAudits.length), icon: <Check className="w-4 h-4" /> },
          { label: "Avg Score", value: avgScore > 0 ? String(avgScore) : "—", icon: <BarChart3 className="w-4 h-4" /> },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {stat.icon}
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/50 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* AUDITS TAB */}
      {activeTab === "audits" && (
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Audits</h2>
            <span className="text-xs text-muted-foreground">{audits.length} total</span>
          </div>
          {loading ? (
            <div className="p-12 text-center flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading audits...
            </div>
          ) : audits.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No audits yet.</p>
              <Link href="/" className="text-sm text-primary hover:underline">
                Run your first audit →
              </Link>
            </div>
          ) : (
            <div>
              {audits.map((audit) => (
                <div
                  key={audit.id}
                  className="flex items-center gap-4 p-4 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {audit.status === "COMPLETED" && audit.score !== null ? (
                    <div className={`text-2xl font-bold ${getScoreColor(audit.score)}`}>
                      {audit.score}
                    </div>
                  ) : audit.status === "FAILED" ? (
                    <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{audit.domain || audit.url}</p>
                      {audit.paidReport && (
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          PAID
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {audit.issueCount > 0
                        ? `${audit.issueCount} issue${audit.issueCount !== 1 ? "s" : ""}`
                        : audit.status === "FAILED"
                          ? "Scan failed"
                          : audit.status === "COMPLETED"
                            ? "No issues"
                            : audit.status.toLowerCase()}
                      {" · "}
                      {new Date(audit.createdAt).toLocaleDateString()}
                      {audit.duration ? ` · ${audit.duration}s` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!audit.paidReport && audit.status === "COMPLETED" && (
                      <Link
                        href={`/report/${audit.id}`}
                        className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        View Report
                      </Link>
                    )}
                    {audit.paidReport && (
                      <Link
                        href={`/report/${audit.id}?paid=1`}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Full Report
                      </Link>
                    )}
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      audit.status === "COMPLETED"
                        ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        : audit.status === "FAILED"
                          ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {audit.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {paidAudits.length > 0 ? (
            paidAudits.map((audit) => (
              <Link
                key={audit.id}
                href={`/report/${audit.id}?paid=1`}
                className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card hover:shadow-md transition-shadow"
              >
                <div className={`text-2xl font-bold ${getScoreColor(audit.score || 0)}`}>
                  {audit.score}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{audit.domain}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid report · {new Date(audit.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <FileText className="w-5 h-5 text-muted-foreground" />
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-2">No paid reports yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Purchase a full audit report to see it here.
              </p>
              <Link href="/" className="text-sm text-primary hover:underline">
                Run an audit →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* BILLING TAB */}
      {activeTab === "billing" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-card p-6">
            <h3 className="font-semibold mb-4">Your Plan</h3>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Free Account</p>
                <p className="text-xs text-muted-foreground">
                  {paidAudits.length} paid report{paidAudits.length !== 1 ? "s" : ""} purchased
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-card p-6">
            <h3 className="font-semibold mb-4">Available Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  name: "Full Audit",
                  price: "$9.99",
                  icon: <Check className="w-4 h-4 text-green-500" />,
                  features: ["All issues", "Severity ratings", "Fix instructions", "PDF"],
                },
                {
                  name: "AI Plan",
                  price: "$19.99",
                  icon: <Zap className="w-4 h-4 text-amber-500" />,
                  features: ["Everything in Full", "AI improvement plan", "Timeline", "Code snippets"],
                  popular: true,
                },
                {
                  name: "Pro Audit",
                  price: "$49.99",
                  icon: <Crown className="w-4 h-4 text-violet-500" />,
                  features: ["Everything in AI", "Deep analysis", "Blueprint", "Priority support"],
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-xl border p-4 ${
                    plan.popular
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/50 bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {plan.icon}
                    <span className="font-semibold text-sm">{plan.name}</span>
                  </div>
                  <p className="text-xl font-bold mb-3">{plan.price}</p>
                  <ul className="space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground">• {f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="rounded-lg border border-border/50 bg-card p-6">
          <h3 className="font-semibold mb-4">Account</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">{session.user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-xs text-muted-foreground">{session.user?.name || "Not set"}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50">
              <button
                onClick={() => signOut()}
                className="text-sm text-red-500 hover:text-red-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
