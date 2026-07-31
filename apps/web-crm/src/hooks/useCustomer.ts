"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { crmClient } from "@/lib/api/crm-client";
import { Customer } from "@/types/customer";

export function useCustomer(id: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const lastOptimisticUpdateRef = useRef<number>(0);
  const lastRequestIdRef = useRef<number>(0);

  const updateCustomerOptimistically = useCallback((newCustomer: Customer | null | ((prev: Customer | null) => Customer | null)) => {
    lastOptimisticUpdateRef.current = Date.now();
    setCustomer(newCustomer);
  }, []);

  const fetchCustomer = useCallback(async (isBackground = false) => {
    if (!id) return;
    if (isBackground) {
      if (Date.now() - lastOptimisticUpdateRef.current < 12000) {
        return;
      }
    } else {
      setIsLoading(true);
    }

    const currentRequestId = ++lastRequestIdRef.current;
    setError(null);
    try {
      const data = await crmClient.customers.getById(id);
      if (currentRequestId === lastRequestIdRef.current) {
        setCustomer(data);
      }
    } catch (err) {
      if (currentRequestId === lastRequestIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load customer profile.");
      }
    } finally {
      if (currentRequestId === lastRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    fetchCustomer(false);

    const interval = setInterval(() => {
      fetchCustomer(true);
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [id, fetchCustomer]);

  return {
    customer,
    isLoading,
    error,
    refetch: () => fetchCustomer(false),
    setCustomer: updateCustomerOptimistically,
  };
}
