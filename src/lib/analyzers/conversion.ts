import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `cvn-${++issueCounter}`;
}

export function analyzeConversion(pages: CrawledPage[]): CategoryResult {
  const issues: Issue[] = [];
  const mainPage = pages[0];

  if (!mainPage) {
    return { score: 0, issues: [], summary: "No page data available for analysis." };
  }

  const html = mainPage.html.toLowerCase();

  // CTA presence
  const ctaPatterns = /\b(get started|sign up|try|demo|buy now|purchase|subscribe|contact us|get a quote|request|book|schedule|start free|start trial|learn more|see pricing)\b/i;
  if (!ctaPatterns.test(html)) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "conversion",
      title: "No clear call to action found",
      description: "The homepage does not appear to have a prominent call to action.",
      whyItMatters: "Without a clear CTA, visitors may not know how to take the next step, leading to lost conversions.",
      howToFix: "Add a clear, prominent CTA button (e.g., 'Get Started Free', 'Try Now', 'Contact Us') above the fold.",
      estimatedImpact: "High — CTAs are essential for guiding users toward conversion",
    });
  }

  // Contact information
  const hasPhone = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/.test(html);
  const hasEmail = /[\w.-]+@[\w.-]+\.\w{2,}/.test(html);
  const hasContactForm = html.includes("contact") && (html.includes("form") || html.includes("input"));
  
  if (!hasPhone && !hasEmail && !hasContactForm) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "conversion",
      title: "No contact information found",
      description: "The page does not appear to have a phone number, email, or contact form.",
      whyItMatters: "Easy access to contact information builds trust and makes it easy for potential customers to reach you.",
      howToFix: "Add contact information prominently on the page — a phone number, email, or a contact form.",
    });
  }

  // Trust signals
  const trustPatterns = /\b(testimonial|review|case study|trusted|certified|award|partner|client|customer|guarantee|secure|ssl|money.back|refund)\b/i;
  if (!trustPatterns.test(html)) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "conversion",
      title: "No trust signals detected",
      description: "The page does not appear to include testimonials, reviews, certifications, or other trust-building elements.",
      whyItMatters: "Trust signals help reduce anxiety and build confidence, especially for new visitors.",
      howToFix: "Add social proof elements like customer testimonials, case studies, security badges, or partner logos.",
    });
  }

  // Navigation
  const hasNav = html.includes("<nav") || html.includes("class=\"nav") || html.includes("class=\"menu");
  if (!hasNav) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "conversion",
      title: "No clear navigation structure",
      description: "The page does not appear to have a standard navigation element.",
      whyItMatters: "Clear navigation helps visitors find what they're looking for and reduces frustration.",
      howToFix: "Add a clear, organized navigation menu that helps visitors find key pages.",
    });
  }

  // Pricing visibility
  const pricingPatterns = /\b(pricing|price|plan|cost|\$\d|per month|per year|starts at)\b/i;
  if (!pricingPatterns.test(html)) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "conversion",
      title: "No pricing information visible",
      description: "The homepage does not appear to show pricing information.",
      whyItMatters: "Visible pricing helps qualify leads and reduces friction for potential buyers who want to understand costs.",
      howToFix: "Consider adding a pricing section or a clear link to your pricing page.",
    });
  }

  // Lead form
  const hasLeadForm = html.includes("newsletter") || html.includes("email signup") || html.includes("subscribe") || (html.includes("form") && html.includes("email"));
  if (!hasLeadForm && wordCount(mainPage) > 300) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "conversion",
      title: "No email capture or lead form detected",
      description: "The page does not appear to have a newsletter signup or lead capture form.",
      whyItMatters: "Email capture allows you to follow up with visitors who aren't ready to buy yet.",
      howToFix: "Add an email signup form or newsletter subscription to capture leads from visitors who aren't ready to convert.",
    });
  }

  // Social proof - number of mentions
  const socialProof = /\b(hundred|thousand|million|\d+\+|trusted by|used by|customers|businesses|companies)\b/i;
  if (!socialProof.test(html)) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "conversion",
      title: "No quantitative social proof",
      description: "The page does not mention customer count, business numbers, or other quantitative trust signals.",
      whyItMatters: "Numbers (e.g., '10,000+ customers', '99.9% uptime') can be powerful persuasion tools.",
      howToFix: "If applicable, add quantitative social proof like customer counts, satisfaction rates, or case study numbers.",
    });
  }

  // Score calculation
  let score = 70; // Start lower — conversion is often overlooked
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 15; break;
      case "high": score -= 10; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  if (ctaPatterns.test(html)) score += 10;
  if (hasPhone || hasEmail || hasContactForm) score += 5;
  if (trustPatterns.test(html)) score += 5;
  if (hasNav) score += 5;
  if (pricingPatterns.test(html)) score += 3;

  score = Math.max(0, Math.min(100, score));

  const summary = score >= 75
    ? "Good conversion fundamentals. The page guides visitors effectively."
    : score >= 50
      ? "Some conversion improvements are possible. See the issues below."
      : "Significant conversion issues detected. These may be affecting your ability to convert visitors.";

  return { score, issues, summary };
}

function wordCount(page: CrawledPage): number {
  const text = page.html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
