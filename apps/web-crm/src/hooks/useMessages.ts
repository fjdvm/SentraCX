"use client";

import { useState, useEffect, useCallback } from "react";
import { crmClient } from "@/lib/api/crm-client";
import { Message } from "@/types/message";

export function useMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(ticketId));
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await crmClient.messages.listByTicket(ticketId);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) {
        return prev;
      }

      // If this is a real message from the server, check if there is an optimistic temporary message
      // with the same sender and content, and replace it.
      if (!msg.id.startsWith("temp-")) {
        const tempIndex = prev.findIndex(
          (m) => m.id.startsWith("temp-") && m.senderId === msg.senderId && m.content === msg.content
        );
        if (tempIndex !== -1) {
          const updated = [...prev];
          updated[tempIndex] = msg;
          return updated;
        }
      }

      return [...prev, msg];
    });
  }, []);

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
    appendMessage,
    setMessages,
  };
}
