"use client";

import { useState, useEffect, useCallback } from "react";
import { aiClient } from "@/lib/api/ai-client";

export function useDashboardForecasts(days = 7) {
  const [ticketVolume, setTicketVolume] = useState<any>(null);
  const [revenueBySegment, setRevenueBySegment] = useState<any>(null);
  const [churnDistribution, setChurnDistribution] = useState<any>(null);
  const [sentimentTrend, setSentimentTrend] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tickets, revenue, churn, sentiment] = await Promise.all([
        aiClient.forecasts.getTicketVolume(days),
        aiClient.forecasts.getRevenueBySegment(days),
        aiClient.forecasts.getChurnDistribution(),
        aiClient.forecasts.getSentimentTrend(),
      ]);
      setTicketVolume(tickets);
      setRevenueBySegment(revenue);
      setChurnDistribution(churn);
      setSentimentTrend(sentiment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forecasts.");
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  return {
    ticketVolume,
    revenueBySegment,
    churnDistribution,
    sentimentTrend,
    isLoading,
    error,
    refetch: fetchForecasts,
  };
}
