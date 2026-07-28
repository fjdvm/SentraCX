"use client";

import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

const CRM_BASE = process.env.NEXT_PUBLIC_CRM_API_URL ?? "https://localhost:7001";

export interface DashboardMetrics {
  activeTickets: number;
  pendingEscalations: number;
  unreadConversations: number;
  onlineAgents: number;
}

interface UseDashboardHubOptions {
  onMetricsUpdated?: (metrics: DashboardMetrics) => void;
}

export function useDashboardHub({ onMetricsUpdated }: UseDashboardHubOptions = {}) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onMetricsUpdatedRef = useRef(onMetricsUpdated);
  onMetricsUpdatedRef.current = onMetricsUpdated;

  useEffect(() => {
    let stopped = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${CRM_BASE}/hubs/dashboard`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("DashboardMetricsUpdated", (metrics: DashboardMetrics) => {
      onMetricsUpdatedRef.current?.(metrics);
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
        connection.invoke("JoinDashboard").catch((err) => {
          console.error("Failed to join dashboard group:", err);
        });
      })
      .catch((err) => {
        if (!stopped) {
          console.error("SignalR DashboardHub connection error:", err);
        }
      });

    return () => {
      stopped = true;
      startPromise.then(async () => {
        if (connection.state === signalR.HubConnectionState.Connected) {
          await connection.invoke("LeaveDashboard").catch(() => {});
        }
        connection.stop().catch(() => {});
      });
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, []);

  return { isConnected };
}
