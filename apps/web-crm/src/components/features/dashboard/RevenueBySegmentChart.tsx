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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Landmark } from "lucide-react";

interface SegmentSeriesItem {
  timestamp: string;
  value: number;
}

interface RevenueForecastData {
  forecast_series: SegmentSeriesItem[];
  by_segment: Record<string, SegmentSeriesItem[]>;
  total_projected: number;
  confidence: number;
}

interface RevenueBySegmentChartProps {
  data: RevenueForecastData | null;
  isLoading: boolean;
  days?: number;
}

export function RevenueBySegmentChart({ data, isLoading, days = 7 }: RevenueBySegmentChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];

    return data.forecast_series.map((item, idx) => {
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const pt: any = {
        date: dateStr,
        Total: item.value,
      };

      Object.entries(data.by_segment).forEach(([segment, series]) => {
        pt[segment] = series[idx]?.value ?? 0;
      });

      return pt;
    });
  }, [data]);

  const segments = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.by_segment);
  }, [data]);

  const segmentColors: Record<string, string> = {
    "Total": "oklch(var(--primary))",
    "High-Value": "oklch(var(--info))",
    "Regular": "oklch(var(--success))",
    "New": "oklch(var(--warning))",
    "At-Risk": "oklch(0.62 0.18 45)", // Orange-brown instead of destructive red
  };

  const getSegmentColor = (segment: string) => {
    return segmentColors[segment] ?? "oklch(var(--muted-foreground))";
  };

  if (isLoading || !data) {
    return (
      <Card className="bg-card border-border shadow-none h-[380px] animate-pulse">
        <CardHeader className="p-lg">
          <div className="h-6 w-48 bg-muted rounded"></div>
          <div className="h-4 w-64 bg-muted rounded mt-sm"></div>
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
            <CardTitle className="text-headline-sm font-bold text-foreground">Expected Revenue</CardTitle>
          </div>
          <CardDescription>Estimated Monthly Recurring Revenue (MRR)</CardDescription>
        </CardHeader>
        <CardContent className="p-lg pt-md space-y-md">
          <div className="bg-muted/30 border border-border/60 rounded-xl p-md flex items-center justify-between gap-md">
            <div className="flex items-center gap-sm">
              <div className="p-2 bg-success/10 rounded-lg text-[#10B981]">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Total Projected Revenue
                </span>
                <span className="text-headline-sm font-bold text-foreground">
                  ${data.total_projected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Model Confidence
              </span>
              <span className="text-body-md font-bold text-[#10B981]">
                {(data.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border) / 0.5)" />
                <XAxis
                  dataKey="date"
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(var(--card))",
                    borderColor: "oklch(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, ""]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px", marginTop: "10px" }}
                />
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke={getSegmentColor("Total")}
                  strokeWidth={3}
                  dot={false}
                  name="Total Projected"
                />
                {segments.map((segment) => (
                  <Line
                    key={segment}
                    type="monotone"
                    dataKey={segment}
                    stroke={getSegmentColor(segment)}
                    strokeWidth={1.5}
                    dot={false}
                    name={segment}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
