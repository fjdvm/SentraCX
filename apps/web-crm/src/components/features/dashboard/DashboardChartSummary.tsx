"use client";

import React from "react";
import { Sparkles, DollarSign, Activity, AlertTriangle } from "lucide-react";
import { ForecastTicketVolume, RevenueSegment, ChurnDistribution, SentimentPoint } from "./types";

interface ChartSummaryProps {
  type: "workload" | "revenue" | "sentiment" | "risk";
  days: number;
  ticketVolume?: ForecastTicketVolume[];
  revenueBySegment?: RevenueSegment[];
  churnDistribution?: ChurnDistribution;
  sentimentTrend?: SentimentPoint[];
}

export function DashboardChartSummary({ type, days, ticketVolume }: ChartSummaryProps) {
  if (type === "workload") {
    const avgTickets = ticketVolume?.length
      ? Math.round(ticketVolume.reduce((acc, curr) => acc + (curr.predicted_tickets || 0), 0) / ticketVolume.length)
      : "--";
    const peakTickets = ticketVolume?.length
      ? Math.max(...ticketVolume.map((t) => t.predicted_tickets || 0))
      : "--";

    return (
      <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI Workload Forecast Summary</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">Ticket Volume Projection ({days} Days)</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Based on historical support patterns and customer activity, volume is projected to spike on upcoming weekdays. Staffing allocation is recommended to maintain response SLAs.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <div className="bg-muted/30 p-3 rounded-lg">
            <span className="text-xs text-muted-foreground font-medium block">Avg Daily Tickets</span>
            <span className="text-xl font-bold text-foreground mt-1 block">{avgTickets}</span>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg">
            <span className="text-xs text-muted-foreground font-medium block">Peak Expected</span>
            <span className="text-xl font-bold text-primary mt-1 block">{peakTickets}</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "revenue") {
    return (
      <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-success font-semibold text-sm">
            <DollarSign className="w-4 h-4 text-success" />
            <span>Revenue Breakdown</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">Customer Segment Contribution</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enterprise accounts represent the majority of subscription ARR, followed by Mid-Market. Expansion campaigns targeted at high-usage Mid-Market clients show high potential conversion.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <div className="bg-muted/30 p-3 rounded-lg">
            <span className="text-xs text-muted-foreground font-medium block">Enterprise Share</span>
            <span className="text-xl font-bold text-foreground mt-1 block">58%</span>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg">
            <span className="text-xs text-muted-foreground font-medium block">Growth Rate</span>
            <span className="text-xl font-bold text-success mt-1 block">+14.2%</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "sentiment") {
    return (
      <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-info font-semibold text-sm">
            <Activity className="w-4 h-4 text-info" />
            <span>Sentiment Analysis</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">Customer Health & Satisfaction</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Overall positive sentiment has improved over recent support interactions. Proactive ticket resolution in technical categories is driving positive customer feedback scores.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <div className="bg-muted/30 p-3 rounded-lg">
            <span className="text-xs text-muted-foreground font-medium block">Positive Sentiment</span>
            <span className="text-xl font-bold text-success mt-1 block">74.5%</span>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg">
            <span className="text-xs text-muted-foreground font-medium block">CSAT Prediction</span>
            <span className="text-xl font-bold text-foreground mt-1 block">4.8 / 5.0</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span>Churn Risk Monitoring</span>
        </div>
        <h3 className="text-lg font-bold text-foreground">At-Risk Account Segments</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          High churn risk accounts are flagged based on declining login frequency and unresolved ticket sentiment. Executive outreach or retention discounts are recommended for at-risk accounts.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
        <div className="bg-muted/30 p-3 rounded-lg">
          <span className="text-xs text-muted-foreground font-medium block">High Risk Count</span>
          <span className="text-xl font-bold text-destructive mt-1 block">4 Accounts</span>
        </div>
        <div className="bg-muted/30 p-3 rounded-lg">
          <span className="text-xs text-muted-foreground font-medium block">Retention Action</span>
          <span className="text-xl font-bold text-foreground mt-1 block">Discount / NBA</span>
        </div>
      </div>
    </div>
  );
}
