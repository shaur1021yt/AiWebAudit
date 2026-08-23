"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";

interface ScanStep {
  step: string;
  message: string;
  completed: boolean;
  error?: boolean;
}

interface ScanProgressProps {
  progress: ScanStep[];
  url: string;
}

export function ScanProgress({ progress, url }: ScanProgressProps) {
  const completedCount = progress.filter((p) => p.completed && !p.error).length;
  const totalCount = progress.length;
  const currentStep = progress.find((p) => !p.completed && !p.error);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-muted-foreground mb-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Scanning</span>
        </div>
        <p className="text-lg font-medium truncate max-w-md mx-auto text-muted-foreground">
          {url}
        </p>
        <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden max-w-md mx-auto">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completedCount} of {totalCount} checks complete
        </p>
      </div>

      <div className="space-y-2">
        {progress.map((item, index) => (
          <div
            key={item.step}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
              item.completed && !item.error
                ? "bg-muted/50"
                : item.error
                  ? "bg-red-50 dark:bg-red-950/20"
                  : currentStep?.step === item.step
                    ? "bg-primary/5 border border-primary/20"
                    : "opacity-40"
            }`}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {item.completed && !item.error ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            ) : item.error ? (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : currentStep?.step === item.step ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/20 shrink-0" />
            )}
            <span className={`text-sm ${
              item.completed && !item.error
                ? "text-muted-foreground"
                : item.error
                  ? "text-red-600 dark:text-red-400"
                  : currentStep?.step === item.step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
            }`}>
              {item.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
