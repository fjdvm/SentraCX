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
  sections.push(buildCsvRows([["Metric", "Value", "Change", "Trend"]]));
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

  // Ticket Volume Forecast (Historical and Forecast)
  sections.push("=== Ticket Volume Forecast ===");
  const historicalTickets = forecasts.ticketVolume?.historical_series ?? [];
  const forecastTickets = forecasts.ticketVolume?.forecast_series ?? [];

  if (historicalTickets.length || forecastTickets.length) {
    sections.push(buildCsvRows([["Type", "Date", "Ticket Count"]]));
    for (const point of historicalTickets) {
      sections.push(buildCsvRows([["Historical", point.date, point.count]]));
    }
    for (const point of forecastTickets) {
      sections.push(buildCsvRows([["Forecasted", point.date, point.count]]));
    }
  } else {
    sections.push("No ticket volume data available");
  }
  sections.push("");

  // Revenue by Segment & Projection
  sections.push("=== Revenue Forecast ===");
  const revenueSeries = forecasts.revenueBySegment?.forecast_series ?? [];
  const segments = forecasts.revenueBySegment?.by_segment ?? {};

  sections.push(buildCsvRows([["Total Projected Revenue", forecasts.revenueBySegment?.total_projected ?? ""]]));
  sections.push(buildCsvRows([["Model Confidence (%)", forecasts.revenueBySegment?.confidence ? `${Math.round(forecasts.revenueBySegment.confidence * 100)}%` : ""]]));
  sections.push("");

  sections.push("--- Revenue Segments ---");
  const segmentEntries = Object.entries(segments);
  if (segmentEntries.length) {
    sections.push(buildCsvRows([["Segment", "Projected Revenue"]]));
    for (const [segment, val] of segmentEntries) {
      sections.push(buildCsvRows([[segment, val as number]]));
    }
  } else {
    sections.push("No segment breakdown available");
  }
  sections.push("");

  sections.push("--- Revenue Forecast Trajectory ---");
  if (revenueSeries.length) {
    sections.push(buildCsvRows([["Date", "Projected Revenue"]]));
    for (const point of revenueSeries) {
      sections.push(buildCsvRows([[point.date, point.revenue]]));
    }
  } else {
    sections.push("No revenue forecast trajectory available");
  }
  sections.push("");

  // Churn Risk Distribution
  sections.push("=== Churn Risk Distribution ===");
  const low = forecasts.churnDistribution?.low;
  const medium = forecasts.churnDistribution?.medium;
  const high = forecasts.churnDistribution?.high;
  const critical = forecasts.churnDistribution?.critical;

  if (low !== undefined || medium !== undefined || high !== undefined || critical !== undefined) {
    sections.push(buildCsvRows([["Risk Level", "Count"]]));
    sections.push(buildCsvRows([["Low", low]]));
    sections.push(buildCsvRows([["Medium", medium]]));
    sections.push(buildCsvRows([["High", high]]));
    sections.push(buildCsvRows([["Critical", critical]]));
  } else {
    sections.push("No current churn risk distribution available");
  }
  sections.push("");

  sections.push("--- Churn Risk Trend Series ---");
  const churnTrend = forecasts.churnDistribution?.trend_series ?? [];
  if (churnTrend.length) {
    sections.push(buildCsvRows([["Date", "Low Risk Count", "Medium Risk Count", "High Risk Count", "Critical Risk Count"]]));
    for (const point of churnTrend) {
      sections.push(buildCsvRows([[point.date, point.low, point.medium, point.high, point.critical]]));
    }
  } else {
    sections.push("No churn risk trend available");
  }
  sections.push("");

  // Sentiment Trend
  sections.push("=== Sentiment Trend ===");
  const sentimentScores = forecasts.sentimentTrend?.daily_scores ?? [];
  const sentimentMA = forecasts.sentimentTrend?.moving_average ?? [];
  const sentimentForecast = forecasts.sentimentTrend?.forecast_next_7d ?? [];

  if (sentimentScores.length || sentimentMA.length || sentimentForecast.length) {
    sections.push(buildCsvRows([["Type", "Date", "Score"]]));
    for (const point of sentimentScores) {
      sections.push(buildCsvRows([["Daily Average", point.date, point.score]]));
    }
    for (const point of sentimentMA) {
      sections.push(buildCsvRows([["7-Day Moving Average", point.date, point.score]]));
    }
    for (const point of sentimentForecast) {
      sections.push(buildCsvRows([["Next 7 Days Forecast", point.date, point.score]]));
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
