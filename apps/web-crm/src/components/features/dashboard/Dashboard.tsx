"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { DashboardMetricCards } from "./DashboardMetricCards";
import { LiveMetricsBar } from "./LiveMetricsBar";
import { DashboardAnomalies } from "./DashboardAnomalies";
import { AtRiskWatchlist } from "./AtRiskWatchlist";
import { DashboardNLQuery } from "./DashboardNLQuery";
import { ForecastSection } from "./ForecastSection";
import { RecentTicketsList } from "./RecentTicketsList";
import { DashboardQuickOps } from "./DashboardQuickOps";
import type { TicketType } from "./types";

export function Dashboard() {
  const [tickets, setTickets] = useState<TicketType[]>([
    { id: "TCK-1024", customer: "Olivia Vance", issue: "API Integration Error", priority: "High", time: "10 mins ago" },
    { id: "TCK-1023", customer: "Jackson Reed", issue: "Billing Query & Refund", priority: "Medium", time: "45 mins ago" },
    { id: "TCK-1022", customer: "Amara Okoro", issue: "Account Lockout", priority: "High", time: "1 hour ago" },
    { id: "TCK-1021", customer: "Liam Anderson", issue: "Feature Request: Export PDF", priority: "Low", time: "3 hours ago" },
  ]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data: summaryData, isLoading: isSummaryLoading } = useDashboardSummary(
    fromDate ? new Date(fromDate).toISOString() : undefined,
    toDate ? new Date(toDate).toISOString() : undefined
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateTicket = (newTicket: TicketType) => {
    setTickets((prev) => [newTicket, ...prev]);
  };

  return (
    <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-2xl">
      {toastMsg && (
        <div className="fixed bottom-20 right-6 md:right-10 bg-primary text-primary-foreground px-lg py-sm rounded-lg text-body-sm font-medium z-[100] shadow-md border border-border animate-in fade-in slide-in-from-bottom-5 duration-300">
          {toastMsg}
        </div>
      )}

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
            onClick={() => showToast("Downloading CSV reports...")}
          >
            Download Report
          </Button>
        </div>
      </div>

      <LiveMetricsBar />

      <DashboardMetricCards data={summaryData} isLoading={isSummaryLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        <div className="xl:col-span-2">
          <AtRiskWatchlist onShowToast={showToast} />
        </div>
        <div>
          <DashboardAnomalies />
        </div>
      </div>

      <ForecastSection />

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-lg">
        <div className="lg:col-span-4">
          <DashboardNLQuery />
        </div>
        <div className="lg:col-span-3">
          <RecentTicketsList tickets={tickets} />
        </div>
      </div>

      <DashboardQuickOps onCreateTicket={handleCreateTicket} onShowToast={showToast} />
    </div>
  );
}
