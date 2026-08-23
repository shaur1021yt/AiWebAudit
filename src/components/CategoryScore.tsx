"use client";

import { useEffect, useState } from "react";
import { getScoreColor } from "@/lib/audit/scorer";

interface CategoryScoreProps {
  name: string;
  icon: string;
  score: number;
  issueCount: number;
  delay?: number;
}

export function CategoryScore({ name, icon, score, issueCount, delay = 0 }: CategoryScoreProps) {
  const [visible, setVisible] = useState(false);
  const color = getScoreColor(score);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className="text-sm font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${score}%`,
              backgroundColor: color,
              transitionDelay: `${delay}ms`,
            }}
          />
        </div>
        {issueCount > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {issueCount} issue{issueCount > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
