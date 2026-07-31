"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { Message } from "@/types/message";
import { Ticket } from "@/types/ticket";

const CRM_BASE = process.env.NEXT_PUBLIC_CRM_API_URL ?? "https://localhost:7001";

interface TicketStatusChangedPayload {
  ticketId: string;
  status: string;
  assignedToId?: string | null;
}

interface UseSignalROptions {
  ticketId?: string | null;
  onReceiveMessage?: (msg: Message) => void;
  onMessageRead?: (messageId: string) => void;
  onNewMessageNotification?: (ticketId: string, message: Message) => void;
  onNewTicketAvailable?: (ticket: Ticket) => void;
  onTicketStatusChanged?: (payload: TicketStatusChangedPayload) => void;
}

export function useSignalR({
  ticketId,
  onReceiveMessage,
  onMessageRead,
  onNewMessageNotification,
  onNewTicketAvailable,
  onTicketStatusChanged,
}: UseSignalROptions) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeTicketRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onReceiveMessageRef = useRef(onReceiveMessage);
  onReceiveMessageRef.current = onReceiveMessage;

  const onMessageReadRef = useRef(onMessageRead);
  onMessageReadRef.current = onMessageRead;

  const onNewMessageNotificationRef = useRef(onNewMessageNotification);
  onNewMessageNotificationRef.current = onNewMessageNotification;

  const onNewTicketAvailableRef = useRef(onNewTicketAvailable);
  onNewTicketAvailableRef.current = onNewTicketAvailable;

  const onTicketStatusChangedRef = useRef(onTicketStatusChanged);
  onTicketStatusChangedRef.current = onTicketStatusChanged;

  useEffect(() => {
    let stopped = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${CRM_BASE}/hubs/chat`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        accessTokenFactory: async () => {
          const { getSession } = await import("next-auth/react");
          const session = await getSession();
          return session?.accessToken ?? "";
        }
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (msg: Message) => {
      onReceiveMessageRef.current?.(msg);
    });

    connection.on("MessageRead", (messageId: string) => {
      onMessageReadRef.current?.(messageId);
    });

    connection.on("NewMessageNotification", (data: { ticketId: string; message: Message }) => {
      onNewMessageNotificationRef.current?.(data.ticketId, data.message);
    });

    connection.on("NewTicketAvailable", (ticket: Ticket) => {
      onNewTicketAvailableRef.current?.(ticket);
    });

    connection.on("TicketStatusChanged", (payload: TicketStatusChangedPayload) => {
      onTicketStatusChangedRef.current?.(payload);
    });

    connectionRef.current = connection;

    const startPromise = connection
      .start()
      .then(() => {
        if (stopped) {
          connection.stop().catch(console.error);
          return;
        }
        setIsConnected(true);
        connection.invoke("JoinStaff").catch(console.error);
        if (ticketId) {
          activeTicketRef.current = ticketId;
          connection.invoke("JoinTicket", ticketId).catch(console.error);
        }
      })
      .catch((err) => {
        if (!stopped) {
          console.error("SignalR connection error:", err);
        }
      });

    return () => {
      stopped = true;
      startPromise.then(async () => {
        if (connection.state === signalR.HubConnectionState.Connected) {
          const leavePromises: Promise<void>[] = [];
          if (activeTicketRef.current) {
            leavePromises.push(connection.invoke("LeaveTicket", activeTicketRef.current));
          }
          leavePromises.push(connection.invoke("LeaveStaff"));
          await Promise.allSettled(leavePromises);
        }
        connection.stop().catch(() => {});
      });
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, []); // Run once on mount

  // Handle ticketId changes
  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      activeTicketRef.current = ticketId ?? null;
      return;
    }

    const prevId = activeTicketRef.current;
    if (prevId !== ticketId) {
      if (prevId) {
        connection.invoke("LeaveTicket", prevId).catch(console.error);
      }
      if (ticketId) {
        connection.invoke("JoinTicket", ticketId).catch(console.error);
      }
      activeTicketRef.current = ticketId ?? null;
    }
  }, [ticketId, isConnected]);

  const sendMessage = useCallback(
    async (targetTicketId: string, senderId: string, content: string, senderType = "employee") => {
      const connection = connectionRef.current;
      if (connection && connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke("SendMessage", targetTicketId, senderId, content, senderType);
      }
    },
    []
  );

  const markMessageRead = useCallback(
    async (targetTicketId: string, messageId: string) => {
      const connection = connectionRef.current;
      if (connection && connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke("MarkMessageRead", targetTicketId, messageId);
      }
    },
    []
  );

  return {
    isConnected,
    sendMessage,
    markMessageRead,
  };
}
