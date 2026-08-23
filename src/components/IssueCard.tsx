"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Issue } from "@/lib/audit/types";

const severityConfig = {
  critical: { label: "Critical", color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30" },
  high: { label: "High", color: "bg-orange-500", textColor: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  medium: { label: "Medium", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  low: { label: "Low", color: "bg-yellow-500", textColor: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-50 dark:bg-yellow-950/30" },
  info: { label: "Info", color: "bg-stone-400", textColor: "text-stone-600 dark:text-stone-400", bgColor: "bg-stone-50 dark:bg-stone-950/30" },
};

interface IssueCardProps {
  issue: Issue;
  locked?: boolean;
  index?: number;
}

export function IssueCard({ issue, locked = false, index = 0 }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[issue.severity];

  if (locked) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card p-4 opacity-50">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <span className="text-sm font-medium">{issue.title}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.bgColor} ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/80 to-background flex items-center justify-end pr-4">
          <span className="text-xs text-muted-foreground font-medium">🔒 Full report</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-border/50 bg-card transition-all duration-300 ${
        expanded ? "shadow-md" : "hover:shadow-sm"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center gap-3"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${config.color}`} />
        <span className="text-sm font-medium flex-1">{issue.title}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${config.bgColor} ${config.textColor}`}>
          {config.label}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">What we found</h4>
            <p className="text-sm">{issue.description}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Why it matters</h4>
            <p className="text-sm text-muted-foreground">{issue.whyItMatters}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">How to fix</h4>
            <p className="text-sm">{issue.howToFix}</p>
          </div>
          {issue.technicalDetails && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Technical details</h4>
              <p className="text-sm font-mono text-muted-foreground bg-muted p-2 rounded text-xs">
                {issue.technicalDetails}
              </p>
            </div>
          )}
          {issue.affectedPages && issue.affectedPages.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Affected pages</h4>
              <ul className="text-xs space-y-0.5">
                {issue.affectedPages.slice(0, 5).map((page, i) => (
                  <li key={i} className="text-muted-foreground font-mono truncate">{page}</li>
                ))}
                {issue.affectedPages.length > 5 && (
                  <li className="text-muted-foreground">+{issue.affectedPages.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
          {issue.estimatedImpact && (
            <div className="text-xs text-muted-foreground italic">Impact: {issue.estimatedImpact}</div>
          )}
        </div>
      )}
    </div>
  );
}
