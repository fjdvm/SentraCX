"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Landmark } from "lucide-react";

interface ForecastPoint {
  timestamp?: string;
  date?: string;
  value?: number;
  revenue?: number;
}

interface RevenueForecastData {
  forecast_series: ForecastPoint[];
  by_segment: Record<string, number>;
  total_projected: number;
  confidence: number;
}

interface RevenueBySegmentChartProps {
  data: RevenueForecastData | null;
  isLoading: boolean;
  days?: number;
}

const SEGMENT_COLORS: Record<string, string> = {
  "High-Value": "var(--info)",
  "Regular": "var(--success)",
  "New": "var(--warning)",
  "At-Risk": "oklch(0.62 0.18 45)",
};

const getSegmentColor = (seg: string, idx: number) =>
  SEGMENT_COLORS[seg] ?? ["var(--primary)", "var(--success)", "var(--warning)", "var(--info)"][idx % 4];

export function RevenueBySegmentChart({ data, isLoading, days = 7 }: RevenueBySegmentChartProps) {
  const chartData = useMemo(() => {
    if (!data?.forecast_series) return [];
    return data.forecast_series.map((item) => {
      const raw = item.date ?? item.timestamp;
      const dateStr = raw
        ? isNaN(new Date(raw).getTime())
          ? raw
          : new Date(raw).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "";
      return { date: dateStr, Revenue: item.revenue ?? item.value ?? 0 };
    });
  }, [data]);

  const segmentEntries = useMemo(() => {
    if (!data?.by_segment) return [];
    const total = Object.values(data.by_segment).reduce((a, b) => a + b, 0);
    return Object.entries(data.by_segment).map(([name, val]) => ({
      name,
      value: val,
      pct: total > 0 ? Math.round((val / total) * 100) : 0,
    }));
  }, [data]);

  if (isLoading || !data) {
    return (
      <Card className="bg-card border-border shadow-none h-[380px] animate-pulse">
        <CardHeader className="p-lg">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded mt-sm" />
        </CardHeader>
        <CardContent className="h-[260px] flex items-center justify-center">
          <div className="text-muted-foreground text-body-sm">Loading Forecast...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-none flex flex-col justify-between h-full">
      <div>
        <CardHeader className="p-lg pb-0">
          <div className="flex items-center gap-sm">
            <Landmark className="w-5 h-5 text-primary" />
            <CardTitle className="text-headline-sm font-bold text-foreground">
              Expected Revenue
            </CardTitle>
          </div>
          <CardDescription>Estimated Monthly Recurring Revenue (MRR)</CardDescription>
        </CardHeader>
        <CardContent className="p-lg pt-md space-y-md">
          {/* Total projected + confidence */}
          <div className="bg-muted/30 border border-border/60 rounded-xl p-md flex items-center justify-between gap-md">
            <div className="flex items-center gap-sm">
              <div className="p-sm bg-success/10 rounded-lg text-[#10B981]">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Total Projected Revenue
                </span>
                <span className="text-headline-sm font-bold text-foreground">
                  ${(data.total_projected ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Model Confidence
              </span>
              <span className="text-body-md font-bold text-[#10B981]">
                {((data.confidence ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Revenue trajectory forecast line */}
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, "Revenue"]}
                />
                <Line
                  type="monotone"
                  dataKey="Revenue"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Segment breakdown — scalar totals rendered as proportional bars */}
          {segmentEntries.length > 0 && (
            <div className="space-y-xs pt-xs border-t border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                By Segment
              </span>
              {segmentEntries.map((seg, idx) => (
                <div key={seg.name} className="flex items-center gap-sm">
                  <span className="text-[11px] text-muted-foreground w-20 truncate shrink-0">
                    {seg.name}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${seg.pct}%`,
                        backgroundColor: getSegmentColor(seg.name, idx),
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground w-8 text-right shrink-0">
                    {seg.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
