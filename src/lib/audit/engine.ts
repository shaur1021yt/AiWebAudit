import { crawlWebsite, checkUrlReachable } from "./crawler";
import { analyzeSEO } from "../analyzers/seo";
import { analyzePerformance } from "../analyzers/performance";
import { analyzeAccessibility } from "../analyzers/accessibility";
import { analyzeMobile } from "../analyzers/mobile";
import { analyzeSecurity } from "../analyzers/security";
import { analyzeContent } from "../analyzers/content";
import { analyzeConversion } from "../analyzers/conversion";
import { analyzeImages } from "../analyzers/images";
import { analyzeLinks } from "../analyzers/links";
import { calculateOverallScore } from "./scorer";
import type { AuditResult, Issue, CategoryResult } from "./types";

export interface ScanProgress {
  step: string;
  message: string;
  completed: boolean;
  error?: boolean;
}

export async function runAudit(
  url: string,
  onProgress?: (progress: ScanProgress[]) => void
): Promise<AuditResult> {
  const startTime = Date.now();
  const progress: ScanProgress[] = [
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
  ];

  const report = (stepUpdates?: Partial<ScanProgress>[]) => {
    if (stepUpdates) {
      for (const update of stepUpdates) {
        const idx = progress.findIndex((p) => p.step === update.step);
        if (idx >= 0) {
          progress[idx] = { ...progress[idx], ...update };
        }
      }
    }
    onProgress?.(progress);
  };

  // Step 1: Check if website is reachable
  let reachableUrl = url.trim();
  if (!reachableUrl.startsWith("http")) reachableUrl = `https://${reachableUrl}`;
  
  const reachability = await checkUrlReachable(reachableUrl);
  if (!reachability.reachable) {
    report([{ step: "reachable", message: "Website unreachable", completed: true, error: true }]);
    throw new Error(
      `Website is unreachable. Possible reasons:\n` +
      `- The website may be down\n` +
      `- SSL certificate issues\n` +
      `- The domain may not exist\n` +
      `- The server may be blocking automated requests\n` +
      `Response time: ${reachability.responseTime}ms`
    );
  }
  report([{ step: "reachable", message: `Website reachable (${reachability.responseTime}ms)`, completed: true }]);

  // Step 2: Crawl the website
  report([{ step: "performance", message: "Crawling website...", completed: false }]);
  const crawlResult = await crawlWebsite(reachableUrl);
  report([{ step: "performance", message: `Crawled ${crawlResult.pages.length} page(s)`, completed: true }]);

  const { pages, allLinks, metadata } = crawlResult;

  if (pages.length === 0) {
    throw new Error("Could not fetch any pages from the website.");
  }

  // Run all analyzers with progress updates
  report([{ step: "seo", message: "Analyzing SEO...", completed: false }]);
  const seoResult = analyzeSEO(pages, metadata, allLinks);
  report([{ step: "seo", message: "SEO analysis complete", completed: true }]);

  report([{ step: "performance", message: "Analyzing performance...", completed: false }]);
  const performanceResult = analyzePerformance(pages, metadata, pages.map((p) => p.headers));
  report([{ step: "performance", message: "Performance analysis complete", completed: true }]);

  report([{ step: "mobile", message: "Analyzing mobile...", completed: false }]);
  const mobileResult = analyzeMobile(pages, metadata);
  report([{ step: "mobile", message: "Mobile analysis complete", completed: true }]);

  report([{ step: "accessibility", message: "Analyzing accessibility...", completed: false }]);
  const accessibilityResult = analyzeAccessibility(pages, metadata);
  report([{ step: "accessibility", message: "Accessibility analysis complete", completed: true }]);

  report([{ step: "security", message: "Analyzing security...", completed: false }]);
  const securityResult = analyzeSecurity(pages, reachableUrl, pages[0]?.headers || {});
  report([{ step: "security", message: "Security analysis complete", completed: true }]);

  report([{ step: "content", message: "Analyzing content...", completed: false }]);
  const contentResult = analyzeContent(pages, metadata);
  report([{ step: "content", message: "Content analysis complete", completed: true }]);

  report([{ step: "images", message: "Analyzing images...", completed: false }]);
  const imageResult = analyzeImages(pages);
  report([{ step: "images", message: "Image analysis complete", completed: true }]);

  report([{ step: "conversion", message: "Analyzing conversion...", completed: false }]);
  const conversionResult = analyzeConversion(pages);
  report([{ step: "conversion", message: "Conversion analysis complete", completed: true }]);

  report([{ step: "links", message: "Checking links...", completed: false }]);
  const linksResult = await analyzeLinks(pages, allLinks);
  report([{ step: "links", message: "Link check complete", completed: true }]);

  // Calculate overall score
  const categories: Record<string, CategoryResult> = {
    seo: seoResult,
    performance: performanceResult,
    accessibility: accessibilityResult,
    mobile: mobileResult,
    security: securityResult,
    content: contentResult,
    conversion: conversionResult,
    images: imageResult,
    links: linksResult,
  };

  const overallScore = calculateOverallScore(categories);
  const duration = Math.round((Date.now() - startTime) / 1000);

  return {
    overallScore,
    seo: seoResult,
    performance: performanceResult,
    accessibility: accessibilityResult,
    mobile: mobileResult,
    security: securityResult,
    content: contentResult,
    conversion: conversionResult,
    image: imageResult,
    links: linksResult,
    metadata: {
      title: metadata.title,
      description: metadata.description,
      canonical: metadata.canonical,
      h1: metadata.h1,
      ogTitle: metadata["og:title"],
      ogDescription: metadata["og:description"],
      ogImage: metadata["og:image"],
      twitterCard: metadata["twitter:card"],
      viewport: metadata.viewport,
      language: metadata.language,
      https: reachability.https,
      responseTime: reachability.responseTime,
      htmlSize: pages[0]?.html.length || 0,
      wordCount: pages[0]
        ? pages[0].html
            .replace(/<[^>]+>/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 0).length
        : 0,
    },
    pagesCrawled: pages.length,
    linksChecked: allLinks.internal.length + allLinks.external.length,
    duration,
  };
}
