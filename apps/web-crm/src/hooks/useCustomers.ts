"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await crmClient.customers.list(page, pageSize, customerType, search);
      setCustomers(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, customerType]);

  useEffect(() => {
    let isMounted = true;

    const fetchList = (isBackground = false) => {
      if (!isBackground) {
        setIsLoading(true);
      }
      crmClient.customers.list(page, pageSize, customerType, search)
        .then((data) => {
          if (isMounted) {
            setCustomers(data.items || []);
            setTotalCount(data.totalCount || 0);
            setTotalPages(data.totalPages || 1);
            setError(null);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : "Failed to load customers.");
            setIsLoading(false);
          }
        });
    };

    fetchList(false);

    const interval = setInterval(() => {
      fetchList(true);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [page, pageSize, search, customerType]);

  return {
    customers,
    totalCount,
    totalPages,
    isLoading,
    error,
    refetch: fetchCustomers,
  };
}
