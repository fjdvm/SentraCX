"use client";

import React from "react";
import { Sparkles, DollarSign, Activity, AlertTriangle } from "lucide-react";

interface ForecastPoint {
  date?: string;
  count?: number;
  predicted_tickets?: number;
  score?: number;
  [key: string]: any;
}

interface ChurnDist {
  low?: number;
  medium?: number;
  high?: number;
  critical?: number;
  [key: string]: any;
}

interface RevenueForecast {
  by_segment?: Record<string, number>;
  total_projected?: number;
  confidence?: number;
  forecast_series?: Array<{ revenue?: number; value?: number }>;
  [key: string]: any;
}

interface ChartSummaryProps {
  type: "workload" | "revenue" | "sentiment" | "risk";
  days: number;
  ticketVolume?: any;
  revenueBySegment?: RevenueForecast | null;
  churnDistribution?: ChurnDist | null;
  sentimentTrend?: any;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/30 p-3 rounded-lg">
      <span className="text-xs text-muted-foreground font-medium block">{label}</span>
      <span className="text-xl font-bold text-foreground mt-1 block">{value}</span>
    </div>
  );
}

export function DashboardChartSummary({
  type,
  days,
  ticketVolume,
  revenueBySegment,
  churnDistribution,
  sentimentTrend,
}: ChartSummaryProps) {
  if (type === "workload") {
    const series: ForecastPoint[] = ticketVolume?.forecast_series ?? [];
    const counts = series.map((p) => p.count ?? p.predicted_tickets ?? 0);
    const avg = counts.length
      ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length)
      : "--";
    const peak = counts.length ? Math.max(...counts) : "--";

    return (
      <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI Workload Forecast Summary</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Ticket Volume Projection ({days} Days)
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Based on historical support patterns, volume is projected for the next {days} days.
            Staffing allocation is recommended to maintain response SLAs.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <StatBox label="Avg Daily Tickets" value={avg} />
          <StatBox label="Peak Expected" value={peak} />
        </div>
      </div>
    );
  }

  if (type === "revenue") {
    const segments = revenueBySegment?.by_segment ?? {};
    const segmentEntries = Object.entries(segments);
    const total = revenueBySegment?.total_projected ?? 0;
    const topSegment = segmentEntries.length
      ? segmentEntries.reduce((a, b) => (a[1] > b[1] ? a : b))
      : null;
    const topPct =
      topSegment && total > 0
        ? `${Math.round((topSegment[1] / total) * 100)}%`
        : "--";
    const confidence = revenueBySegment?.confidence
      ? `${Math.round((revenueBySegment.confidence ?? 0) * 100)}%`
      : "--";

    return (
      <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-success font-semibold text-sm">
            <DollarSign className="w-4 h-4 text-success" />
            <span>Revenue Breakdown</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Customer Segment Contribution
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {topSegment
              ? `${topSegment[0]} accounts represent the largest segment at ${topPct} of projected revenue.`
              : "Segment revenue data is being computed from customer CLV profiles."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <StatBox
            label={topSegment ? `${topSegment[0]} Share` : "Top Segment"}
            value={topPct}
          />
          <StatBox label="Model Confidence" value={confidence} />
        </div>
      </div>
    );
  }

  if (type === "sentiment") {
    const daily: ForecastPoint[] = sentimentTrend?.daily_scores ?? [];
    const scores = daily.map((p) => p.score ?? 0).filter(Boolean);
    const avgScore = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
    const positivePct = scores.length
      ? `${Math.round((scores.filter((s) => s > 0).length / scores.length) * 100)}%`
      : "--";
    const csatPrediction =
      avgScore !== 0
        ? `${((avgScore + 1.0) * 2.0 + 1.0).toFixed(1)} / 5.0`
        : "--";

    return (
      <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-info font-semibold text-sm">
            <Activity className="w-4 h-4 text-info" />
            <span>Sentiment Analysis</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Customer Health & Satisfaction
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sentiment scores are derived from analyzed conversation transcripts.
            Positive interactions drive higher CSAT and lower churn risk.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
          <StatBox label="Positive Sentiment" value={positivePct} />
          <StatBox label="CSAT Prediction" value={csatPrediction} />
        </div>
      </div>
    );
  }

  // "risk" panel
  const highCount = (churnDistribution?.high ?? 0) + (churnDistribution?.critical ?? 0);
  const criticalCount = churnDistribution?.critical ?? 0;

  return (
    <div className="bg-card border border-border p-6 rounded-xl space-y-4 flex flex-col justify-between shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span>Churn Risk Monitoring</span>
        </div>
        <h3 className="text-lg font-bold text-foreground">At-Risk Account Segments</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          High churn risk accounts are flagged based on declining engagement and unresolved
          ticket sentiment. Executive outreach or retention discounts are recommended.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
        <StatBox
          label="High Risk Count"
          value={highCount > 0 ? `${highCount} Accounts` : "--"}
        />
        <StatBox
          label="Critical Accounts"
          value={criticalCount > 0 ? `${criticalCount} Accounts` : "--"}
        />
      </div>
    </div>
  );
}
