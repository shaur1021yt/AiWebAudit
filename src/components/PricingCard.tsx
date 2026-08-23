"use client";

import { Check } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: number;
  interval: "one-time" | "month";
  description: string;
  features: string[];
  popular?: boolean;
  cta?: string;
  onSelect?: () => void;
}

export function PricingCard({
  name,
  price,
  interval,
  description,
  features,
  popular = false,
  cta = "Get Started",
  onSelect,
}: PricingCardProps) {
  return (
    <div
      className={`relative rounded-xl border p-6 flex flex-col ${
        popular
          ? "border-primary/50 bg-card shadow-lg shadow-primary/5"
          : "border-border/50 bg-card"
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">${price}</span>
        <span className="text-muted-foreground text-sm ml-1">
          {interval === "month" ? "/month" : "one-time"}
        </span>
      </div>

      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
          popular
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-foreground hover:bg-muted/80"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
