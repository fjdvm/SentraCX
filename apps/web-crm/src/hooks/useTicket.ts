"use client";

import { useState, useEffect, useCallback } from "react";
import { crmClient } from "@/lib/api/crm-client";
import { Ticket } from "@/types/ticket";

export function useTicket(id: string | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await crmClient.tickets.getById(id);
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setTicket(null);
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    setIsLoading(true);
    crmClient.tickets
      .getById(id)
      .then((data) => {
        if (isMounted) {
          setTicket(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load ticket.");
          setTicket(null);
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

  return {
    ticket,
    data: ticket,
    isLoading,
    error,
    refetch: fetchTicket,
    setTicket,
  };
}
