import { ScoringWeights, AuditResult, CategoryResult, Severity, Issue } from "./types";

const DEFAULT_WEIGHTS: ScoringWeights = {
  seo: 20,
  performance: 20,
  accessibility: 15,
  mobile: 15,
  security: 10,
  content: 10,
  conversion: 10,
  images: 5,
  links: 5,
};

export function calculateOverallScore(
  categories: Record<string, CategoryResult>,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (categories[key]) {
      weightedSum += categories[key].score * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "var(--score-excellent)";
  if (score >= 70) return "var(--score-good)";
  if (score >= 50) return "var(--score-fair)";
  if (score >= 30) return "var(--score-poor)";
  return "var(--score-critical)";
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 30) return "Poor";
  return "Critical";
}

export function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-500 to-green-400";
  if (score >= 60) return "from-amber-500 to-yellow-400";
  if (score >= 40) return "from-orange-500 to-amber-400";
  return "from-red-500 to-orange-400";
}

export function sortIssuesBySeverity(issues: Issue[]): Issue[] {
  const order: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  return [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
}

export function countIssuesBySeverity(issues: Issue[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const issue of issues) {
    counts[issue.severity]++;
  }
  return counts;
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    seo: "🔍",
    performance: "⚡",
    accessibility: "♿",
    mobile: "📱",
    security: "🔒",
    content: "📝",
    conversion: "🎯",
    images: "🖼️",
    links: "🔗",
  };
  return icons[category] || "📊";
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    seo: "SEO",
    performance: "Performance",
    accessibility: "Accessibility",
    mobile: "Mobile",
    security: "Security",
    content: "Content",
    conversion: "Conversion",
    images: "Images",
    links: "Links",
  };
  return labels[category] || category;
}
