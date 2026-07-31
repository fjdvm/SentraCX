"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { crmClient } from "@/lib/api/crm-client";
import { CustomerListItem } from "@/types/customer";

interface UseCustomersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  customerType?: string;
}

export function useCustomers({ page = 1, pageSize = 20, search = "", customerType }: UseCustomersOptions = {}) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef<number>(0);

  const fetchCustomers = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    setError(null);
    const currentRequestId = ++lastRequestIdRef.current;
    try {
      const data = await crmClient.customers.list(page, pageSize, customerType, search);
      if (currentRequestId === lastRequestIdRef.current) {
        setCustomers(data.items || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      if (currentRequestId === lastRequestIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load customers.");
      }
    } finally {
      if (currentRequestId === lastRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [page, pageSize, search, customerType]);

  useEffect(() => {
    fetchCustomers(false);

    const interval = setInterval(() => {
      fetchCustomers(true);
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchCustomers]);

  return {
    customers,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch: () => fetchCustomers(false),
  };
}
