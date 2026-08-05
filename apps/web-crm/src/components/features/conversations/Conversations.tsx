"use client";

import React, { useCallback } from "react";
import { ConversationList } from "./ConversationList";
import { ConversationWindow } from "./ConversationWindow";
import { CustomerContextPanel } from "./CustomerContextPanel";
import { useConversationTickets } from "@/hooks/useConversationTickets";
import { useTicket } from "@/hooks/useTicket";
import { useMessages } from "@/hooks/useMessages";
import { useSignalR } from "@/hooks/useSignalR";
import { crmClient } from "@/lib/api/crm-client";
import { Message } from "@/types/message";

interface ConversationsProps {
  initialTicketId?: string;
}

export function Conversations({ initialTicketId }: ConversationsProps) {
  const {
    tickets,
    activeTicketId,
    setActiveTicketId,
    activeTab,
    setActiveTab,
    isLoading: isTicketsLoading,
    error: ticketsError,
    refetchTickets,
    onMessageActivity,
    markTicketAsRead,
    removeTicket,
  } = useConversationTickets(initialTicketId);

  const { ticket, isLoading: isTicketLoading } = useTicket(activeTicketId);
  const {
    messages,
    isLoading: isMessagesLoading,
    error: messagesError,
    appendMessage,
    refetch: refetchMessages,
  } = useMessages(activeTicketId);

  // Incoming SignalR message callback for active ticket
  const handleReceiveMessage = useCallback(
    (incomingMsg: Message) => {
      appendMessage(incomingMsg);
      if (activeTicketId) {
        onMessageActivity(activeTicketId, incomingMsg, true);
      }
    },
    [appendMessage, onMessageActivity, activeTicketId]
  );

  // Incoming SignalR notification for any ticket
  const handleNewMessageNotification = useCallback(
    (ticketId: string, incomingMsg: Message) => {
      onMessageActivity(ticketId, incomingMsg, ticketId === activeTicketId);
    },
    [onMessageActivity, activeTicketId]
  );

  const handleTicketStatusChanged = useCallback(() => {
    refetchTickets();
  }, [refetchTickets]);

  // SignalR connection hook
  const { isConnected, sendMessage } = useSignalR({
    ticketId: activeTicketId,
    onReceiveMessage: handleReceiveMessage,
    onNewMessageNotification: handleNewMessageNotification,
    onTicketStatusChanged: handleTicketStatusChanged,
  });

  const handleSelectTicket = useCallback(
    (ticketId: string) => {
      setActiveTicketId(ticketId);
      markTicketAsRead(ticketId);

      const selected = tickets.find((t) => t.id === ticketId);
      if (selected && (selected.unreadMessageCount ?? 0) > 0) {
        crmClient.messages
          .listByTicket(ticketId)
          .then((msgs) => {
            msgs.filter((m) => !m.isRead).forEach((m) => {
              crmClient.messages.markRead(ticketId, m.id).catch(console.error);
            });
          })
          .catch(console.error);
      }
    },
    [setActiveTicketId, markTicketAsRead, tickets]
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
      onMessageActivity(activeTicketId, optimisticMsg, true);

      try {
        if (isConnected) {
          await sendMessage(activeTicketId, senderId, content);
        } else {
          const created = await crmClient.messages.create(activeTicketId, senderId, content);
          if (created) {
            appendMessage(created);
          }
        }
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    },
    [activeTicketId, ticket, sendMessage, appendMessage, isConnected, onMessageActivity]
  );

  const handleComplete = useCallback(
    async (ticketId: string) => {
      try {
        await crmClient.tickets.updateStatus(ticketId, "Completed");
        removeTicket(ticketId);
        refetchTickets();
      } catch (err) {
        console.error("Failed to complete ticket:", err);
      }
    },
    [removeTicket, refetchTickets]
  );

  const handleUnclaim = useCallback(
    async (ticketId: string) => {
      try {
        await crmClient.tickets.unclaim(ticketId);
        removeTicket(ticketId);
        refetchTickets();
      } catch (err) {
        console.error("Failed to unclaim ticket:", err);
      }
    },
    [removeTicket, refetchTickets]
  );

  const handleCancel = useCallback(
    async (ticketId: string) => {
      try {
        await crmClient.tickets.cancel(ticketId);
        removeTicket(ticketId);
        refetchTickets();
      } catch (err) {
        console.error("Failed to cancel ticket:", err);
      }
    },
    [removeTicket, refetchTickets]
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
        error={messagesError}
        onRetry={refetchMessages}
        onSendMessage={handleSendMessage}
        onComplete={handleComplete}
        onUnclaim={handleUnclaim}
        onCancel={handleCancel}
      />
      <CustomerContextPanel
        ticket={ticket}
        messages={messages}
        onUseTemplate={(text) => handleSendMessage(text)}
      />
    </div>
  );
}
