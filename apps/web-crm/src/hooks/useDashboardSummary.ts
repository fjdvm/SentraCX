"use client";

import { useState, useEffect, useCallback } from "react";
import { aiClient } from "@/lib/api/ai-client";

export interface DashboardMetricWithDelta {
  value: number;
  delta: number;
  trend: "up" | "down" | "flat";
}

export interface DashboardSummaryData {
  churn_rate?: DashboardMetricWithDelta;
  average_clv?: DashboardMetricWithDelta;
  customer_satisfaction?: DashboardMetricWithDelta;
  average_resolution_hours?: DashboardMetricWithDelta;
  active_tickets?: DashboardMetricWithDelta;
  active_campaigns?: DashboardMetricWithDelta;
}

export function useDashboardSummary(from?: string, to?: string) {
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await aiClient.dashboard.getSummary(from, to);
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard summary.");
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSummary,
  };
}
