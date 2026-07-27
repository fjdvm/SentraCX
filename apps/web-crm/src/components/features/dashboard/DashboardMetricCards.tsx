"use client";

import React from "react";
import {
  Ticket,
  Clock,
  TrendingDown,
  TrendingUp,
  Smile,
  DollarSign,
  Megaphone,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DashboardSummaryData } from "@/hooks/useDashboardSummary";

interface DashboardMetricCardsProps {
  data: DashboardSummaryData | null;
  isLoading: boolean;
}

export function DashboardMetricCards({ data, isLoading }: DashboardMetricCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-md">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card
            key={i}
            className="bg-card border-border rounded-xl flex flex-col justify-between shadow-none animate-pulse h-[140px]"
          >
            <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-2 p-lg">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="w-8 h-8 bg-muted rounded-lg"></div>
            </CardHeader>
            <CardContent className="p-lg pt-0">
              <div className="h-8 w-16 bg-muted rounded mb-sm"></div>
              <div className="h-4 w-28 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatValue = (key: keyof DashboardSummaryData, val: number) => {
    switch (key) {
      case "churn_rate":
        return `${val.toFixed(1)}%`;
      case "average_clv":
        return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      case "customer_satisfaction":
        return `${val.toFixed(1)}/5`;
      case "average_resolution_hours":
        return `${val.toFixed(1)}h`;
      default:
        return val.toString();
    }
  };

  const formatDelta = (delta: number, key: keyof DashboardSummaryData) => {
    const abs = Math.abs(delta);
    const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
    
    switch (key) {
      case "churn_rate":
        return `${sign}${abs.toFixed(1)}% vs last period`;
      case "average_clv":
        return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })} vs last period`;
      case "customer_satisfaction":
        return `${sign}${abs.toFixed(1)} vs last period`;
      case "average_resolution_hours":
        return `${sign}${abs.toFixed(1)}h vs last period`;
      default:
        return `${sign}${abs} vs last period`;
    }
  };

  const cardsList = [
    {
      key: "active_tickets" as const,
      name: "Active Tickets",
      value: formatValue("active_tickets", data.active_tickets.value),
      change: formatDelta(data.active_tickets.delta, "active_tickets"),
      trend: data.active_tickets.trend,
      icon: Ticket,
    },
    {
      key: "average_resolution_hours" as const,
      name: "Avg Resolution Time",
      value: formatValue("average_resolution_hours", data.average_resolution_hours.value),
      change: formatDelta(data.average_resolution_hours.delta, "average_resolution_hours"),
      trend: data.average_resolution_hours.trend,
      icon: Clock,
    },
    {
      key: "churn_rate" as const,
      name: "Churn Rate",
      value: formatValue("churn_rate", data.churn_rate.value),
      change: formatDelta(data.churn_rate.delta, "churn_rate"),
      trend: data.churn_rate.trend,
      icon: TrendingDown,
    },
    {
      key: "average_clv" as const,
      name: "Avg Customer Value",
      value: formatValue("average_clv", data.average_clv.value),
      change: formatDelta(data.average_clv.delta, "average_clv"),
      trend: data.average_clv.trend,
      icon: DollarSign,
    },
    {
      key: "customer_satisfaction" as const,
      name: "Customer CSAT",
      value: formatValue("customer_satisfaction", data.customer_satisfaction.value),
      change: formatDelta(data.customer_satisfaction.delta, "customer_satisfaction"),
      trend: data.customer_satisfaction.trend,
      icon: Smile,
    },
    {
      key: "active_campaigns" as const,
      name: "Active Campaigns",
      value: formatValue("active_campaigns", data.active_campaigns.value),
      change: formatDelta(data.active_campaigns.delta, "active_campaigns"),
      trend: data.active_campaigns.trend,
      icon: Megaphone,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-md">
      {cardsList.map((card) => {
        const Icon = card.icon;
        
        let TrendIcon = Minus;
        let trendColor = "text-muted-foreground";
        
        if (card.trend === "up") {
          TrendIcon = ArrowUpRight;
          trendColor = card.key === "churn_rate" || card.key === "average_resolution_hours" ? "text-destructive" : "text-success";
        } else if (card.trend === "down") {
          TrendIcon = ArrowDownRight;
          trendColor = card.key === "churn_rate" || card.key === "average_resolution_hours" ? "text-success" : "text-destructive";
        }

        return (
          <Card
            key={card.name}
            className="bg-card border-border rounded-xl flex flex-col justify-between transition-all hover:border-primary/80 duration-300 shadow-none animate-in fade-in"
          >
            <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-2 p-lg">
              <span className="text-label-sm text-muted-foreground font-medium uppercase tracking-wider">
                {card.name}
              </span>
              <div className="p-2 bg-muted rounded-lg">
                <Icon className="w-4 h-4 text-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-lg pt-0">
              <span className="text-headline-sm font-bold text-foreground block">
                {card.value}
              </span>
              <div className="flex items-center gap-xs mt-xs text-body-sm">
                <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
                <span className={`${trendColor} font-medium`}>
                  {card.change}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
