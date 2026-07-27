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
import { DashboardChartSummary } from "./DashboardChartSummary";
import { AttentionFeed } from "./attention-feed";
import { AtRiskWatchlist } from "./AtRiskWatchlist";
import { downloadDashboardReport } from "./download-report";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function Dashboard() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [days, setDays] = useState(7);
  const [selectedChart, setSelectedChart] = useState<"workload" | "revenue" | "sentiment" | "risk">("workload");

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
            onClick={() => {
              downloadDashboardReport(
                summaryData,
                { ticketVolume, revenueBySegment, churnDistribution, sentimentTrend },
                days
              );
              toast.success("Dashboard report downloaded.");
            }}
          >
            Download Report
          </Button>
        </div>
      </div>

      <KpiRow data={summaryData} isLoading={isSummaryLoading} />

      <LiveStatusStrip />

      {/* Single Dynamic Chart Section with Controls Layout (Days on Left, Dropdown on Right) */}
      <div className="space-y-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-md border-b border-border pb-md">
          <div>
            <h2 className="text-headline-sm font-bold text-foreground">Predictive Intelligence</h2>
            <p className="text-body-sm text-muted-foreground">Select a metric from the dropdown to view interactive AI forecasts and insights</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-sm">
            {/* Time Horizon Selector (on the left) */}
            {(selectedChart === "workload" || selectedChart === "revenue") && (
              <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      days === d
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            )}

            {/* Metric Dropdown Selector (on the right) */}
            <Select value={selectedChart} onValueChange={(val) => setSelectedChart(val as any)}>
              <SelectTrigger className="w-[200px] bg-card border-border text-foreground font-medium shadow-none cursor-pointer">
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workload" className="cursor-pointer">Workload Forecast</SelectItem>
                <SelectItem value="revenue" className="cursor-pointer">Revenue Segment</SelectItem>
                <SelectItem value="sentiment" className="cursor-pointer">Sentiment Analysis</SelectItem>
                <SelectItem value="risk" className="cursor-pointer">Churn Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Chart Display (2-Column Grid) */}
        {selectedChart === "workload" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg animate-in fade-in duration-200">
            <TicketVolumeForecastChart data={ticketVolume} isLoading={isForecastLoading} days={days} />
            <DashboardChartSummary type="workload" days={days} ticketVolume={ticketVolume} />
          </div>
        )}

        {selectedChart === "revenue" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg animate-in fade-in duration-200">
            <RevenueBySegmentChart data={revenueBySegment} isLoading={isForecastLoading} days={days} />
            <DashboardChartSummary type="revenue" days={days} revenueBySegment={revenueBySegment} />
          </div>
        )}

        {selectedChart === "sentiment" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg animate-in fade-in duration-200">
            <SentimentTrendChart data={sentimentTrend} isLoading={isForecastLoading} />
            <DashboardChartSummary type="sentiment" days={days} sentimentTrend={sentimentTrend} />
          </div>
        )}

        {selectedChart === "risk" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg animate-in fade-in duration-200">
            <ChurnDistributionChart data={churnDistribution} isLoading={isForecastLoading} />
            <DashboardChartSummary type="risk" days={days} churnDistribution={churnDistribution} />
          </div>
        )}
      </div>

      {/* Attention & Watchlist grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg items-stretch">
        <div className="xl:col-span-2 flex flex-col">
          <AtRiskWatchlist onShowToast={(msg) => toast.success(msg)} />
        </div>
        <div className="flex flex-col">
          <AttentionFeed />
        </div>
      </div>
    </div>
  );
}
