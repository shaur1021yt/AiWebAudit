import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `cnt-${++issueCounter}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadability(text: string): { wordsPerSentence: number; avgWordLength: number; fleschLike: number } {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgWordLength = words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0;
  // Simplified Flesch-like score (higher is better)
  const fleschLike = Math.max(0, Math.min(100, 206.835 - 1.015 * wordsPerSentence - 84.6 * (avgWordLength / 5)));
  return { wordsPerSentence, avgWordLength, fleschLike };
}

export function analyzeContent(pages: CrawledPage[], metadata: Record<string, string>): CategoryResult {
  const issues: Issue[] = [];
  const mainPage = pages[0];

  if (!mainPage) {
    return { score: 0, issues: [], summary: "No page data available for analysis." };
  }

  // Word count
  const textContent = stripHtml(mainPage.html);
  const wordCount = textContent.split(/\s+/).filter((w) => w.length > 0).length;

  if (wordCount < 100) {
    issues.push({
      id: issueId(),
      severity: wordCount < 50 ? "critical" : "high",
      category: "content",
      title: `Very thin content (${wordCount} words)`,
      description: `The page contains only approximately ${wordCount} words of visible text.`,
      whyItMatters: "Search engines and users generally expect substantive content. Very thin pages may not rank well and may not provide sufficient value to visitors.",
      howToFix: "Add meaningful, original content that provides value to your audience. Aim for at least 300 words on key pages.",
      estimatedImpact: "High — thin content pages rarely rank well",
    });
  } else if (wordCount < 300) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "content",
      title: `Limited content (${wordCount} words)`,
      description: `The page contains approximately ${wordCount} words. More comprehensive content may perform better.`,
      whyItMatters: "More comprehensive content tends to rank better and provide more value to users.",
      howToFix: "Consider expanding the content with additional useful information, examples, or detail.",
    });
  }

  // Heading structure
  const headings = mainPage.html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
  if (headings.length === 0 && wordCount > 200) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "content",
      title: "No heading structure found",
      description: "The page content does not use heading tags to organize information.",
      whyItMatters: "Headings help both users and search engines understand and navigate your content.",
      howToFix: "Organize your content with descriptive H1-H6 headings to create a clear content hierarchy.",
    });
  }

  // Readability
  const readability = estimateReadability(textContent);
  if (readability.wordsPerSentence > 25) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "content",
      title: "Content may be difficult to read",
      description: `Average sentence length is about ${Math.round(readability.wordsPerSentence)} words. Shorter sentences are generally easier to read.`,
      whyItMatters: "Long, complex sentences are harder to read and understand, especially for non-native speakers and mobile users.",
      howToFix: "Break long sentences into shorter ones. Aim for an average of 15-20 words per sentence.",
    });
  }

  // Missing description
  if (!metadata.description) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "content",
      title: "Missing meta description",
      description: "The page does not have a meta description.",
      whyItMatters: "Meta descriptions help users understand what the page is about before they click.",
      howToFix: "Write a concise, compelling description (150-160 characters) that accurately summarizes the page.",
    });
  }

  // Call to action signals
  const ctaPatterns = /\b(sign up|register|contact|buy|purchase|subscribe|download|get started|try|demo|book|schedule|call|email|learn more|see more|view|browse)\b/i;
  const hasCTA = ctaPatterns.test(stripHtml(mainPage.html));
  if (!hasCTA && wordCount > 200) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "content",
      title: "No clear call to action detected",
      description: "The page content does not appear to have an obvious call to action.",
      whyItMatters: "Without a clear CTA, visitors may not know what to do next, potentially leading to lower engagement and conversion.",
      howToFix: "Add a clear call to action that tells visitors what to do next (e.g., 'Contact us', 'Get started', 'Learn more').",
    });
  }

  // Phone number / contact info
  const hasPhone = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/.test(stripHtml(mainPage.html));
  const hasEmail = /[\w.-]+@[\w.-]+\.\w{2,}/.test(stripHtml(mainPage.html));
  
  // Multiple pages check
  if (pages.length > 1) {
    const wordCounts = pages.map((p) => stripHtml(p.html).split(/\s+/).length);
    const thinPages = wordCounts.filter((wc) => wc < 100).length;
    if (thinPages > 0) {
      issues.push({
        id: issueId(),
        severity: thinPages > 3 ? "high" : "medium",
        category: "content",
        title: `${thinPages} thin page${thinPages > 1 ? "s" : ""} detected`,
        description: `${thinPages} of ${pages.length} crawled pages have fewer than 100 words.`,
        whyItMatters: "Multiple thin pages can dilute your site's overall content quality signals.",
        howToFix: "Either add more content to thin pages or consider consolidating them with related pages.",
      });
    }
  }

  // Score calculation
  let score = 85; // Start reasonable
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 20; break;
      case "high": score -= 10; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  if (wordCount >= 300) score += 5;
  if (wordCount >= 800) score += 5;
  if (readability.fleschLike > 60) score += 3;
  if (metadata.description) score += 3;

  score = Math.max(0, Math.min(100, score));

  const summary = score >= 80
    ? "Good content quality. The page provides substantive, well-structured content."
    : score >= 60
      ? "Content improvements are possible. See the issues below."
      : "Content quality needs attention. Consider expanding and improving your content.";

  return { score, issues, summary };
}
