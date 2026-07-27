import { DashboardSummaryData } from "@/hooks/useDashboardSummary";

interface ForecastData {
  ticketVolume: any;
  revenueBySegment: any;
  churnDistribution: any;
  sentimentTrend: any;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function escapeCsvValue(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRows(rows: (string | number | undefined | null)[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

export function downloadDashboardReport(
  summary: DashboardSummaryData | null,
  forecasts: ForecastData,
  days: number
) {
  const sections: string[] = [];
  const generatedAt = new Date().toLocaleString();

  // Header
  sections.push(`SentraCX Dashboard Report`);
  sections.push(`Generated: ${generatedAt}`);
  sections.push(`Forecast Horizon: ${days} days`);
  sections.push("");

  // KPI Summary Section
  sections.push("=== KPI Summary ===");
  sections.push(buildCsvRows([["Metric", "Value", "Change (%)", "Trend"]]));
  if (summary) {
    const metrics: [string, keyof DashboardSummaryData][] = [
      ["Churn Rate", "churn_rate"],
      ["Average CLV", "average_clv"],
      ["Customer Satisfaction", "customer_satisfaction"],
      ["Avg Resolution Hours", "average_resolution_hours"],
      ["Active Tickets", "active_tickets"],
      ["Active Campaigns", "active_campaigns"],
    ];
    for (const [label, key] of metrics) {
      const m = summary[key];
      if (m) {
        sections.push(buildCsvRows([[label, m.value, m.delta, m.trend]]));
      }
    }
  } else {
    sections.push("No summary data available");
  }
  sections.push("");

  // Ticket Volume Forecast
  sections.push("=== Ticket Volume Forecast ===");
  if (forecasts.ticketVolume?.series?.length) {
    sections.push(buildCsvRows([["Date", "Predicted Volume"]]));
    for (const point of forecasts.ticketVolume.series) {
      sections.push(buildCsvRows([[point.name || point.date, point.value || point.volume]]));
    }
  } else {
    sections.push("No ticket volume data available");
  }
  sections.push("");

  // Revenue by Segment
  sections.push("=== Revenue by Segment ===");
  if (forecasts.revenueBySegment?.series?.length) {
    sections.push(buildCsvRows([["Segment", "Revenue"]]));
    for (const point of forecasts.revenueBySegment.series) {
      sections.push(buildCsvRows([[point.name || point.segment, point.value || point.revenue]]));
    }
  } else {
    sections.push("No revenue segment data available");
  }
  sections.push("");

  // Churn Distribution
  sections.push("=== Churn Risk Distribution ===");
  if (forecasts.churnDistribution?.series?.length) {
    sections.push(buildCsvRows([["Risk Level", "Count"]]));
    for (const point of forecasts.churnDistribution.series) {
      sections.push(buildCsvRows([[point.name || point.level, point.value || point.count]]));
    }
  } else {
    sections.push("No churn distribution data available");
  }
  sections.push("");

  // Sentiment Trend
  sections.push("=== Sentiment Trend ===");
  if (forecasts.sentimentTrend?.series?.length) {
    sections.push(buildCsvRows([["Period", "Score"]]));
    for (const point of forecasts.sentimentTrend.series) {
      sections.push(buildCsvRows([[point.name || point.period, point.value || point.score]]));
    }
  } else {
    sections.push("No sentiment trend data available");
  }

  // Combine and download
  const csvContent = sections.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const filename = `sentracx-dashboard-report-${formatDate(new Date())}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
