"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ConversationList } from "./ConversationList";
import { ConversationWindow } from "./ConversationWindow";
import { CustomerContextPanel } from "./CustomerContextPanel";
import { useTickets } from "@/hooks/useTickets";
import { useTicket } from "@/hooks/useTicket";
import { useMessages } from "@/hooks/useMessages";
import { useSignalR } from "@/hooks/useSignalR";
import { crmClient } from "@/lib/api/crm-client";
import { Message } from "@/types/message";

interface ConversationsProps {
  initialTicketId?: string;
}

export function Conversations({ initialTicketId }: ConversationsProps) {
  // TODO (auth): In dev, no assignedToId is passed (returns all Claimed/Ongoing tickets).
  //              When auth is re-enabled, pass session user ID here.
  const { tickets, isLoading: isTicketsLoading, error: ticketsError, refetch: refetchTickets } = useTickets(
    1,
    100,
    "Ongoing"
  );

  const [activeTicketId, setActiveTicketId] = useState<string | null>(initialTicketId ?? null);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");

  // Set initial active ticket once tickets load if not set
  useEffect(() => {
    if (!activeTicketId && tickets.length > 0) {
      setActiveTicketId(tickets[0].id);
    }
  }, [tickets, activeTicketId]);

  const { ticket, isLoading: isTicketLoading } = useTicket(activeTicketId);
  const { messages, isLoading: isMessagesLoading, appendMessage, refetch: refetchMessages } = useMessages(
    activeTicketId
  );

  // Incoming SignalR message callback
  const handleReceiveMessage = useCallback(
    (incomingMsg: Message) => {
      appendMessage(incomingMsg);
      refetchTickets();
    },
    [appendMessage, refetchTickets]
  );

  const handleNewMessageNotification = useCallback(
    (ticketId: string, incomingMsg: Message) => {
      if (ticketId !== activeTicketId) {
        refetchTickets();
      }
    },
    [activeTicketId, refetchTickets]
  );

  const handleTicketStatusChanged = useCallback(
    () => {
      refetchTickets();
    },
    [refetchTickets]
  );

  // SignalR connection hook
  const { sendMessage } = useSignalR({
    ticketId: activeTicketId,
    onReceiveMessage: handleReceiveMessage,
    onNewMessageNotification: handleNewMessageNotification,
    onTicketStatusChanged: handleTicketStatusChanged,
  });

  const handleSelectTicket = useCallback(
    (ticketId: string) => {
      setActiveTicketId(ticketId);
      // Mark initial batch as read if unread count > 0
      const selected = tickets.find((t) => t.id === ticketId);
      if (selected && (selected.unreadMessageCount ?? 0) > 0) {
        crmClient.messages
          .listByTicket(ticketId)
          .then((msgs) => {
            msgs.filter((m) => !m.isRead).forEach((m) => {
              crmClient.messages.markRead(ticketId, m.id).catch(console.error);
            });
            refetchTickets();
          })
          .catch(console.error);
      }
    },
    [tickets, refetchTickets]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeTicketId || !ticket) return;

      const senderId = ticket.assignedToId || "staff-dev";
      const senderName = ticket.assignedToName || "Staff Support";

      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        senderId,
        senderName,
        content,
        isRead: true,
        sentAt: new Date().toISOString(),
      };

      appendMessage(optimisticMsg);

      try {
        await sendMessage(activeTicketId, senderId, content);
      } catch (err) {
        console.error("Failed to send message via SignalR:", err);
      }
    },
    [activeTicketId, ticket, sendMessage, appendMessage]
  );

  const handleComplete = useCallback(
    async (ticketId: string) => {
      try {
        await crmClient.tickets.updateStatus(ticketId, "Completed");
        refetchTickets();
        if (activeTicketId === ticketId) {
          const next = tickets.find((t) => t.id !== ticketId);
          setActiveTicketId(next ? next.id : null);
        }
      } catch (err) {
        console.error("Failed to complete ticket:", err);
      }
    },
    [activeTicketId, tickets, refetchTickets]
  );

  const handleUnclaim = useCallback(
    async (ticketId: string) => {
      try {
        await crmClient.tickets.unclaim(ticketId);
        refetchTickets();
        if (activeTicketId === ticketId) {
          const next = tickets.find((t) => t.id !== ticketId);
          setActiveTicketId(next ? next.id : null);
        }
      } catch (err) {
        console.error("Failed to unclaim ticket:", err);
      }
    },
    [activeTicketId, tickets, refetchTickets]
  );

  const handleCancel = useCallback(
    async (ticketId: string) => {
      try {
        await crmClient.tickets.cancel(ticketId);
        refetchTickets();
        if (activeTicketId === ticketId) {
          const next = tickets.find((t) => t.id !== ticketId);
          setActiveTicketId(next ? next.id : null);
        }
      } catch (err) {
        console.error("Failed to cancel ticket:", err);
      }
    },
    [activeTicketId, tickets, refetchTickets]
  );

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-background">
      <ConversationList
        tickets={tickets}
        activeTicketId={activeTicketId}
        onSelect={handleSelectTicket}
        isLoading={isTicketsLoading}
        error={ticketsError}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <ConversationWindow
        ticket={ticket}
        messages={messages}
        isLoading={isTicketLoading || isMessagesLoading}
        onSendMessage={handleSendMessage}
        onComplete={handleComplete}
        onUnclaim={handleUnclaim}
        onCancel={handleCancel}
      />
      <CustomerContextPanel
        ticket={ticket}
        onUseTemplate={(text) => handleSendMessage(text)}
      />
    </div>
  );
}
