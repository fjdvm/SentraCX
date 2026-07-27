import { ChartConfig } from "@/components/ui/chart";

export interface TicketType {
  id: string;
  customer: string;
  issue: string;
  priority: "High" | "Medium" | "Low";
  time: string;
}

export interface ForecastTicketVolume {
  date?: string;
  predicted_tickets?: number;
  [key: string]: any;
}

export interface RevenueSegment {
  segment?: string;
  revenue?: number;
  percentage?: number;
  [key: string]: any;
}

export interface ChurnDistribution {
  low?: number;
  medium?: number;
  high?: number;
  critical?: number;
  [key: string]: any;
}

export interface SentimentPoint {
  date?: string;
  score?: number;
  sentiment?: string;
  [key: string]: any;
}

export const chartData = [
  { month: "January", tickets: 186, resolved: 80 },
  { month: "February", tickets: 305, resolved: 200 },
  { month: "March", tickets: 237, resolved: 120 },
  { month: "April", tickets: 73, resolved: 190 },
  { month: "May", tickets: 209, resolved: 130 },
  { month: "June", tickets: 214, resolved: 140 },
];

export const chartConfig = {
  tickets: {
    label: "Tickets Created",
    color: "var(--color-chart-1)",
  },
  resolved: {
    label: "Resolved Tickets",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;
