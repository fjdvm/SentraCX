"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { Message } from "@/types/message";

const CRM_BASE = process.env.NEXT_PUBLIC_CRM_API_URL ?? "https://localhost:7001";

interface UseSignalROptions {
  ticketId: string | null;
  onReceiveMessage?: (msg: Message) => void;
  onMessageRead?: (messageId: string) => void;
  onNewMessageNotification?: (ticketId: string, message: Message) => void;
}

export function useSignalR({ ticketId, onReceiveMessage, onMessageRead, onNewMessageNotification }: UseSignalROptions) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeTicketRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onReceiveMessageRef = useRef(onReceiveMessage);
  onReceiveMessageRef.current = onReceiveMessage;

  const onMessageReadRef = useRef(onMessageRead);
  onMessageReadRef.current = onMessageRead;

  const onNewMessageNotificationRef = useRef(onNewMessageNotification);
  onNewMessageNotificationRef.current = onNewMessageNotification;

  useEffect(() => {
    // TODO (auth): Pass JWT access token via .withUrl(url, { accessTokenFactory: () => token })
    //              when NextAuth auth is re-enabled and the SignalR hub has [Authorize].
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${CRM_BASE}/hubs/chat`, {
        // Bypass SSL check for self-signed certs in local dev environment if needed
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets,
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

    connectionRef.current = connection;

    connection
      .start()
      .then(() => {
        setIsConnected(true);
        connection.invoke("JoinStaff").catch(console.error);
        if (ticketId) {
          activeTicketRef.current = ticketId;
          connection.invoke("JoinTicket", ticketId).catch(console.error);
        }
      })
      .catch((err) => {
        console.error("SignalR connection error:", err);
      });

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        if (activeTicketRef.current) {
          connection.invoke("LeaveTicket", activeTicketRef.current).catch(console.error);
        }
        connection.invoke("LeaveStaff").catch(console.error);
      }
      connection.stop().catch(console.error);
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, []); // Run once on mount

  // Handle ticketId changes
  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      activeTicketRef.current = ticketId;
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
      activeTicketRef.current = ticketId;
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
