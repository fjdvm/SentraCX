"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp } from "lucide-react";

interface SeriesItem {
  timestamp?: string;
  date?: string;
  value?: number;
  count?: number;
}

interface TicketVolumeForecastData {
  historical_series: SeriesItem[];
  forecast_series: SeriesItem[];
  confidence_band_upper: SeriesItem[];
  confidence_band_lower: SeriesItem[];
  threshold: number;
  alert_triggered: boolean;
}

interface TicketVolumeForecastChartProps {
  data: TicketVolumeForecastData | null;
  isLoading: boolean;
  days?: number;
}

export function TicketVolumeForecastChart({ data, isLoading, days = 7 }: TicketVolumeForecastChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];

    const result: any[] = [];
    const getItemDate = (item: SeriesItem) => {
      const raw = item.date || item.timestamp;
      if (!raw) return "";
      const d = new Date(raw);
      return isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };
    const getItemVal = (item?: SeriesItem) => item?.count ?? item?.value ?? 0;

    data.historical_series?.forEach((item) => {
      result.push({
        date: getItemDate(item),
        historical: getItemVal(item),
      });
    });

    const lastHist = data.historical_series?.[data.historical_series.length - 1];

    data.forecast_series?.forEach((item, idx) => {
      const val = getItemVal(item);
      const upper = getItemVal(data.confidence_band_upper?.[idx]) || val;
      const lower = getItemVal(data.confidence_band_lower?.[idx]) || val;

      result.push({
        date: getItemDate(item),
        forecast: val,
        confidenceRange: [lower, upper],
        historical: idx === 0 && lastHist ? getItemVal(lastHist) : undefined,
      });
    });

    return result;
  }, [data]);

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
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-headline-sm font-bold text-foreground">Expected Support Requests</CardTitle>
          </div>
          <CardDescription>Predictive workload analysis for next {days} days</CardDescription>
        </CardHeader>
        <CardContent className="p-lg pt-md space-y-md">
          {data.alert_triggered && (
            <Alert className="bg-warning/10 border-warning/30 text-warning-foreground">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertTitle className="font-bold text-warning">Capacity Alert</AlertTitle>
              <AlertDescription className="text-body-sm text-warning-foreground/90">
                Forecasted ticket volume is projected to exceed the SLA capacity threshold of {data.threshold} tickets.
              </AlertDescription>
            </Alert>
          )}

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <ReferenceLine
                  y={data.threshold}
                  stroke="var(--warning)"
                  strokeDasharray="4 4"
                  label={{
                    value: "SLA Threshold",
                    position: "top",
                    fill: "var(--warning-foreground)",
                    fontSize: 9,
                    fontWeight: "bold",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="confidenceRange"
                  stroke="none"
                  fill="var(--primary)"
                  fillOpacity={0.06}
                  name="Confidence Band"
                />
                <Area
                  type="monotone"
                  dataKey="historical"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHist)"
                  name="Historical Volume"
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorFc)"
                  name="Projected Volume"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
