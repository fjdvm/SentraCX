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
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Heart } from "lucide-react";

interface SentimentSeriesItem {
  timestamp: string;
  value: number;
}

interface SentimentTrendData {
  daily_scores: SentimentSeriesItem[];
  moving_average: SentimentSeriesItem[];
  forecast_next_7d: SentimentSeriesItem[];
}

interface SentimentTrendChartProps {
  data: SentimentTrendData | null;
  isLoading: boolean;
}

export function SentimentTrendChart({ data, isLoading }: SentimentTrendChartProps) {
  const threshold = 3.0; // Alert threshold

  const chartData = useMemo(() => {
    if (!data) return [];

    const result: any[] = [];
    
    // Push daily scores
    data.daily_scores.forEach((item, idx) => {
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      result.push({
        date: dateStr,
        daily: item.value,
        ma: data.moving_average[idx]?.value,
      });
    });

    const lastMA = data.moving_average[data.moving_average.length - 1];

    // Push forecast
    data.forecast_next_7d.forEach((item, idx) => {
      const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      result.push({
        date: dateStr,
        forecast: item.value,
        // Bridge point for continuous visual flow
        ma: idx === 0 && lastMA ? lastMA.value : undefined,
      });
    });

    return result;
  }, [data]);

  const alertTriggered = useMemo(() => {
    if (!data) return false;
    return data.forecast_next_7d.some((item) => item.value < threshold);
  }, [data]);

  if (isLoading || !data) {
    return (
      <Card className="bg-card border-border shadow-none h-[380px] animate-pulse">
        <CardHeader className="p-lg">
          <div className="h-6 w-48 bg-muted rounded"></div>
          <div className="h-4 w-64 bg-muted rounded mt-sm"></div>
        </CardHeader>
        <CardContent className="h-[260px] flex items-center justify-center">
          <div className="text-muted-foreground text-body-sm">Loading Trend...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-none flex flex-col justify-between h-full">
      <div>
        <CardHeader className="p-lg pb-0">
          <div className="flex items-center gap-sm">
            <Heart className="w-5 h-5 text-primary" />
            <CardTitle className="text-headline-sm font-bold text-foreground">Sentiment Trend Forecast</CardTitle>
          </div>
          <CardDescription>Daily sentiment score with 7-day rolling average & projection</CardDescription>
        </CardHeader>
        <CardContent className="p-lg pt-md space-y-md">
          {alertTriggered && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertTitle className="font-bold text-destructive">Sentiment Decline Alert</AlertTitle>
              <AlertDescription className="text-body-sm text-destructive-foreground/90">
                Customer sentiment is projected to fall below the target score of {threshold}.
              </AlertDescription>
            </Alert>
          )}

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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
                  domain={[1.0, 5.0]}
                  ticks={[1.0, 2.0, 3.0, 4.0, 5.0]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(var(--card))",
                    borderColor: "oklch(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={threshold}
                  stroke="oklch(var(--destructive))"
                  strokeDasharray="4 4"
                  label={{
                    value: "Target Threshold",
                    position: "top",
                    fill: "oklch(var(--destructive))",
                    fontSize: 9,
                    fontWeight: "bold",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "10px", marginTop: "10px" }}
                />
                {/* Daily Score Dots */}
                <Line
                  type="monotone"
                  dataKey="daily"
                  stroke="oklch(var(--muted-foreground))"
                  strokeWidth={1}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  name="Daily Score"
                />
                {/* Moving Average Line */}
                <Line
                  type="monotone"
                  dataKey="ma"
                  stroke="oklch(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="7d Moving Average"
                />
                {/* Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="oklch(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Projected Trend"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
