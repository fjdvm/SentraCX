"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { crmClient } from "@/lib/api/crm-client";
import { TicketListItem } from "@/types/ticket";

export function sortTicketsByActivity(items: TicketListItem[]): TicketListItem[] {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.lastMessageAt || a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.lastMessageAt || b.updatedAt || b.createdAt).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });
}

export function useConversationTickets(initialTicketId?: string) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialTicketId ?? null);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialFetchRef = useRef(true);

  const fetchTickets = useCallback(async () => {
    try {
      if (isInitialFetchRef.current) {
        setIsLoading(true);
      }
      setError(null);

      const [claimedRes, ongoingRes] = await Promise.all([
        crmClient.tickets.list(1, 100, "Claimed"),
        crmClient.tickets.list(1, 100, "Ongoing"),
      ]);

      const map = new Map<string, TicketListItem>();
      claimedRes.items.forEach((t) => map.set(t.id, t));
      ongoingRes.items.forEach((t) => map.set(t.id, t));

      const merged = Array.from(map.values());
      const sorted = sortTicketsByActivity(merged);

      setTickets((prev) => {
        // If we already have local tickets with recent message updates, merge them smoothly
        if (prev.length === 0) return sorted;

        const updatedMap = new Map(sorted.map((t) => [t.id, t]));
        // Keep any active optimistic properties from prev if not in sorted
        prev.forEach((prevItem) => {
          const fresh = updatedMap.get(prevItem.id);
          if (fresh) {
            const prevTime = new Date(prevItem.lastMessageAt || "").getTime();
            const freshTime = new Date(fresh.lastMessageAt || "").getTime();
            if (!isNaN(prevTime) && (isNaN(freshTime) || prevTime > freshTime)) {
              fresh.lastMessageAt = prevItem.lastMessageAt;
              fresh.lastMessageContent = prevItem.lastMessageContent;
            }
          }
        });
        return sortTicketsByActivity(Array.from(updatedMap.values()));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation tickets.");
    } finally {
      setIsLoading(false);
      isInitialFetchRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Set initial active ticket or clear it if it disappears from the list
  useEffect(() => {
    if (isLoading) return; // Wait until fetch is done

    if (tickets.length === 0) {
      if (activeTicketId) setActiveTicketId(null);
    } else {
      if (!activeTicketId) {
        setActiveTicketId(tickets[0].id);
      } else {
        const stillExists = tickets.some((t) => t.id === activeTicketId);
        if (!stillExists) {
          setActiveTicketId(tickets[0].id);
        }
      }
    }
  }, [tickets, activeTicketId, isLoading]);

  // Sync activeTicketId with URL search params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const currentParam = url.searchParams.get("ticketId");
      
      if (activeTicketId && currentParam !== activeTicketId) {
        url.searchParams.set("ticketId", activeTicketId);
        window.history.replaceState(null, "", url.toString());
      } else if (!activeTicketId && currentParam) {
        url.searchParams.delete("ticketId");
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [activeTicketId]);

  const onMessageActivity = useCallback(
    (
      ticketId: string,
      message: { content: string; sentAt?: string; isRead?: boolean },
      isCurrentActive: boolean
    ) => {
      setTickets((prev) => {
        const existingIdx = prev.findIndex((t) => t.id === ticketId);
        const sentAt = message.sentAt || new Date().toISOString();

        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const unreadCount = isCurrentActive
            ? 0
            : (existing.unreadMessageCount ?? 0) + (message.isRead ? 0 : 1);

          const updatedTicket: TicketListItem = {
            ...existing,
            lastMessageAt: sentAt,
            lastMessageContent: message.content,
            unreadMessageCount: unreadCount,
          };

          const remaining = prev.filter((_, idx) => idx !== existingIdx);
          // Always place updated ticket at the top (messenger style)
          return [updatedTicket, ...remaining];
        } else {
          // If ticket is not currently in list, trigger background refetch
          fetchTickets();
          return prev;
        }
      });
    },
    [fetchTickets]
  );

  const markTicketAsRead = useCallback((ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, unreadMessageCount: 0 } : t))
    );
  }, []);

  const removeTicket = useCallback(
    (ticketId: string) => {
      setTickets((prev) => {
        const nextTickets = prev.filter((t) => t.id !== ticketId);
        if (activeTicketId === ticketId) {
          setActiveTicketId(nextTickets.length > 0 ? nextTickets[0].id : null);
        }
        return nextTickets;
      });
    },
    [activeTicketId]
  );

  return {
    tickets,
    activeTicketId,
    setActiveTicketId,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    refetchTickets: fetchTickets,
    onMessageActivity,
    markTicketAsRead,
    removeTicket,
  };
}
