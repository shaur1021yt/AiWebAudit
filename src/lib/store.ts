// Shared in-memory store for audits.
// In production, this would be a database. For now, all audits live here
// and persist for the lifetime of the server process.

export interface StoredAudit {
  id: string;
  url: string;
  domain: string;
  status: "QUEUED" | "SCANNING" | "ANALYZING" | "GENERATING" | "COMPLETED" | "FAILED";
  progress?: Array<{ step: string; message: string; completed: boolean; error?: boolean }>;
  result?: any;
  error?: string;
  paidReport?: boolean;
  planType?: string;
  createdAt: number;
}

interface AuditStore {
  audits: Map<string, StoredAudit>;
  // For admin stats
  totalScans: number;
  totalPaid: number;
  totalRevenue: number;
}

const globalForStore = globalThis as unknown as { __auditStore: AuditStore };

export const auditStore: AuditStore = globalForStore.__auditStore || {
  audits: new Map(),
  totalScans: 0,
  totalPaid: 0,
  totalRevenue: 0,
};

if (process.env.NODE_ENV !== "production") {
  globalForStore.__auditStore = auditStore;
}

export function createAudit(id: string, url: string): StoredAudit {
  const domain = (() => {
    try {
      return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    } catch {
      return url;
    }
  })();

  const audit: StoredAudit = {
    id,
    url,
    domain,
    status: "QUEUED",
    createdAt: Date.now(),
  };

  auditStore.audits.set(id, audit);
  auditStore.totalScans++;
  return audit;
}

export function updateAudit(id: string, updates: Partial<StoredAudit>) {
  const audit = auditStore.audits.get(id);
  if (audit) {
    Object.assign(audit, updates);
  }
  return audit;
}

export function getAudit(id: string): StoredAudit | undefined {
  return auditStore.audits.get(id);
}

export function getAllAudits(limit = 50): StoredAudit[] {
  return Array.from(auditStore.audits.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function getAdminStats() {
  const audits = Array.from(auditStore.audits.values());
  const completed = audits.filter((a) => a.status === "COMPLETED");
  const failed = audits.filter((a) => a.status === "FAILED");
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, a) => sum + (a.result?.overallScore || 0), 0) /
            completed.length
        )
      : 0;

  return {
    totalUsers: 1, // anonymous user
    totalAudits: audits.length,
    completedAudits: completed.length,
    failedAudits: failed.length,
    avgScore,
    revenue: auditStore.totalRevenue,
    paidCount: auditStore.totalPaid,
    // Issue frequency for "popular issues"
    topIssues: computeTopIssues(audits),
  };
}

function computeTopIssues(audits: StoredAudit[]): Array<{ title: string; count: number }> {
  const issueCount = new Map<string, number>();
  for (const audit of audits) {
    if (!audit.result) continue;
    const categories = ["seo", "performance", "accessibility", "mobile", "security", "content", "conversion", "image", "links"];
    for (const cat of categories) {
      const issues = audit.result[cat]?.issues;
      if (Array.isArray(issues)) {
        for (const issue of issues) {
          const title = issue.title || "Unknown issue";
          issueCount.set(title, (issueCount.get(title) || 0) + 1);
        }
      }
    }
  }
  return Array.from(issueCount.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
