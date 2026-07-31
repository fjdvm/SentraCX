"use client";

import { useState, useEffect, useCallback } from "react";
import { crmClient } from "@/lib/api/crm-client";
import { MarketingInteraction } from "@/types/customer";

interface UseCustomerMarketingOptions {
  customerId: string;
  page?: number;
  pageSize?: number;
}

export function useCustomerMarketingHistory({
  customerId,
  page = 1,
  pageSize = 10,
}: UseCustomerMarketingOptions) {
  const [interactions, setInteractions] = useState<MarketingInteraction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(() => Boolean(customerId));
  const [error, setError] = useState<string | null>(null);

  const fetchInteractions = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await crmClient.marketingInteractions.listByCustomer(customerId, page, pageSize);
      setInteractions(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load marketing history.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId, page, pageSize]);

  useEffect(() => {
    if (!customerId) return;
    setIsLoading(true);
    let isMounted = true;
    crmClient.marketingInteractions.listByCustomer(customerId, page, pageSize)
      .then((data) => {
        if (isMounted) {
          setInteractions(data.items || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load marketing history.");
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [customerId, page, pageSize]);

  return {
    interactions,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch: fetchInteractions,
  };
}
