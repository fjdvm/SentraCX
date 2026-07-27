"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface ChurnDistributionData {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface ChurnDistributionChartProps {
  data: ChurnDistributionData | null;
  isLoading: boolean;
}

export function ChurnDistributionChart({ data, isLoading }: ChurnDistributionChartProps) {
  const router = useRouter();

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Low", value: data.low, risk: "low", color: "oklch(var(--success))" },
      { name: "Medium", value: data.medium, risk: "medium", color: "oklch(var(--warning))" },
      { name: "High", value: data.high, risk: "high", color: "oklch(var(--info))" },
      { name: "Critical", value: data.critical, risk: "critical", color: "oklch(0.62 0.18 45)" }, // Rust orange instead of red
    ].filter((item) => item.value > 0);
  }, [data]);

  const total = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  const handleCellClick = (risk: string) => {
    router.push(`/customers?churn_risk=${risk}`);
  };

  if (isLoading || !data) {
    return (
      <Card className="bg-card border-border shadow-none h-[380px] animate-pulse">
        <CardHeader className="p-lg">
          <div className="h-6 w-48 bg-muted rounded"></div>
          <div className="h-4 w-64 bg-muted rounded mt-sm"></div>
        </CardHeader>
        <CardContent className="h-[260px] flex items-center justify-center">
          <div className="text-muted-foreground text-body-sm">Loading Distribution...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-none flex flex-col justify-between h-full">
      <div>
        <CardHeader className="p-lg pb-0">
          <div className="flex items-center gap-sm">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <CardTitle className="text-headline-sm font-bold text-foreground">Who's at Risk of Leaving</CardTitle>
          </div>
          <CardDescription>Donut segmentation by churn score range (Click segment to filter)</CardDescription>
        </CardHeader>
        <CardContent className="p-lg pt-md flex flex-col sm:flex-row items-center justify-between gap-lg">
          <div className="h-[200px] w-full sm:w-[60%] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="cursor-pointer hover:opacity-85 duration-300"
                      onClick={() => handleCellClick(entry.risk)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(var(--card))",
                    borderColor: "oklch(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [`${val} customers`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label: <number> Accounts (matching design ref) */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-headline-md font-bold text-foreground">
                {total}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Accounts
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-sm flex-1 w-full sm:w-auto">
            {chartData.map((item) => (
              <button
                key={item.name}
                onClick={() => handleCellClick(item.risk)}
                className="flex items-center justify-between gap-md p-sm rounded-lg hover:bg-muted/30 text-left w-full border border-transparent hover:border-border/40 transition-all duration-300"
              >
                <div className="flex items-center gap-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-body-sm font-medium text-foreground">{item.name}</span>
                </div>
                <span className="text-body-sm font-bold text-muted-foreground">
                  {item.value} ({((item.value / total) * 100).toFixed(0)}%)
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
