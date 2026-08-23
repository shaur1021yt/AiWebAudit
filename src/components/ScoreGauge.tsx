"use client";

import { useEffect, useState } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/audit/scorer";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  label?: string;
  showLabel?: boolean;
  animate?: boolean;
}

export function ScoreGauge({
  score,
  size = 180,
  label = "SiteAudit AI Score",
  showLabel = true,
  animate = true,
}: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const color = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  useEffect(() => {
    if (!animate) {
      setDisplayScore(score);
      return;
    }
    
    const duration = 1200;
    const startTime = Date.now();
    const start = 0;
    
    const animateScore = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(start + (score - start) * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animateScore);
      }
    };
    
    requestAnimationFrame(animateScore);
  }, [score, animate]);

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * displayScore) / 100;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={size > 120 ? 10 : 6}
            className="text-muted/50"
          />
          {/* Score arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={size > 120 ? 10 : 6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: animate ? "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ fontSize: size * 0.28, color }}
          >
            {displayScore}
          </span>
          <span
            className="text-muted-foreground font-medium"
            style={{ fontSize: size * 0.08 }}
          >
            / 100
          </span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold" style={{ color }}>
            {scoreLabel}
          </p>
        </div>
      )}
    </div>
  );
}
