import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { chartData, chartConfig } from "./types";

export function DashboardChart() {
  return (
    <Card className="lg:col-span-4 bg-card border-border rounded-xl shadow-none">
      <CardHeader>
        <CardTitle className="text-title-lg font-bold text-foreground">
          Support Operations Trend
        </CardTitle>
        <p className="text-body-sm text-muted-foreground">
          Monthly summary of logged support tickets vs resolved tickets.
        </p>
      </CardHeader>
      <CardContent className="pb-md">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} className="stroke-border" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
              className="fill-muted-foreground text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="resolved"
              type="natural"
              fill="var(--color-chart-2)"
              fillOpacity={0.4}
              stroke="var(--color-chart-2)"
              stackId="a"
            />
            <Area
              dataKey="tickets"
              type="natural"
              fill="var(--color-chart-1)"
              fillOpacity={0.4}
              stroke="var(--color-chart-1)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
