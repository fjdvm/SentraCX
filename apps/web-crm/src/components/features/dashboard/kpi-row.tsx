"use client";

import React from "react";
import { Ticket, Clock, TrendingDown, DollarSign, Smile, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KpiCard } from "./kpi-card";
import { DashboardSummaryData, DashboardMetricWithDelta } from "@/hooks/useDashboardSummary";

interface KpiRowProps {
  data: DashboardSummaryData | null;
  isLoading: boolean;
}

export function KpiRow({ data, isLoading }: KpiRowProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="bg-card border-border rounded-xl flex flex-col justify-between shadow-none animate-pulse h-[140px]"
          >
            <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-sm p-lg">
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

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatClv = (val: number) => {
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(1)}k`;
    }
    return `$${val}`;
  };

  const formatCSAT = (val: number) => {
    if (val >= 4.0) return "Positive 😊";
    if (val >= 3.0) return "Neutral 😐";
    return "Negative 🙁";
  };

  const formatDelta = (delta: number, isPercent: boolean = false, isCurrency: boolean = false) => {
    const abs = Math.abs(delta);
    const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
    const prefix = isCurrency ? "$" : "";
    const suffix = isPercent ? "%" : "";

    if (delta === 0) return "Steady";

    if (isCurrency && abs >= 1000) {
      return `${sign}${prefix}${(abs / 1000).toFixed(1)}k`;
    }

    return `${sign}${prefix}${abs.toFixed(isPercent ? 1 : 0)}${suffix}`;
  };

  const defaultMetric: DashboardMetricWithDelta = {
    value: 0,
    delta: 0,
    trend: "flat",
  };

  const activeTickets = data.active_tickets ?? defaultMetric;
  const avgResolution = data.average_resolution_hours ?? defaultMetric;
  const churnRate = data.churn_rate ?? defaultMetric;
  const avgClv = data.average_clv ?? defaultMetric;
  const csat = data.customer_satisfaction ?? defaultMetric;
  const activeCampaigns = data.active_campaigns ?? defaultMetric;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
      <KpiCard
        label="Open Support Requests"
        value={activeTickets.value.toLocaleString()}
        change={formatDelta(activeTickets.delta)}
        trend={activeTickets.trend}
        icon={Ticket}
        isNegativeBad={false}
      />
      <KpiCard
        label="Avg Time to Resolve"
        value={formatHours(avgResolution.value)}
        change={formatDelta(avgResolution.delta, false, false)}
        trend={avgResolution.trend}
        icon={Clock}
        isNegativeBad={true}
      />
      <KpiCard
        label="Customers Leaving (%)"
        value={`${churnRate.value.toFixed(1)}%`}
        change={formatDelta(churnRate.delta, true)}
        trend={churnRate.trend}
        icon={TrendingDown}
        isNegativeBad={true}
      />
      {/* <KpiCard
         label="Avg Customer Value"
         value={formatClv(avgClv.value)}
         change={formatDelta(avgClv.delta, false, true)}
         trend={avgClv.trend}
         icon={DollarSign}
         isNegativeBad={false}
      /> */}
      <KpiCard
        label="Customer Mood"
        value={formatCSAT(csat.value)}
        change={formatDelta(csat.delta, true)}
        trend={csat.trend}
        icon={Smile}
        isNegativeBad={false}
      />
      {/* <KpiCard
        label="Running Promotions"
        value={activeCampaigns.value.toLocaleString()}
        change={formatDelta(activeCampaigns.delta)}
        trend={activeCampaigns.trend}
        icon={Megaphone}
        isNegativeBad={false}
      /> */}
    </div>
  );
}
