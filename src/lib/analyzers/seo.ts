import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `seo-${++issueCounter}`;
}

export function analyzeSEO(
  pages: CrawledPage[],
  metadata: Record<string, string>,
  allLinks: { internal: string[]; external: string[] }
): CategoryResult {
  const issues: Issue[] = [];
  const mainPage = pages[0];

  // Title checks
  if (!metadata.title) {
    issues.push({
      id: issueId(),
      severity: "critical",
      category: "seo",
      title: "Missing page title",
      description: "The page does not have a <title> tag.",
      whyItMatters: "Title tags are a primary signal for search engines and appear in search results. Without one, search engines may auto-generate a less relevant title.",
      howToFix: "Add a descriptive <title> tag between 50-60 characters that accurately describes the page content.",
      affectedPages: pages.map((p) => p.url),
      estimatedImpact: "High — directly affects search result click-through rates",
    });
  } else if (metadata.title.length < 30) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "seo",
      title: "Title tag is too short",
      description: `The title is only ${metadata.title.length} characters. Most effective titles are 50-60 characters.`,
      whyItMatters: "Short titles miss opportunities to include relevant keywords and may not give users enough context in search results.",
      howToFix: "Expand the title to 50-60 characters, including the primary keyword and brand name where appropriate.",
    });
  } else if (metadata.title.length > 60) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "seo",
      title: "Title tag may be truncated in search results",
      description: `The title is ${metadata.title.length} characters. Google typically displays the first 50-60 characters.`,
      whyItMatters: "Long titles get truncated in search results, potentially cutting off important information.",
      howToFix: "Shorten the title to 50-60 characters, keeping the most important information at the beginning.",
    });
  }

  // Meta description
  if (!metadata.description) {
    issues.push({
      id: issueId(),
      severity: "critical",
      category: "seo",
      title: "Missing meta description",
      description: "The page does not have a meta description tag.",
      whyItMatters: "Meta descriptions appear below the title in search results. A well-crafted description can significantly improve click-through rates.",
      howToFix: "Write a compelling 150-160 character meta description that accurately summarizes the page content and includes a call to action.",
      affectedPages: pages.map((p) => p.url),
      estimatedImpact: "High — directly affects click-through rates from search results",
    });
  } else if (metadata.description.length > 160) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "seo",
      title: "Meta description may be too long",
      description: `The meta description is ${metadata.description.length} characters. Keep it under 160 characters.`,
      whyItMatters: "Descriptions longer than 160 characters may be truncated in search results.",
      howToFix: "Shorten the meta description to 150-160 characters while keeping it informative and compelling.",
    });
  }

  // H1 checks
  if (!metadata.h1) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "seo",
      title: "Missing H1 heading",
      description: "The page does not have an H1 heading tag.",
      whyItMatters: "H1 tags help search engines understand the main topic of the page. They also provide structure for users.",
      howToFix: "Add a single, descriptive H1 tag that clearly communicates the page's primary topic.",
      estimatedImpact: "Medium — affects page topic clarity",
    });
  }

  // Heading structure on main page
  if (mainPage) {
    const h2Count = (mainPage.html.match(/<h2[\s>]/gi) || []).length;
    const h3Count = (mainPage.html.match(/<h3[\s>]/gi) || []).length;
    if (h2Count === 0 && h3Count === 0) {
      issues.push({
        id: issueId(),
        severity: "medium",
        category: "seo",
        title: "No subheadings found",
        description: "The page has no H2 or H3 headings.",
        whyItMatters: "Subheadings help search engines understand content hierarchy and help users scan content.",
        howToFix: "Break content into sections using H2 and H3 headings to improve readability and structure.",
      });
    }
  }

  // Canonical
  if (!metadata.canonical) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "seo",
      title: "Missing canonical tag",
      description: "The page does not have a canonical URL defined.",
      whyItMatters: "Without a canonical tag, search engines may index duplicate versions of the same page, diluting your ranking signals.",
      howToFix: "Add a <link rel=\"canonical\" href=\"...\"> tag pointing to the preferred URL for this page.",
    });
  }

  // OpenGraph
  if (!metadata["og:title"] && !metadata["og:description"]) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "seo",
      title: "Missing OpenGraph metadata",
      description: "The page does not have OpenGraph title or description tags.",
      whyItMatters: "OpenGraph tags control how your page appears when shared on social media. Without them, shared links may have auto-generated previews.",
      howToFix: "Add og:title, og:description, and og:image meta tags to control social media previews.",
    });
  }

  // Twitter Card
  if (!metadata["twitter:card"]) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "seo",
      title: "Missing Twitter Card metadata",
      description: "No Twitter Card meta tags detected.",
      whyItMatters: "Twitter Card tags control how your page appears when shared on Twitter/X.",
      howToFix: "Add twitter:card, twitter:title, and twitter:description meta tags.",
    });
  }

  // Robots.txt check (simplified)
  if (mainPage) {
    const robotsMeta = mainPage.html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
    if (robotsMeta) {
      const content = robotsMeta[1].toLowerCase();
      if (content.includes("noindex")) {
        issues.push({
          id: issueId(),
          severity: "critical",
          category: "seo",
          title: "Page is set to noindex",
          description: "The page has a robots meta tag set to noindex, which prevents search engines from indexing it.",
          whyItMatters: "A noindex directive tells search engines not to include this page in their results.",
          howToFix: "Remove the noindex directive if you want this page to appear in search results.",
        });
      }
    }
  }

  // Structured data
  if (mainPage && !mainPage.html.includes("application/ld+json")) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "seo",
      title: "No structured data found",
      description: "No JSON-LD structured data detected on the page.",
      whyItMatters: "Structured data helps search engines understand your content and can enable rich results in search listings.",
      howToFix: "Add relevant JSON-LD structured data (Organization, LocalBusiness, Article, FAQ, etc.) based on your content type.",
    });
  }

  // Internal links
  const internalLinkCount = allLinks.internal.length;
  if (internalLinkCount < 3) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "seo",
      title: "Very few internal links",
      description: `Only ${internalLinkCount} internal links were found.`,
      whyItMatters: "Internal links help search engines discover pages and understand site structure.",
      howToFix: "Add relevant internal links between pages to improve site navigation and distribute page authority.",
    });
  }

  // Score calculation
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 15; break;
      case "high": score -= 10; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  // Bonus points
  if (metadata.title && metadata.title.length >= 30 && metadata.title.length <= 60) score += 2;
  if (metadata.description && metadata.description.length >= 100) score += 2;
  if (metadata.canonical) score += 2;
  if (metadata["og:title"]) score += 1;
  if (metadata.h1) score += 2;

  score = Math.max(0, Math.min(100, score));

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const summary = criticalCount > 0
    ? `Found ${criticalCount} critical SEO issue${criticalCount > 1 ? "s" : ""} that need immediate attention.`
    : issues.length === 0
      ? "No significant SEO issues detected. The page has good SEO fundamentals."
      : `Found ${issues.length} issue${issues.length > 1 ? "s" : ""} that could improve search visibility.`;

  return { score, issues, summary };
}
