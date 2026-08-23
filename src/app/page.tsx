"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Eye,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lock,
  Check,
} from "lucide-react";
import { ScanProgress } from "@/components/ScanProgress";
import { ScoreGauge } from "@/components/ScoreGauge";
import { CategoryScore } from "@/components/CategoryScore";
import { IssueCard } from "@/components/IssueCard";
import {
  getCategoryIcon,
  sortIssuesBySeverity,
  countIssuesBySeverity,
  getScoreColor,
  getScoreLabel,
} from "@/lib/audit/scorer";
import type { AuditResult, Issue } from "@/lib/audit/types";

interface ScanStep {
  step: string;
  message: string;
  completed: boolean;
  error?: boolean;
}

function findGoodThing(result: AuditResult): { category: string; message: string } | null {
  // Find the best-scoring category
  const cats = [
    { name: "SEO", score: result.seo.score, issues: result.seo.issues.length },
    { name: "Performance", score: result.performance.score, issues: result.performance.issues.length },
    { name: "Accessibility", score: result.accessibility.score, issues: result.accessibility.issues.length },
    { name: "Mobile", score: result.mobile.score, issues: result.mobile.issues.length },
    { name: "Security", score: result.security.score, issues: result.security.issues.length },
    { name: "Content", score: result.content.score, issues: result.content.issues.length },
    { name: "Conversion", score: result.conversion.score, issues: result.conversion.issues.length },
  ];

  // Prefer categories with 0 issues and high score
  const perfect = cats.filter((c) => c.issues === 0 && c.score >= 90);
  if (perfect.length > 0) {
    const pick = perfect[0];
    return {
      category: pick.name,
      message: `${pick.name} is in great shape — no issues found and scoring ${pick.score}/100.`,
    };
  }

  // Then pick the highest-scoring category
  const sorted = [...cats].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  if (best.score >= 70) {
    return {
      category: best.name,
      message: `${best.name} is solid at ${best.score}/100${best.issues > 0 ? ` with only ${best.issues} minor issue${best.issues > 1 ? "s" : ""}` : ""}.`,
    };
  }

  // Everything is low — find something positive
  if (result.metadata.https) {
    return {
      category: "Security",
      message: "Your site uses HTTPS, which protects your visitors and earns trust.",
    };
  }
  if (result.metadata.responseTime < 1000) {
    return {
      category: "Performance",
      message: `Your site responds in ${result.metadata.responseTime}ms, which is a good baseline.`,
    };
  }

  return null;
}

