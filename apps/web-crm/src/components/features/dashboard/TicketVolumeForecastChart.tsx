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
  timestamp: string;
  value: number;
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
}

export function TicketVolumeForecastChart({ data, isLoading }: TicketVolumeForecastChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];

    const result: any[] = [];
    
    // Push historical
    data.historical_series.forEach((item) => {
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      result.push({
        date: dateStr,
        historical: item.value,
      });
    });

    // We can bridge the last historical and first forecast for a continuous line
    const lastHist = data.historical_series[data.historical_series.length - 1];

    // Push forecast
    data.forecast_series.forEach((item, idx) => {
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const upper = data.confidence_band_upper[idx]?.value ?? item.value;
      const lower = data.confidence_band_lower[idx]?.value ?? item.value;

      result.push({
        date: dateStr,
        forecast: item.value,
        confidenceRange: [lower, upper],
        // Bridge point for continuous visual flow
        historical: idx === 0 && lastHist ? lastHist.value : undefined,
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
            <CardTitle className="text-headline-sm font-bold text-foreground">Ticket Volume Forecast</CardTitle>
          </div>
          <CardDescription>7-day projected ticket load against capacity threshold</CardDescription>
        </CardHeader>
        <CardContent className="p-lg pt-md space-y-md">
          {data.alert_triggered && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive-foreground">
              <AlertCircle className="h-4 h-4 text-destructive" />
              <AlertTitle className="font-bold text-destructive">Capacity Alert</AlertTitle>
              <AlertDescription className="text-body-sm text-destructive-foreground/90">
                Forecasted ticket volume is projected to exceed the SLA capacity threshold of {data.threshold} tickets.
              </AlertDescription>
            </Alert>
          )}

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(var(--primary))" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="oklch(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(var(--card))",
                    borderColor: "oklch(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <ReferenceLine
                  y={data.threshold}
                  stroke="oklch(var(--destructive))"
                  strokeDasharray="4 4"
                  label={{
                    value: "SLA Threshold",
                    position: "top",
                    fill: "oklch(var(--destructive))",
                    fontSize: 9,
                    fontWeight: "bold",
                  }}
                />
                {/* Confidence Range Area */}
                <Area
                  type="monotone"
                  dataKey="confidenceRange"
                  stroke="none"
                  fill="oklch(var(--primary))"
                  fillOpacity={0.06}
                  name="Confidence Band"
                />
                {/* Historical Area */}
                <Area
                  type="monotone"
                  dataKey="historical"
                  stroke="oklch(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHist)"
                  name="Historical Volume"
                />
                {/* Forecast Area */}
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="oklch(var(--primary))"
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
