"use client";

import React, { useEffect, useState } from "react";
import { useDashboardHub, DashboardMetrics } from "@/hooks/useDashboardHub";
import { Ticket, AlertCircle, MessageSquare, Users } from "lucide-react";

export function LiveMetricsBar() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeTickets: 0,
    pendingEscalations: 0,
    unreadConversations: 0,
    onlineAgents: 0,
  });

  const { isConnected } = useDashboardHub({
    onMetricsUpdated: (newMetrics) => {
      setMetrics(newMetrics);
    },
  });

  // Pulse animation tracking for each metric
  const [pulses, setPulses] = useState({
    activeTickets: false,
    pendingEscalations: false,
    unreadConversations: false,
    onlineAgents: false,
  });

  useEffect(() => {
    setPulses((p) => ({ ...p, activeTickets: true }));
    const timer = setTimeout(() => {
      setPulses((p) => ({ ...p, activeTickets: false }));
    }, 600);
    return () => clearTimeout(timer);
  }, [metrics.activeTickets]);

  useEffect(() => {
    setPulses((p) => ({ ...p, pendingEscalations: true }));
    const timer = setTimeout(() => {
      setPulses((p) => ({ ...p, pendingEscalations: false }));
    }, 600);
    return () => clearTimeout(timer);
  }, [metrics.pendingEscalations]);

  useEffect(() => {
    setPulses((p) => ({ ...p, unreadConversations: true }));
    const timer = setTimeout(() => {
      setPulses((p) => ({ ...p, unreadConversations: false }));
    }, 600);
    return () => clearTimeout(timer);
  }, [metrics.unreadConversations]);

  useEffect(() => {
    setPulses((p) => ({ ...p, onlineAgents: true }));
    const timer = setTimeout(() => {
      setPulses((p) => ({ ...p, onlineAgents: false }));
    }, 600);
    return () => clearTimeout(timer);
  }, [metrics.onlineAgents]);

  const items = [
    {
      label: "Active Tickets",
      value: metrics.activeTickets,
      pulse: pulses.activeTickets,
      icon: Ticket,
      color: "text-foreground",
    },
    {
      label: "Pending Escalations",
      value: metrics.pendingEscalations,
      pulse: pulses.pendingEscalations,
      icon: AlertCircle,
      color: "text-warning",
    },
    {
      label: "Unread Conversations",
      value: metrics.unreadConversations,
      pulse: pulses.unreadConversations,
      icon: MessageSquare,
      color: "text-info",
    },
    {
      label: "Online Agents",
      value: metrics.onlineAgents,
      pulse: pulses.onlineAgents,
      icon: Users,
      color: "text-success",
    },
  ];

  return (
    <div className="w-full bg-muted/30 border border-border/80 rounded-xl p-md flex flex-col md:flex-row md:items-center justify-between gap-md shadow-sm">
      <div className="flex items-center gap-sm">
        <span className="relative flex h-2 w-2">
          {isConnected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/55"></span>
          )}
        </span>
        <span className="text-label-sm font-semibold tracking-wide text-foreground/80 uppercase">
          {isConnected ? "Live System Metrics" : "Connecting Live Metrics..."}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-md md:gap-lg divide-x/10 divide-border">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-sm px-xs sm:px-md transition-all duration-300 ${
                index > 0 ? "sm:border-l sm:border-border/60" : ""
              }`}
            >
              <div className={`p-1.5 rounded-md bg-muted/65 ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  {item.label}
                </span>
                <span
                  className={`text-body-md font-bold tracking-tight text-foreground transition-all duration-300 ${
                    item.pulse ? "scale-110 text-primary animate-pulse" : ""
                  }`}
                >
                  {item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
