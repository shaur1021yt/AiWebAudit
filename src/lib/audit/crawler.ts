import { CrawledPage } from "./types";

const CRAWL_CONFIG = {
  maxPages: 15,
  maxDepth: 2,
  timeoutMs: 15000,
  maxHtmlSize: 5 * 1024 * 1024, // 5MB
  userAgent: "SiteAuditAI/1.0 (Website Audit Bot)",
};

function normalizeUrl(url: string, base: string): string | null {
  try {
    const resolved = new URL(url, base);
    // Only follow same-origin
    const baseHost = new URL(base).hostname;
    if (resolved.hostname !== baseHost) return null;
    // Skip non-http
    if (!resolved.protocol.startsWith("http")) return null;
    // Strip hash
    resolved.hash = "";
    // Strip trailing slash for consistency (except root)
    let pathname = resolved.pathname;
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    resolved.pathname = pathname;
    return resolved.toString();
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): { internal: string[]; external: string[]; broken: string[] } {
  const internal = new Set<string>();
  const external = new Set<string>();

  // Extract href links
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    
    const normalized = normalizeUrl(href, baseUrl);
    if (normalized) {
      internal.add(normalized);
    } else {
      try {
        const u = new URL(href, baseUrl);
        external.add(u.origin);
      } catch {
        // skip
      }
    }
  }

  return {
    internal: Array.from(internal),
    external: Array.from(external),
    broken: [],
  };
}

function extractImages(html: string, baseUrl: string): CrawledPage["images"] {
  const images: CrawledPage["images"] = [];
  const imgRegex = /<img\s+[^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    const widthMatch = tag.match(/width=["'](\d+)["']/i);
    const heightMatch = tag.match(/height=["'](\d+)["']/i);

    if (srcMatch) {
      try {
        const src = new URL(srcMatch[1], baseUrl).toString();
        images.push({
          src,
          alt: altMatch?.[1] || "",
          width: widthMatch ? parseInt(widthMatch[1]) : undefined,
          height: heightMatch ? parseInt(heightMatch[1]) : undefined,
        });
      } catch {
        // skip invalid URLs
      }
    }
  }

  return images;
}

function extractMetadata(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) meta.title = titleMatch[1].trim();

  // Meta tags
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const tag = match[1];
    const nameMatch = tag.match(/(?:name|property)=["']([^"']+)["']/i);
    const contentMatch = tag.match(/content=["']([^"']+)["']/i);
    if (nameMatch && contentMatch) {
      meta[nameMatch[1].toLowerCase()] = contentMatch[1];
    }
  }

  // Canonical
  const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (canonicalMatch) meta.canonical = canonicalMatch[1];

  // H1
  const h1Match = html.match(/<h1[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/h1>/i);
  if (h1Match) meta.h1 = h1Match[1].replace(/<[^>]+>/g, "").trim();

  // Language
  const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  if (langMatch) meta.language = langMatch[1];

  // Viewport
  const viewportMatch = html.match(/<meta\s+name=["']viewport["']\s+content=["']([^"']+)["']/i);
  if (viewportMatch) meta.viewport = viewportMatch[1];

  return meta;
}

export async function crawlWebsite(url: string): Promise<{
  pages: CrawledPage[];
  allLinks: { internal: string[]; external: string[] };
  metadata: Record<string, string>;
}> {
  // Normalize input URL
  let startUrl = url.trim();
  if (!startUrl.startsWith("http")) startUrl = `https://${startUrl}`;
  
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  const allInternalLinks = new Set<string>();
  const allExternalLinks = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];

  let firstPageMetadata: Record<string, string> = {};

  while (queue.length > 0 && pages.length < CRAWL_CONFIG.maxPages) {
    const { url: currentUrl, depth } = queue.shift()!;
    const normalized = normalizeUrl(currentUrl, startUrl);
    
    if (!normalized || visited.has(normalized)) continue;
    if (depth > CRAWL_CONFIG.maxDepth) continue;
    
    visited.add(normalized);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CRAWL_CONFIG.timeoutMs);

      const response = await fetch(normalized, {
        headers: {
          "User-Agent": CRAWL_CONFIG.userAgent,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("xhtml")) continue;

      const html = await response.text();
      if (html.length > CRAWL_CONFIG.maxHtmlSize) continue;

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      const links = extractLinks(html, normalized);
      const images = extractImages(html, normalized);
      const metadata = extractMetadata(html);

      if (pages.length === 0) {
        firstPageMetadata = metadata;
      }

      pages.push({
        url: normalized,
        status: response.status,
        html,
        headers: responseHeaders,
        links,
        images,
      });

      // Add internal links to queue
      for (const internalLink of links.internal) {
        allInternalLinks.add(internalLink);
        if (!visited.has(internalLink) && depth + 1 <= CRAWL_CONFIG.maxDepth) {
          queue.push({ url: internalLink, depth: depth + 1 });
        }
      }

      for (const externalLink of links.external) {
        allExternalLinks.add(externalLink);
      }
    } catch (error) {
      // Mark as failed but continue
      console.error(`Failed to crawl ${normalized}:`, error);
    }
  }

  return {
    pages,
    allLinks: {
      internal: Array.from(allInternalLinks),
      external: Array.from(allExternalLinks),
    },
    metadata: firstPageMetadata,
  };
}

export async function checkUrlReachable(url: string): Promise<{
  reachable: boolean;
  status?: number;
  responseTime: number;
  https: boolean;
  headers?: Record<string, string>;
}> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CRAWL_CONFIG.timeoutMs);

    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": CRAWL_CONFIG.userAgent },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return {
      reachable: response.ok || response.status < 500,
      status: response.status,
      responseTime: Date.now() - start,
      https: url.startsWith("https://"),
      headers,
    };
  } catch {
    return {
      reachable: false,
      responseTime: Date.now() - start,
      https: url.startsWith("https://"),
    };
  }
}
