import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `a11y-${++issueCounter}`;
}

export function analyzeAccessibility(pages: CrawledPage[], metadata: Record<string, string>): CategoryResult {
  const issues: Issue[] = [];
  const mainPage = pages[0];

  if (!mainPage) {
    return { score: 0, issues: [], summary: "No page data available for analysis." };
  }

  const html = mainPage.html;

  // Language declaration
  if (!metadata.language) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "accessibility",
      title: "Missing language declaration",
      description: "The <html> element does not have a lang attribute.",
      whyItMatters: "Screen readers use the lang attribute to select the correct pronunciation. Without it, assistive technology may misread content.",
      howToFix: 'Add a lang attribute to the <html> element, e.g., <html lang="en">.',
      estimatedImpact: "High — affects all screen reader users",
    });
  }

  // Images without alt text
  const imagesWithoutAlt = mainPage.images.filter((img) => !img.alt || img.alt.trim() === "");
  if (imagesWithoutAlt.length > 0) {
    const severity = imagesWithoutAlt.length > 5 ? "critical" : "high";
    issues.push({
      id: issueId(),
      severity,
      category: "accessibility",
      title: `${imagesWithoutAlt.length} image${imagesWithoutAlt.length > 1 ? "s" : ""} missing alt text`,
      description: `${imagesWithoutAlt.length} of ${mainPage.images.length} images do not have alt text.`,
      whyItMatters: "Alt text is essential for screen reader users to understand image content. It also helps when images fail to load.",
      howToFix: "Add descriptive alt text to all images. For decorative images, use alt=\"\" (empty alt) to signal they can be skipped.",
      affectedPages: imagesWithoutAlt.map((i) => i.src),
      estimatedImpact: "High — images are invisible to screen reader users",
    });
  }

  // Form inputs without labels
  const inputs = html.match(/<input\s+[^>]*>/gi) || [];
  const inputsWithoutLabels = inputs.filter((input) => {
    const idMatch = input.match(/id=["']([^"']+)["']/i);
    if (!idMatch) return true;
    return !html.includes(`for="${idMatch[1]}"`) && !html.includes(`aria-label=`) && !html.includes(`aria-labelledby=`);
  });
  if (inputsWithoutLabels.length > 0) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "accessibility",
      title: `${inputsWithoutLabels.length} form input${inputsWithoutLabels.length > 1 ? "s" : ""} without labels`,
      description: "Some form inputs are not associated with visible labels or aria-labels.",
      whyItMatters: "Form inputs without labels are difficult or impossible for screen reader users to understand and interact with.",
      howToFix: "Associate each input with a <label> element using the 'for' attribute, or add an aria-label attribute.",
    });
  }

  // Heading hierarchy
  const headings = html.match(/<h([1-6])[^>]*>/gi) || [];
  const headingLevels = headings.map((h) => parseInt(h.match(/h(\d)/)?.[1] || "1"));
  let hierarchyBroken = false;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      hierarchyBroken = true;
      break;
    }
  }
  if (hierarchyBroken) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "accessibility",
      title: "Heading hierarchy is not sequential",
      description: "Heading levels skip intermediate levels (e.g., H1 directly to H3).",
      whyItMatters: "Screen reader users navigate by heading levels. Broken hierarchy makes it harder to understand page structure.",
      howToFix: "Ensure heading levels increase sequentially without skipping levels.",
    });
  }

  // ARIA issues
  const ariaHidden = (html.match(/aria-hidden=["']true["']/gi) || []).length;
  const focusableInAriaHidden = ariaHidden > 0 && (html.match(/aria-hidden=["']true["'][^>]*>[^<]*(?:<a |<button |<input)/gi) || []).length > 0;
  if (focusableInAriaHidden) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "accessibility",
      title: "Focusable elements inside aria-hidden containers",
      description: "There are interactive elements (links, buttons, inputs) inside aria-hidden containers.",
      whyItMatters: "Screen readers will skip these elements but they remain keyboard-accessible, creating a confusing experience.",
      howToFix: "Remove aria-hidden from containers with interactive elements, or add tabindex=\"-1\" and remove interactive elements from hidden regions.",
    });
  }

  // Skip navigation link
  if (!html.includes("skip") && !html.includes("Skip") && mainPage.html.length > 5000) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "accessibility",
      title: "No skip navigation link detected",
      description: "The page does not appear to have a skip navigation link.",
      whyItMatters: "Skip links allow keyboard users to bypass repetitive navigation and go directly to the main content.",
      howToFix: "Add a visually hidden skip link as the first focusable element that jumps to the main content area.",
    });
  }

  // Interactive elements - check for click handlers without keyboard support
  const onClickWithoutRole = (html.match(/onclick=["'][^"']*["'][^>]*(?!role=|tabindex=)/gi) || []).length;
  if (onClickWithoutRole > 2) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "accessibility",
      title: "Click handlers without keyboard accessibility",
      description: `${onClickWithoutRole} elements have click handlers that may not be keyboard accessible.`,
      whyItMatters: "Users who cannot use a mouse rely on keyboard navigation. Elements with only click handlers are inaccessible to them.",
      howToFix: "Use native <button> or <a> elements instead of divs with click handlers, or add role and tabindex attributes.",
    });
  }

  // Notice about automated testing limitations
  issues.push({
    id: issueId(),
    severity: "info",
    category: "accessibility",
    title: "Automated accessibility testing limitations",
    description: "This analysis covers common automated-detectable issues only. Many accessibility issues require manual testing.",
    whyItMatters: "Automated tools cannot detect all accessibility issues. Color contrast, focus order, and keyboard navigation often require manual evaluation.",
    howToFix: "Conduct manual accessibility testing using screen readers (NVDA, VoiceOver), keyboard navigation, and tools like axe DevTools.",
  });

  // Score calculation
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "info") continue;
    switch (issue.severity) {
      case "critical": score -= 15; break;
      case "high": score -= 10; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  if (metadata.language) score += 3;
  if (imagesWithoutAlt.length === 0 && mainPage.images.length > 0) score += 3;
  if (!hierarchyBroken && headingLevels.length > 0) score += 2;

  score = Math.max(0, Math.min(100, score));

  const realIssues = issues.filter((i) => i.severity !== "info");
  const summary = realIssues.length === 0
    ? "No automated accessibility issues detected. Manual testing is still recommended."
    : `Found ${realIssues.length} accessibility issue${realIssues.length > 1 ? "s" : ""}. Some may affect users with disabilities.`;

  return { score, issues, summary };
}
