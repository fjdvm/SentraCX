"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useDashboardForecasts } from "@/hooks/useDashboardForecasts";
import { KpiRow } from "./kpi-row";
import { LiveStatusStrip } from "./live-status-strip";
import { TicketVolumeForecastChart } from "./TicketVolumeForecastChart";
import { RevenueBySegmentChart } from "./RevenueBySegmentChart";
import { ChurnDistributionChart } from "./ChurnDistributionChart";
import { SentimentTrendChart } from "./SentimentTrendChart";
import { AttentionFeed } from "./attention-feed";
import { AtRiskWatchlist } from "./AtRiskWatchlist";
import { AskSentraCXPanel } from "./ask-sentracx-panel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function Dashboard() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [days, setDays] = useState(7);

  const { data: summaryData, isLoading: isSummaryLoading } = useDashboardSummary(
    fromDate ? new Date(fromDate).toISOString() : undefined,
    toDate ? new Date(toDate).toISOString() : undefined
  );

  const {
    ticketVolume,
    revenueBySegment,
    churnDistribution,
    sentimentTrend,
    isLoading: isForecastLoading,
  } = useDashboardForecasts(days);

  return (
    <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-2xl animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md border-b border-border pb-lg">
        <div className="space-y-sm">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-sm">
          <div className="flex items-center gap-xs">
            <input
              type="date"
              className="text-body-sm px-xs py-1.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:border-primary"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-muted-foreground text-body-sm">to</span>
            <input
              type="date"
              className="text-body-sm px-xs py-1.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:border-primary"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => toast.success("Downloading CSV reports...")}
          >
            Download Report
          </Button>
        </div>
      </div>

      <KpiRow data={summaryData} isLoading={isSummaryLoading} />

      <LiveStatusStrip />

      {/* Charts Grid */}
      <div className="space-y-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md border-b border-border pb-md">
          <div>
            <h2 className="text-headline-sm font-bold text-foreground">Predictive & Forecast Intelligence</h2>
            <p className="text-body-sm text-muted-foreground">AI projected workloads, sentiment and financial metrics</p>
          </div>
          <div>
            <Tabs
              value={days.toString()}
              onValueChange={(val) => setDays(parseInt(val, 10))}
              className="w-auto"
            >
              <TabsList className="grid grid-cols-3 w-[240px]">
                <TabsTrigger value="7">7 Days</TabsTrigger>
                <TabsTrigger value="14">14 Days</TabsTrigger>
                <TabsTrigger value="30">30 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          <TicketVolumeForecastChart data={ticketVolume} isLoading={isForecastLoading} days={days} />
          <RevenueBySegmentChart data={revenueBySegment} isLoading={isForecastLoading} days={days} />
          <ChurnDistributionChart data={churnDistribution} isLoading={isForecastLoading} />
          <SentimentTrendChart data={sentimentTrend} isLoading={isForecastLoading} />
        </div>
      </div>

      {/* Attention & Watchlist grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        <div className="xl:col-span-2">
          <AtRiskWatchlist onShowToast={(msg) => toast.success(msg)} />
        </div>
        <div>
          <AttentionFeed />
        </div>
      </div>

      {/* Floating FAB Ask SentraCX panel */}
      <AskSentraCXPanel />
    </div>
  );
}
