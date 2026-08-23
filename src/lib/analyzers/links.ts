import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `lnk-${++issueCounter}`;
}

export async function analyzeLinks(
  pages: CrawledPage[],
  allLinks: { internal: string[]; external: string[] }
): Promise<CategoryResult> {
  const issues: Issue[] = [];
  
  // Check internal links for broken ones
  const brokenInternal: string[] = [];
  const checkedCount = { internal: 0, external: 0 };
  
  // Check a sample of internal links (up to 10)
  const linksToCheck = allLinks.internal.slice(0, 10);
  
  for (const link of linksToCheck) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(link, {
        method: "HEAD",
        headers: { "User-Agent": "SiteAuditAI/1.0 (Link Checker)" },
        signal: controller.signal,
        redirect: "follow",
      });
      
      clearTimeout(timeout);
      checkedCount.internal++;
      
      if (response.status >= 400) {
        brokenInternal.push(link);
      }
    } catch {
      checkedCount.internal++;
      brokenInternal.push(link);
    }
  }

  if (brokenInternal.length > 0) {
    issues.push({
      id: issueId(),
      severity: brokenInternal.length > 3 ? "critical" : "high",
      category: "links",
      title: `${brokenInternal.length} broken internal link${brokenInternal.length > 1 ? "s" : ""} found`,
      description: `${brokenInternal.length} internal links returned errors (404 or 5xx).`,
      whyItMatters: "Broken links create a poor user experience, waste crawl budget, and can negatively affect SEO.",
      howToFix: "Fix or remove broken links. Set up redirects for pages that have moved. Implement a 404 monitoring system.",
      affectedPages: brokenInternal,
      estimatedImpact: "High — broken links directly harm user experience and SEO",
    });
  }

  // External link check (sample of 5)
  const externalLinksToCheck = allLinks.external.slice(0, 5);
  const brokenExternal: string[] = [];
  
  for (const link of externalLinksToCheck) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(link, {
        method: "HEAD",
        headers: { "User-Agent": "SiteAuditAI/1.0 (Link Checker)" },
        signal: controller.signal,
        redirect: "follow",
      });
      
      clearTimeout(timeout);
      checkedCount.external++;
      
      if (response.status >= 400) {
        brokenExternal.push(link);
      }
    } catch {
      checkedCount.external++;
      // Don't flag external links that timeout as "broken" - could be firewall
    }
  }

  if (brokenExternal.length > 0) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "links",
      title: `${brokenExternal.length} broken external link${brokenExternal.length > 1 ? "s" : ""} found`,
      description: `${brokenExternal.length} external links appear to be broken.`,
      whyItMatters: "Broken external links affect user experience and may indicate outdated content.",
      howToFix: "Update or remove broken external links. Consider linking to the new location if content has moved.",
      affectedPages: brokenExternal,
    });
  }

  // Internal link analysis
  if (allLinks.internal.length === 0) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "links",
      title: "No internal links detected",
      description: "The website does not appear to have internal links between pages.",
      whyItMatters: "Internal links help search engines discover and understand your site structure.",
      howToFix: "Add internal links between related pages to improve navigation and help search engines crawl your site.",
    });
  } else if (allLinks.internal.length < 5 && pages.length > 2) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "links",
      title: "Limited internal linking",
      description: `Only ${allLinks.internal.length} internal links found across ${pages.length} pages.`,
      whyItMatters: "More internal links help search engines discover and understand your content relationships.",
      howToFix: "Add contextual internal links between related pages and content.",
    });
  }

  // Link quality
  if (allLinks.external.length > 0 && allLinks.internal.length > 0) {
    const ratio = allLinks.external.length / allLinks.internal.length;
    if (ratio > 2) {
      issues.push({
        id: issueId(),
        severity: "low",
        category: "links",
        title: "High external to internal link ratio",
        description: "The page has significantly more external links than internal links.",
        whyItMatters: "A balanced linking strategy helps keep users on your site while still providing valuable external resources.",
        howToFix: "Consider adding more internal links to keep users engaged on your site.",
      });
    }
  }

  // Redirect chains (check a sample)
  const pagesWithRedirects = pages.filter((p) => {
    // If status is 200 but URL differs from original, there may have been a redirect
    return p.status === 200;
  });

  // Score calculation
  let score = 90;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 15; break;
      case "high": score -= 10; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  if (brokenInternal.length === 0 && allLinks.internal.length > 0) score += 5;
  if (brokenExternal.length === 0 && allLinks.external.length > 0) score += 3;

  score = Math.max(0, Math.min(100, score));

  const summary = brokenInternal.length === 0 && brokenExternal.length === 0
    ? `Checked ${checkedCount.internal} internal and ${checkedCount.external} external links. No broken links detected.`
    : `Checked ${checkedCount.internal} internal and ${checkedCount.external} external links. Found ${brokenInternal.length + brokenExternal.length} broken link(s).`;

  return { score, issues, summary };
}
