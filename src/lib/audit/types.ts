export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Issue {
  id: string;
  severity: Severity;
  category: AuditCategory;
  title: string;
  description: string;
  whyItMatters: string;
  howToFix: string;
  technicalDetails?: string;
  affectedPages?: string[];
  estimatedImpact?: string;
}

export type AuditCategory =
  | "seo"
  | "performance"
  | "accessibility"
  | "mobile"
  | "security"
  | "content"
  | "conversion"
  | "images"
  | "links";

export interface CategoryResult {
  score: number;
  issues: Issue[];
  summary: string;
}

export interface AuditResult {
  overallScore: number;
  seo: CategoryResult;
  performance: CategoryResult;
  accessibility: CategoryResult;
  mobile: CategoryResult;
  security: CategoryResult;
  content: CategoryResult;
  conversion: CategoryResult;
  image: CategoryResult;
  links: CategoryResult;
  metadata: PageMetadata;
  pagesCrawled: number;
  linksChecked: number;
  duration: number;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  canonical?: string;
  h1?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  viewport?: string;
  charset?: string;
  language?: string;
  https: boolean;
  responseTime: number;
  htmlSize: number;
  wordCount: number;
}

export interface CrawledPage {
  url: string;
  status: number;
  html: string;
  headers: Record<string, string>;
  links: { internal: string[]; external: string[]; broken: string[] };
  images: { src: string; alt: string; width?: number; height?: number; size?: number }[];
}

export interface ScoringWeights {
  seo: number;
  performance: number;
  accessibility: number;
  mobile: number;
  security: number;
  content: number;
  conversion: number;
  images?: number;
  links?: number;
}

export type PlanTier = "free" | "full_audit" | "ai_improvement_plan" | "pro_audit" | "monitoring";

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: "one-time" | "month";
  description: string;
  features: string[];
}

export interface SocialPreview {
  title?: string;
  description?: string;
  image?: string;
  url: string;
}
