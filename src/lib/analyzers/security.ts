import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `sec-${++issueCounter}`;
}

export function analyzeSecurity(
  pages: CrawledPage[],
  mainUrl: string,
  mainHeaders: Record<string, string>
): CategoryResult {
  const issues: Issue[] = [];

  // HTTPS check
  if (!mainUrl.startsWith("https://")) {
    issues.push({
      id: issueId(),
      severity: "critical",
      category: "security",
      title: "Site is not using HTTPS",
      description: "The website does not use HTTPS encryption.",
      whyItMatters: "HTTPS is essential for protecting user data, building trust, and is a ranking signal for search engines. Most modern browsers flag HTTP sites as 'Not Secure'.",
      howToFix: "Install an SSL/TLS certificate. Many hosting providers offer free certificates through Let's Encrypt.",
      estimatedImpact: "Critical — user data is transmitted unencrypted",
    });
  }

  // Content-Security-Policy
  if (!mainHeaders["content-security-policy"]) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "security",
      title: "Missing Content-Security-Policy header",
      description: "The site does not have a Content-Security-Policy header.",
      whyItMatters: "CSP helps prevent cross-site scripting (XSS) attacks by specifying which resources are allowed to load.",
      howToFix: "Implement a Content-Security-Policy header. Start with a report-only policy and gradually tighten restrictions.",
    });
  }

  // X-Frame-Options
  if (!mainHeaders["x-frame-options"]) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "security",
      title: "Missing X-Frame-Options header",
      description: "The site does not have an X-Frame-Options header.",
      whyItMatters: "Without X-Frame-Options, your site could be embedded in iframes on other sites, enabling clickjacking attacks.",
      howToFix: "Add 'X-Frame-Options: DENY' or 'X-Frame-Options: SAMEORIGIN' header.",
    });
  }

  // Strict-Transport-Security
  if (mainUrl.startsWith("https://") && !mainHeaders["strict-transport-security"]) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "security",
      title: "Missing HSTS header",
      description: "The site does not have a Strict-Transport-Security header.",
      whyItMatters: "HSTS tells browsers to only use HTTPS for your domain, preventing downgrade attacks and cookie hijacking.",
      howToFix: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' header.",
    });
  }

  // X-Content-Type-Options
  if (!mainHeaders["x-content-type-options"]) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "security",
      title: "Missing X-Content-Type-Options header",
      description: "The site does not have an X-Content-Type-Options header.",
      whyItMatters: "This header prevents browsers from MIME-type sniffing, which can lead to security vulnerabilities.",
      howToFix: "Add 'X-Content-Type-Options: nosniff' header.",
    });
  }

  // Referrer-Policy
  if (!mainHeaders["referrer-policy"]) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "security",
      title: "Missing Referrer-Policy header",
      description: "The site does not have a Referrer-Policy header.",
      whyItMatters: "Without this header, browsers send full URLs as referrers, potentially exposing sensitive information in URL parameters.",
      howToFix: "Add 'Referrer-Policy: strict-origin-when-cross-origin' header.",
    });
  }

  // Permissions-Policy
  if (!mainHeaders["permissions-policy"] && !mainHeaders["feature-policy"]) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "security",
      title: "Missing Permissions-Policy header",
      description: "The site does not have a Permissions-Policy header.",
      whyItMatters: "This header allows you to control which browser features your site can use, reducing attack surface.",
      howToFix: "Add a Permissions-Policy header to restrict access to features like camera, microphone, geolocation, etc.",
    });
  }

  // Mixed content
  const firstPage = pages[0];
  if (firstPage && mainUrl.startsWith("https://")) {
    const httpResources = firstPage.html.match(/(?:src|href|action)=["']http:\/\/[^"']+["']/gi) || [];
    if (httpResources.length > 0) {
      issues.push({
        id: issueId(),
        severity: "high",
        category: "security",
        title: `${httpResources.length} mixed content resource${httpResources.length > 1 ? "s" : ""} detected`,
        description: "The page loads resources over HTTP from an HTTPS page.",
        whyItMatters: "Mixed content can allow attackers to inject content or steal data, and browsers may block these resources entirely.",
        howToFix: "Update all resource URLs to use HTTPS. Check for hardcoded HTTP links in your code and templates.",
        estimatedImpact: "High — browsers may block resources and users may see security warnings",
      });
    }
  }

  // Score calculation
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 20; break;
      case "high": score -= 10; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  if (mainUrl.startsWith("https://")) score += 5;

  score = Math.max(0, Math.min(100, score));

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const summary = criticalCount > 0
    ? "Critical security issues detected. Immediate action recommended."
    : issues.length === 0
      ? "Good security posture. Basic security headers are in place."
      : `Found ${issues.length} security issue${issues.length > 1 ? "s" : ""}. Review and address as appropriate.`;

  return { score, issues, summary };
}
