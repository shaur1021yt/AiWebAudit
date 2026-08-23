import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `mob-${++issueCounter}`;
}

export function analyzeMobile(pages: CrawledPage[], metadata: Record<string, string>): CategoryResult {
  const issues: Issue[] = [];
  const mainPage = pages[0];

  if (!mainPage) {
    return { score: 0, issues: [], summary: "No page data available for analysis." };
  }

  // Viewport meta tag
  if (!metadata.viewport) {
    issues.push({
      id: issueId(),
      severity: "critical",
      category: "mobile",
      title: "Missing viewport meta tag",
      description: "The page does not have a viewport meta tag.",
      whyItMatters: "Without a viewport tag, mobile browsers will render the page at desktop width and scale it down, making text and buttons too small to interact with.",
      howToFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
      estimatedImpact: "Critical — the site may be unusable on mobile devices",
    });
  } else {
    const viewport = metadata.viewport.toLowerCase();
    if (viewport.includes("user-scalable=no") || viewport.includes("user-scalable=0")) {
      issues.push({
        id: issueId(),
        severity: "high",
        category: "mobile",
        title: "User zoom is disabled",
        description: "The viewport meta tag prevents users from zooming in.",
        whyItMatters: "Preventing zoom makes your site harder to use for people with low vision and is considered an accessibility issue.",
        howToFix: "Remove 'user-scalable=no' from the viewport meta tag.",
      });
    }

    if (viewport.includes("maximum-scale=1")) {
      issues.push({
        id: issueId(),
        severity: "medium",
        category: "mobile",
        title: "Maximum zoom scale is limited",
        description: "The viewport limits the maximum zoom to 1x.",
        whyItMatters: "This may prevent users from zooming in enough to read small text.",
        howToFix: "Remove the 'maximum-scale' restriction from the viewport meta tag.",
      });
    }
  }

  // Check for responsive design signals
  const html = mainPage.html;
  const hasMediaQueries = html.includes("@media") || html.includes("media=");
  const hasResponsiveImages = html.includes("srcset") || html.includes("sizes");
  
  if (!hasMediaQueries && !hasResponsiveImages) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "mobile",
      title: "No responsive design signals detected",
      description: "The page does not appear to use CSS media queries or responsive image techniques.",
      whyItMatters: "Without responsive design, the page may not adapt to different screen sizes, making it difficult to use on tablets and phones.",
      howToFix: "Use CSS media queries, flexible layouts (flexbox/grid), and relative units (%, rem, vw) for responsive design.",
    });
  }

  // Fixed width elements (heuristic)
  const fixedWidthElements = html.match(/width:\s*\d{3,}px/gi) || [];
  if (fixedWidthElements.length > 3) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "mobile",
      title: "Multiple fixed-width elements detected",
      description: `Found ${fixedWidthElements.length} elements with fixed pixel widths.`,
      whyItMatters: "Fixed-width elements can cause horizontal scrolling on smaller screens.",
      howToFix: "Use max-width instead of width, or use percentage/flexible units for layout elements.",
    });
  }

  // Touch target sizes (from inline styles - limited detection)
  const smallTouchTargets = html.match(/<a[^>]*style=["'][^"']*font-size:\s*(\d+)px/gi) || [];
  const tinyFontLinks = smallTouchTargets.filter((m) => {
    const size = m.match(/font-size:\s*(\d+)px/)?.[1];
    return size && parseInt(size) < 14;
  });
  if (tinyFontLinks.length > 0) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "mobile",
      title: "Small font sizes on interactive elements",
      description: `${tinyFontLinks.length} links have very small font sizes that may be difficult to tap on mobile.`,
      whyItMatters: "Small text is harder to read on mobile and small touch targets are harder to tap accurately.",
      howToFix: "Ensure all text is at least 14px and interactive elements have a minimum touch target of 44x44px.",
    });
  }

  // Horizontal overflow risk
  const hasOverflowHidden = html.includes("overflow-x:") && html.includes("hidden");
  if (!hasOverflowHidden && fixedWidthElements.length > 5) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "mobile",
      title: "Potential horizontal scrolling on mobile",
      description: "The combination of fixed-width elements without overflow controls may cause horizontal scrolling on mobile devices.",
      whyItMatters: "Horizontal scrolling is a poor mobile experience and is one of the most common mobile usability issues.",
      howToFix: "Use responsive widths and add overflow-x: hidden to the body or container if needed.",
    });
  }

  // Score calculation
  let score = 80; // Start with a reasonable baseline
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 20; break;
      case "high": score -= 12; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  if (metadata.viewport) score += 10;
  if (hasMediaQueries) score += 5;
  if (hasResponsiveImages) score += 5;

  score = Math.max(0, Math.min(100, score));

  const summary = score >= 80
    ? "The page appears to be mobile-friendly."
    : score >= 60
      ? "Some mobile usability improvements are possible."
      : "Significant mobile usability issues detected.";

  return { score, issues, summary };
}
