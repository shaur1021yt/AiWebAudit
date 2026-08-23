// IP-based rate limiting for free scans.
// Tracks scans per IP. Admin password bypasses the limit.

const scanCounts = new Map<string, { count: number; resetAt: number }>();

const FREE_SCAN_LIMIT = 1;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Admin password — change this to whatever you want
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "bobby2026";

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetsIn: string } {
  const now = Date.now();
  const entry = scanCounts.get(ip);

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    scanCounts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: FREE_SCAN_LIMIT, resetsIn: "24h" };
  }

  if (entry.count >= FREE_SCAN_LIMIT) {
    const hoursLeft = Math.ceil((entry.resetAt - now) / (60 * 60 * 1000));
    return { allowed: false, remaining: 0, resetsIn: `${hoursLeft}h` };
  }

  return { allowed: true, remaining: FREE_SCAN_LIMIT - entry.count, resetsIn: "24h" };
}

export function recordScan(ip: string): void {
  const now = Date.now();
  const entry = scanCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    scanCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}
