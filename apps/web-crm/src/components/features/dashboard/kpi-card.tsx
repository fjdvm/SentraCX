"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "flat";
  icon: LucideIcon;
  isNegativeBad: boolean; // if true, up is bad (e.g., churn), down is good. If false, up is good, down is bad.
}

export function KpiCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  isNegativeBad,
}: KpiCardProps) {
  let TrendIcon = Minus;
  let trendColor = "text-muted-foreground";

  if (trend === "up") {
    TrendIcon = ArrowUpRight;
    trendColor = isNegativeBad ? "text-metric-negative" : "text-metric-positive";
  } else if (trend === "down") {
    TrendIcon = ArrowDownRight;
    trendColor = isNegativeBad ? "text-metric-positive" : "text-metric-negative";
  }

  return (
    <Card className="bg-card border-border rounded-xl flex flex-col justify-between transition-all hover:border-primary/80 duration-300 shadow-none animate-in fade-in h-[140px]">
      <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-sm p-lg">
        <span className="text-label-sm text-muted-foreground font-semibold uppercase tracking-wider">
          {label}
        </span>
        <div className="p-sm bg-muted rounded-lg">
          <Icon className="w-4 h-4 text-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-lg pt-0">
        <span className="text-headline-sm font-bold text-foreground block">
          {value}
        </span>
        <div className="flex items-center gap-xs mt-xs text-body-sm">
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
          <span className={`${trendColor} font-medium`}>
            {change}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
