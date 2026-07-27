"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { aiClient } from "@/lib/api/ai-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, ShieldAlert, Check } from "lucide-react";

interface Anomaly {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "acknowledged";
  detected_at: string;
}

export function DashboardAnomalies() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toastedIds = useRef<Set<string>>(new Set());

  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await aiClient.dashboard.getAnomalies();
      const openAnomalies = (res.anomalies || []).filter(
        (a: Anomaly) => a.status !== "resolved" && a.status !== "acknowledged"
      );
      
      setAnomalies(openAnomalies);

      // Trigger toast notifications for new critical anomalies
      openAnomalies.forEach((a: Anomaly) => {
        if (a.severity === "critical" && !toastedIds.current.has(a.id)) {
          toastedIds.current.add(a.id);
          toast.error(`Critical Alert: ${a.description}`, {
            duration: 10000,
            action: {
              label: "Acknowledge",
              onClick: () => handleAcknowledge(a.id),
            },
          });
        }
      });
    } catch (err) {
      console.error("Failed to fetch anomalies:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchAnomalies, 30000);
    return () => clearInterval(interval);
  }, [fetchAnomalies]);

  const handleAcknowledge = async (id: string) => {
    try {
      await aiClient.dashboard.acknowledgeAnomaly(id);
      toast.success("Anomaly acknowledged.");
      fetchAnomalies();
    } catch (err) {
      toast.error(`Failed to acknowledge anomaly: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive text-destructive-foreground font-bold";
      case "high":
        return "bg-orange-500 text-white font-semibold";
      case "medium":
        return "bg-yellow-500 text-black font-medium";
      default:
        return "bg-blue-500 text-white font-medium";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-none h-full">
        <CardHeader className="p-lg">
          <div className="h-6 w-48 bg-muted rounded"></div>
          <div className="h-4 w-64 bg-muted rounded mt-sm"></div>
        </CardHeader>
        <CardContent className="p-lg pt-0 space-y-md">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (anomalies.length === 0) {
    return null; // Don't show anything if there are no active/unacknowledged anomalies
  }

  return (
    <Card className="bg-card border-border shadow-none h-full">
      <CardHeader className="p-lg">
        <div className="flex items-center gap-sm">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <CardTitle className="text-headline-sm font-bold text-foreground">Detected Anomalies</CardTitle>
        </div>
        <CardDescription>Unacknowledged anomalies and trend disruptions requiring intervention</CardDescription>
      </CardHeader>
      <CardContent className="p-lg pt-0 space-y-md">
        {anomalies.map((a) => (
          <div
            key={a.id}
            className="flex flex-col md:flex-row md:items-center justify-between gap-md border border-border/80 rounded-xl p-md bg-destructive/5 hover:bg-destructive/10 transition-all duration-300"
          >
            <div className="space-y-sm flex-1">
              <div className="flex items-center gap-sm flex-wrap">
                <Badge className={getSeverityBadgeClass(a.severity)}>
                  {a.severity.toUpperCase()}
                </Badge>
                <span className="text-body-xs text-muted-foreground">
                  Detected {new Date(a.detected_at).toLocaleString()}
                </span>
              </div>
              <p className="text-body-sm font-medium text-foreground">{a.description}</p>
            </div>
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                variant="outline"
                className="gap-xs border-border/80 text-body-sm bg-background hover:bg-muted duration-300 font-medium"
                onClick={() => handleAcknowledge(a.id)}
              >
                <Check className="w-3.5 h-3.5" />
                Acknowledge
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
