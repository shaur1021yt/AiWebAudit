import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `perf-${++issueCounter}`;
}

export function analyzePerformance(
  pages: CrawledPage[],
  metadata: Record<string, string>,
  pageHeaders: Record<string, string>[]
): CategoryResult {
  const issues: Issue[] = [];
  const mainPage = pages[0];

  if (!mainPage) {
    return { score: 0, issues: [], summary: "No page data available for analysis." };
  }

  // HTML size
  const htmlSizeKB = Math.round(mainPage.html.length / 1024);
  if (htmlSizeKB > 200) {
    issues.push({
      id: issueId(),
      severity: htmlSizeKB > 500 ? "high" : "medium",
      category: "performance",
      title: `Large HTML document (${htmlSizeKB}KB)`,
      description: `The HTML document is ${htmlSizeKB}KB, which is larger than recommended.`,
      whyItMatters: "Large HTML files take longer to download, parse, and render, especially on slower connections and mobile devices.",
      howToFix: "Minimize HTML by removing unnecessary whitespace, comments, and unused code. Consider server-side rendering optimizations.",
    });
  }

  // Render-blocking resources
  const scripts = mainPage.html.match(/<script\s+[^>]*src=["'][^"']+["'][^>]*>/gi) || [];
  const stylesheets = mainPage.html.match(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
  
  const renderBlockingScripts = scripts.filter((s) => !s.includes("async") && !s.includes("defer"));
  if (renderBlockingScripts.length > 3) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "performance",
      title: `${renderBlockingScripts.length} render-blocking scripts`,
      description: `Found ${renderBlockingScripts.length} synchronous scripts that block page rendering.`,
      whyItMatters: "Render-blocking scripts delay the first paint of your page, increasing perceived load time.",
      howToFix: "Add 'async' or 'defer' attributes to non-critical scripts. Load critical scripts inline and defer the rest.",
      estimatedImpact: "High — can reduce render time by 1-3 seconds",
    });
  }

  if (stylesheets.length > 5) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "performance",
      title: `${stylesheets.length} stylesheets loaded`,
      description: `The page loads ${stylesheets.length} external stylesheets.`,
      whyItMatters: "Each stylesheet is an additional HTTP request. Multiple stylesheets can delay rendering.",
      howToFix: "Combine and minify CSS files. Use critical CSS inline and load the rest asynchronously.",
    });
  }

  // Caching headers
  for (let i = 0; i < Math.min(pages.length, 3); i++) {
    const headers = pageHeaders[i] || pages[i]?.headers || {};
    if (!headers["cache-control"]) {
      issues.push({
        id: issueId(),
        severity: "medium",
        category: "performance",
        title: "Missing Cache-Control header",
        description: `The page at ${pages[i].url} does not have a Cache-Control header.`,
        whyItMatters: "Without caching headers, browsers must re-download the page on every visit, increasing load times for returning visitors.",
        howToFix: "Add appropriate Cache-Control headers. For HTML pages, consider 'max-age=3600' or 'stale-while-revalidate'.",
      });
      break; // Only report once
    }
  }

  // Compression
  const mainHeaders = mainPage.headers;
  const hasCompression = mainHeaders["content-encoding"] === "gzip" || 
                         mainHeaders["content-encoding"] === "br" || 
                         mainHeaders["content-encoding"] === "deflate";
  if (!hasCompression) {
    issues.push({
      id: issueId(),
      severity: "high",
      category: "performance",
      title: "No compression detected",
      description: "The response does not appear to be compressed.",
      whyItMatters: "Compression can reduce file sizes by 60-80%, significantly improving load times, especially on mobile networks.",
      howToFix: "Enable Gzip or Brotli compression on your server. Most hosting providers support this in their settings.",
      estimatedImpact: "High — can reduce transfer size by 60-80%",
    });
  }

  // Script and stylesheet count
  if (scripts.length > 10) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "performance",
      title: `${scripts.length} scripts loaded`,
      description: `The page loads ${scripts.length} external scripts.`,
      whyItMatters: "Each script is an additional HTTP request and adds parsing/execution time.",
      howToFix: "Audit your scripts. Remove unused ones and combine where possible. Consider loading non-critical scripts asynchronously.",
    });
  }

  // Image optimization hints (from the HTML)
  const lazyImages = (mainPage.html.match(/loading=["']lazy["']/gi) || []).length;
  const totalImages = mainPage.images.length;
  if (totalImages > 3 && lazyImages === 0) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "performance",
      title: "No lazy loading detected on images",
      description: "None of the images appear to use lazy loading.",
      whyItMatters: "Lazy loading defers off-screen images, reducing initial page load time and bandwidth usage.",
      howToFix: "Add loading=\"lazy\" attribute to images below the fold. Keep above-the-fold images eager-loaded.",
    });
  }

  // Image formats
  const nonModernFormats = mainPage.images.filter((img) => {
    const ext = img.src.split(".").pop()?.toLowerCase();
    return ext && ["jpg", "jpeg", "png", "gif", "bmp"].includes(ext);
  });
  if (nonModernFormats.length > 3) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "performance",
      title: `${nonModernFormats.length} images using legacy formats`,
      description: "Several images use older formats that are larger than modern alternatives.",
      whyItMatters: "Modern formats like WebP and AVIF offer 25-50% better compression than JPEG/PNG at equivalent quality.",
      howToFix: "Convert images to WebP or AVIF format. Use <picture> elements with fallbacks for older browsers.",
    });
  }

  // Calculate score
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 15; break;
      case "high": score -= 10; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  // Bonuses
  if (hasCompression) score += 5;
  if (renderBlockingScripts.length === 0 && scripts.length > 0) score += 3;
  if (lazyImages > 0 || totalImages <= 3) score += 2;
  if (htmlSizeKB < 50) score += 3;

  score = Math.max(0, Math.min(100, score));

  const summary = score >= 80
    ? "Good performance fundamentals. The page loads efficiently."
    : score >= 60
      ? "Some performance improvements are possible. See the issues below."
      : "Significant performance issues detected that are likely affecting load times.";

  return { score, issues, summary };
}