function findBadThing(result: AuditResult): Issue | null {
  const allIssues = [
    ...result.seo.issues,
    ...result.performance.issues,
    ...result.accessibility.issues,
    ...result.mobile.issues,
    ...result.security.issues,
    ...result.content.issues,
    ...result.conversion.issues,
  ];
  const sorted = sortIssuesBySeverity(allIssues);
  return sorted[0] || null;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"input" | "scanning" | "result" | "error">("input");
  const [progress, setProgress] = useState<ScanStep[]>([]);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = useCallback(async () => {
    if (!url.trim()) return;

    let scanUrl = url.trim();
    if (!scanUrl.startsWith("http")) scanUrl = `https://${scanUrl}`;

    setPhase("scanning");
    setError("");
    // Show initial scanning steps while we wait for the synchronous response
    setProgress([
      { step: "reachable", message: "Checking website...", completed: false },
      { step: "performance", message: "Checking performance", completed: false },
      { step: "seo", message: "Analyzing SEO", completed: false },
      { step: "mobile", message: "Checking mobile experience", completed: false },
      { step: "accessibility", message: "Checking accessibility", completed: false },
      { step: "links", message: "Checking links", completed: false },
      { step: "content", message: "Analyzing content", completed: false },
      { step: "images", message: "Checking images", completed: false },
      { step: "conversion", message: "Analyzing conversion factors", completed: false },
      { step: "security", message: "Checking security", completed: false },
    ]);

    try {
      // Synchronous audit — waits for full result (5-30s)
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl }),
      });

      const data = await res.json();

      if (data.status === "COMPLETED" && data.result) {
        // Mark all progress steps as complete
        setProgress((prev) => prev.map((p) => ({ ...p, completed: true })));
        setResult(data.result);
        setJobId(data.jobId);
        setPhase("result");
      } else if (data.status === "FAILED") {
        throw new Error(data.error || "Audit failed");
      } else if (!res.ok) {
        throw new Error(data.error || "Failed to start audit");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setPhase("error");
    }
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleScan();
    }
  };

  const resetScan = () => {
    setPhase("input");
    setProgress([]);
    setResult(null);
    setError("");
    setJobId("");
    setUrl("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const allIssues: Issue[] = result
    ? [
        ...result.seo.issues,
        ...result.performance.issues,
        ...result.accessibility.issues,
        ...result.mobile.issues,
        ...result.security.issues,
        ...result.content.issues,
        ...result.conversion.issues,
        ...result.image.issues,
        ...result.links.issues,
      ]
    : [];

  const sortedIssues = sortIssuesBySeverity(allIssues);
  const severityCounts = countIssuesBySeverity(allIssues);

  const categories = result
    ? [
        { name: "SEO", key: "seo", score: result.seo.score, issues: result.seo.issues.length },
        { name: "Performance", key: "performance", score: result.performance.score, issues: result.performance.issues.length },
        { name: "Accessibility", key: "accessibility", score: result.accessibility.score, issues: result.accessibility.issues.length },
        { name: "Mobile", key: "mobile", score: result.mobile.score, issues: result.mobile.issues.length },
        { name: "Security", key: "security", score: result.security.score, issues: result.security.issues.length },
        { name: "Content", key: "content", score: result.content.score, issues: result.content.issues.length },
        { name: "Conversion", key: "conversion", score: result.conversion.score, issues: result.conversion.issues.length },
      ]
    : [];

  const lockedCount = 0; // paywall removed for preview

  return (
    <div className="flex flex-col">
      {/* ============ INPUT PHASE ============ */}
      {phase === "input" && (
        <>
          <section className="relative overflow-hidden">
            <div className="noise-bg relative">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-primary font-medium mb-6 bg-primary/5 border border-primary/10 rounded-full px-4 py-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Free website audit — no credit card required
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                  Find out exactly what&apos;s
                  <br />
                  <span className="text-primary">hurting your website.</span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                  Scan your website for SEO, performance, accessibility, security,
                  content, and conversion problems in minutes.
                </p>
                <div className="max-w-xl mx-auto">
                  <div className="flex items-center gap-2 p-1.5 rounded-xl border border-border/80 bg-card shadow-lg shadow-black/5">
                    <div className="pl-3">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <input
                      ref={inputRef}
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="https://yourwebsite.com"
                      className="flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground/50"
                    />
                    <button
                      onClick={handleScan}
                      disabled={!url.trim()}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                    >
                      Scan My Website
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    No credit card required. Free preview included.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-border/50 bg-muted/20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
              <div className="text-center mb-14">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                  Comprehensive website analysis
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Every audit covers 9 critical categories with actionable insights.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: <BarChart3 className="w-5 h-5" />, title: "SEO Analysis", desc: "Title tags, meta descriptions, headings, structured data, OpenGraph, and more." },
                  { icon: <Zap className="w-5 h-5" />, title: "Performance", desc: "HTML size, render-blocking resources, compression, caching, and image optimization." },
                  { icon: <Eye className="w-5 h-5" />, title: "Accessibility", desc: "Alt text, form labels, heading hierarchy, ARIA attributes, and keyboard support." },
                  { icon: <Shield className="w-5 h-5" />, title: "Security", desc: "HTTPS, security headers, CSP, HSTS, mixed content, and permissions policy." },
                  { icon: <CheckCircle2 className="w-5 h-5" />, title: "Content Quality", desc: "Word count, readability, heading structure, calls to action, and thin content detection." },
                  { icon: <Search className="w-5 h-5" />, title: "Link Analysis", desc: "Internal links, external links, broken link detection, and link quality assessment." },
                ].map((feature, i) => (
                  <div key={i} className="p-6 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-border/50">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
                {[
                  { value: "9", label: "Analysis categories" },
                  { value: "5", label: "Severity levels" },
                  { value: "<2min", label: "Scan time" },
                  { value: "100%", label: "Automated" },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl sm:text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============ SCANNING PHASE ============ */}
      {phase === "scanning" && (
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-20">
          <ScanProgress progress={progress} url={url} />
        </section>
      )}

      {/* ============ RESULT PHASE ============ */}
      {phase === "result" && result && (
        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16">
          {/* Score header */}
          <div className="text-center mb-10">
            <p className="text-sm text-muted-foreground mb-2">Your audit is ready</p>
            <ScoreGauge score={result.overallScore} size={200} />
            <p className="text-sm text-muted-foreground mt-4">
              Analyzed {result.pagesCrawled} page{result.pagesCrawled > 1 ? "s" : ""} in {result.duration}s
            </p>
          </div>

          {/* Category breakdown — blurred with lock */}
          <div className="mb-10 relative">
            <h2 className="text-lg font-semibold mb-4">Category Scores</h2>
            <div className="blur-[4px] select-none pointer-events-none opacity-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat, i) => (
                  <CategoryScore
                    key={cat.key}
                    name={cat.name}
                    icon={getCategoryIcon(cat.key)}
                    score={cat.score}
                    issueCount={cat.issues}
                    delay={0}
                  />
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Category details locked</p>
            </div>
          </div>

          {/* 1 Good Thing (free) */}
          {findGoodThing(result) && (
            <div className="mb-6 rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-green-500" />
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">What's Working</h3>
              </div>
              <p className="text-sm text-foreground">{findGoodThing(result)!.message}</p>
            </div>
          )}

          {/* 1 Bad Thing (free) */}
          {findBadThing(result) && (
            <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">Top Issue</h3>
              </div>
              <p className="text-sm font-medium mb-1">{findBadThing(result)!.title}</p>
              <p className="text-sm text-muted-foreground">{findBadThing(result)!.description}</p>
            </div>
          )}

          {/* Issues — blurred with lock + paywall CTA */}
          {sortedIssues.length > 0 && (
            <div className="mb-8">
              <div className="relative">
                <div className="blur-[4px] select-none pointer-events-none opacity-50 space-y-2">
                  {sortedIssues.slice(0, 5).map((issue) => (
                    <div key={issue.id} className="rounded-lg border border-border/50 bg-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        <span className="text-sm font-medium">{issue.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Lock className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-base font-semibold mb-1">{sortedIssues.length} issues found — unlock to see all</p>
                  <p className="text-sm text-muted-foreground mb-4">Get detailed explanations, fix instructions, and priority ratings</p>
                  <button
                    onClick={() => jobId ? router.push(`/report/${jobId}`) : null}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
                  >
                    Unlock Full Report — From $29.99
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="text-center">
            <button
              onClick={resetScan}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Scan another website
            </button>
          </div>
        </section>
      )}

      {/* ============ ERROR PHASE ============ */}
      {phase === "error" && (
        <section className="mx-auto max-w-xl px-4 sm:px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-3">Scan failed</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed whitespace-pre-line">{error}</p>
          <button
            onClick={resetScan}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Try another URL
          </button>
        </section>
      )}
    </div>
  );
}
