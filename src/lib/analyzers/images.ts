import { CrawledPage } from "../audit/types";
import type { CategoryResult, Issue } from "../audit/types";

let issueCounter = 0;
function issueId(): string {
  return `img-${++issueCounter}`;
}

export function analyzeImages(pages: CrawledPage[]): CategoryResult {
  const issues: Issue[] = [];
  const mainPage = pages[0];

  if (!mainPage || mainPage.images.length === 0) {
    return {
      score: 100,
      issues: [],
      summary: "No images found on the main page to analyze.",
    };
  }

  const allImages = mainPage.images;
  
  // Missing alt text
  const missingAlt = allImages.filter((img) => !img.alt || img.alt.trim() === "");
  if (missingAlt.length > 0) {
    issues.push({
      id: issueId(),
      severity: missingAlt.length > 5 ? "critical" : "high",
      category: "images",
      title: `${missingAlt.length} image${missingAlt.length > 1 ? "s" : ""} missing alt text`,
      description: `${missingAlt.length} of ${allImages.length} images do not have alt text.`,
      whyItMatters: "Alt text helps search engines understand image content and is essential for screen reader accessibility.",
      howToFix: "Add descriptive alt text to all meaningful images. Use alt=\"\" for purely decorative images.",
      affectedPages: missingAlt.slice(0, 5).map((i) => i.src),
      estimatedImpact: "High — affects both SEO and accessibility",
    });
  }

  // Lazy loading
  const lazyImages = (mainPage.html.match(/loading=["']lazy["']/gi) || []).length;
  if (allImages.length > 5 && lazyImages === 0) {
    issues.push({
      id: issueId(),
      severity: "medium",
      category: "images",
      title: "No lazy loading on images",
      description: "None of the images use lazy loading.",
      whyItMatters: "Lazy loading defers off-screen images, improving initial page load performance.",
      howToFix: "Add loading=\"lazy\" to images that are below the fold. Keep above-the-fold images as eager-loaded.",
    });
  }

  // Image format analysis
  const formatCount: Record<string, number> = {};
  allImages.forEach((img) => {
    const ext = img.src.split(".").pop()?.toLowerCase()?.split("?")[0] || "unknown";
    formatCount[ext] = (formatCount[ext] || 0) + 1;
  });

  const modernFormats = ["webp", "avif", "svg"];
  const legacyFormats = ["jpg", "jpeg", "png", "gif", "bmp", "tiff"];
  const legacyCount = legacyFormats.reduce((sum, fmt) => sum + (formatCount[fmt] || 0), 0);
  
  if (legacyCount > 3) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "images",
      title: `${legacyCount} images using legacy formats`,
      description: `${legacyCount} images use older formats (JPEG, PNG, GIF). Modern formats offer better compression.`,
      whyItMatters: "WebP and AVIF formats typically offer 25-50% smaller file sizes than JPEG/PNG at equivalent quality.",
      howToFix: "Convert images to WebP or AVIF format. Use the <picture> element with fallbacks for older browsers.",
    });
  }

  // Width/height attributes
  const imagesWithoutDimensions = allImages.filter((img) => !img.width || !img.height);
  if (imagesWithoutDimensions.length > 3) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "images",
      title: `${imagesWithoutDimensions.length} images missing width/height attributes`,
      description: "Several images do not have explicit width and height attributes.",
      whyItMatters: "Missing dimensions can cause layout shift (CLS) as images load, affecting both user experience and Core Web Vitals.",
      howToFix: "Add width and height attributes to <img> tags to prevent layout shift.",
    });
  }

  // Responsive images
  const hasSrcset = allImages.some((img) => mainPage.html.includes(`srcset`) && mainPage.html.includes(img.src.split("/").pop() || ""));
  if (allImages.length > 5 && !mainPage.html.includes("srcset")) {
    issues.push({
      id: issueId(),
      severity: "low",
      category: "images",
      title: "No responsive images detected",
      description: "The page does not appear to use srcset for responsive images.",
      whyItMatters: "Responsive images ensure the right image size is served for each device, improving performance on mobile.",
      howToFix: "Use the srcset attribute or <picture> element to serve appropriately sized images for different viewports.",
    });
  }

  // Score calculation
  let score = 85;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 15; break;
      case "high": score -= 10; break;
      case "medium": score -= 5; break;
      case "low": score -= 2; break;
    }
  }

  if (missingAlt.length === 0) score += 5;
  if (lazyImages > 0) score += 3;
  const modernCount = modernFormats.reduce((sum, fmt) => sum + (formatCount[fmt] || 0), 0);
  if (modernCount > legacyCount) score += 3;

  score = Math.max(0, Math.min(100, score));

  const summary = score >= 80
    ? "Good image practices. Images are well-optimized."
    : score >= 60
      ? "Some image improvements are possible."
      : "Image optimization needs attention.";

  return { score, issues, summary };
}
