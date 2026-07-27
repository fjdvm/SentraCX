"use client";

import React, { useEffect, useState } from "react";
import { useDashboardHub, DashboardMetrics } from "@/hooks/useDashboardHub";

export function LiveStatusStrip() {
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

  const [pulses, setPulses] = useState({
    activeTickets: false,
    pendingEscalations: false,
    unreadConversations: false,
  });

  useEffect(() => {
    setPulses((p) => ({ ...p, activeTickets: true }));
    const t = setTimeout(() => setPulses((p) => ({ ...p, activeTickets: false })), 600);
    return () => clearTimeout(t);
  }, [metrics.activeTickets]);

  useEffect(() => {
    setPulses((p) => ({ ...p, pendingEscalations: true }));
    const t = setTimeout(() => setPulses((p) => ({ ...p, pendingEscalations: false })), 600);
    return () => clearTimeout(t);
  }, [metrics.pendingEscalations]);

  useEffect(() => {
    setPulses((p) => ({ ...p, unreadConversations: true }));
    const t = setTimeout(() => setPulses((p) => ({ ...p, unreadConversations: false })), 600);
    return () => clearTimeout(t);
  }, [metrics.unreadConversations]);

  return (
    <div className="w-full bg-gradient-to-r from-gray-800 to-violet-700 dark:from-gray-900 dark:to-violet-900 text-white rounded-xl py-md px-lg flex flex-col md:flex-row md:items-center justify-between gap-md shadow-sm border border-border/10">
      <div className="flex flex-wrap items-center gap-x-xl gap-y-sm text-body-sm font-medium text-white">
        <div className="flex items-center gap-sm">
          <span className={`inline-block w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_6px_2px_rgba(34,197,94,0.6)] ${pulses.activeTickets ? "animate-ping" : ""}`} />
          <span>
            Waiting to Be Answered:{" "}
            <strong className={`font-bold transition-all ${pulses.activeTickets ? "text-success scale-110" : ""}`}>
              {metrics.activeTickets}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-sm">
          {/* Use warning (orange) instead of red for urgent issues to satisfy the 'no red' requirement */}
          <span className={`inline-block w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_6px_2px_rgba(249,115,22,0.6)] ${pulses.pendingEscalations ? "animate-ping" : ""}`} />
          <span>
            Urgent Issues:{" "}
            <strong className={`font-bold transition-all ${pulses.pendingEscalations ? "text-warning scale-110" : ""}`}>
              {metrics.pendingEscalations}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-sm">
          <span className={`inline-block w-2.5 h-2.5 rounded-full bg-info shadow-[0_0_6px_2px_rgba(59,130,246,0.6)] ${pulses.unreadConversations ? "animate-ping" : ""}`} />
          <span>
            New Messages:{" "}
            <strong className={`font-bold transition-all ${pulses.unreadConversations ? "text-info scale-110" : ""}`}>
              {metrics.unreadConversations}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-sm text-body-xs font-semibold uppercase tracking-wider text-white/70">
        <span className="relative flex h-2 w-2">
          {isConnected ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_6px_2px_rgba(34,197,94,0.6)]"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/50 animate-pulse"></span>
          )}
        </span>
        <span>
          {isConnected ? "Live System Status: Optimal" : "Connecting Status..."}
        </span>
      </div>
    </div>
  );
}
