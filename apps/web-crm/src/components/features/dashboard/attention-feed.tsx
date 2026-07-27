"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { aiClient } from "@/lib/api/ai-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldAlert, Check, CheckCircle2 } from "lucide-react";

interface Anomaly {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "acknowledged";
  detected_at: string;
}

export function AttentionFeed() {
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

      // Trigger warning toast notifications for new critical anomalies (avoiding red error toasts)
      openAnomalies.forEach((a: Anomaly) => {
        if (a.severity === "critical" && !toastedIds.current.has(a.id)) {
          toastedIds.current.add(a.id);
          toast.warning(`Critical Alert: ${a.description}`, {
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
    const interval = setInterval(fetchAnomalies, 30000);
    return () => clearInterval(interval);
  }, [fetchAnomalies]);

  const handleAcknowledge = async (id: string) => {
    try {
      await aiClient.dashboard.acknowledgeAnomaly(id);
      toast.success("Anomaly acknowledged.");
      fetchAnomalies();
    } catch (err) {
      toast.error(`Failed to acknowledge: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-[oklch(0.62_0.18_45)/0.15] text-[oklch(0.62_0.18_45)] border-[oklch(0.62_0.18_45)/0.3] font-bold";
      case "high":
        return "bg-badge-orange/15 text-badge-orange-foreground border-badge-orange/30 font-semibold";
      case "medium":
        return "bg-warning/15 text-warning-foreground border-warning/30 font-medium";
      default:
        return "bg-muted text-muted-foreground border-border/80 font-medium";
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

  return (
    <Card className="bg-card border-border shadow-none h-full flex flex-col justify-between">
      <div>
        <CardHeader className="p-lg flex flex-row items-start justify-between">
          <div className="space-y-sm">
            <div className="flex items-center gap-sm">
              <ShieldAlert className="w-5 h-5 text-warning" />
              <CardTitle className="text-headline-sm font-bold text-foreground">Things That Need Attention</CardTitle>
            </div>
            <CardDescription>System anomalies and trend disruptions requiring intervention</CardDescription>
          </div>
          {anomalies.length > 0 && (
            <Badge className="bg-[oklch(0.62_0.18_45)/0.15] text-[oklch(0.62_0.18_45)] font-bold">
              {anomalies.length} Alerts
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-lg pt-0 space-y-md max-h-[300px] overflow-y-auto">
          {anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-xl text-center space-y-sm">
              <CheckCircle2 className="w-8 h-8 text-success" />
              <div className="text-body-md font-semibold text-foreground">All Clear</div>
              <p className="text-body-sm text-muted-foreground max-w-xs">
                No active anomalies or capacity alerts detected at this time.
              </p>
            </div>
          ) : (
            anomalies.map((a, index) => (
              <div
                key={a.id ?? index}
                className="flex flex-col md:flex-row md:items-center justify-between gap-md border border-border/80 rounded-xl p-md bg-muted/20 hover:bg-muted/40 transition-all duration-300 animate-in fade-in duration-300"
              >
                <div className="space-y-sm flex-1">
                  <div className="flex items-center gap-sm flex-wrap">
                    <Badge variant="outline" className={getSeverityBadgeClass(a.severity)}>
                      {a.severity.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
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
            ))
          )}
        </CardContent>
      </div>
    </Card>
  );
}
