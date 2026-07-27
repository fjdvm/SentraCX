"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { aiClient } from "@/lib/api/ai-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, Play, Check } from "lucide-react";

interface AtRiskCustomer {
  customer_id: string;
  name: string;
  churn_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  contributing_factors: string[];
  recommended_action: string;
}

interface AtRiskWatchlistProps {
  onShowToast: (msg: string) => void;
}

export function AtRiskWatchlist({ onShowToast }: AtRiskWatchlistProps) {
  const [customers, setCustomers] = useState<AtRiskCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await aiClient.dashboard.getAtRiskCustomers(5);
      setCustomers(res.customers || []);
    } catch (err) {
      console.error("Failed to load at-risk customers:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleTakeAction = async (customerId: string, actionName: string) => {
    setActioningId(customerId);
    try {
      await aiClient.customers.submitFeedback(customerId, "accepted");
      onShowToast(`Recommended action "${actionName}" executed successfully.`);
      // Refresh list to reflect latest state
      await fetchWatchlist();
    } catch (err) {
      onShowToast(`Failed to execute action: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setActioningId(null);
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive";
      case "high":
        return "secondary"; // High uses warning/secondary depending on styling
      default:
        return "outline";
    }
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-badge-destructive text-badge-destructive-foreground border-badge-destructive/30 font-bold";
      case "high":
        return "bg-badge-orange text-badge-orange-foreground border-badge-orange/30 font-semibold";
      case "medium":
        return "bg-badge-warning text-badge-warning-foreground border-badge-warning/30 font-medium";
      default:
        return "bg-badge-success text-badge-success-foreground border-badge-success/30 font-medium";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-none h-full">
        <CardHeader className="p-lg">
          <CardTitle className="text-headline-sm font-bold text-foreground">At-Risk Watchlist</CardTitle>
          <CardDescription>High churn risk customers needing urgent attention</CardDescription>
        </CardHeader>
        <CardContent className="p-lg pt-0 space-y-md">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-sm border border-border/55 rounded-lg p-md animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
              <div className="h-6 bg-muted rounded w-full mt-sm"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-none h-full flex flex-col">
      <CardHeader className="p-lg shrink-0">
        <div className="flex items-center gap-sm">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <CardTitle className="text-headline-sm font-bold text-foreground">At-Risk Watchlist</CardTitle>
        </div>
        <CardDescription>High churn risk customers needing urgent attention</CardDescription>
      </CardHeader>
      <CardContent className="p-lg pt-0 space-y-md flex-1 overflow-y-auto">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-xl text-center space-y-sm text-muted-foreground text-body-sm h-full">
            No at-risk customers detected.
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.customer_id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-md border border-border/80 rounded-xl p-md bg-muted/10 transition-all hover:bg-muted/20"
            >
              <div className="space-y-sm flex-1">
                <div className="flex items-center gap-sm flex-wrap">
                  <Link
                    href={`/customers/${c.customer_id}`}
                    className="text-body-md font-bold text-foreground hover:underline flex items-center gap-xs"
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    {c.name}
                  </Link>
                  <Badge className={getRiskBadgeClass(c.risk_level)}>
                    {(c.churn_score * 100).toFixed(0)}% Churn Risk
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-xs">
                  {c.contributing_factors.map((factor) => (
                    <span
                      key={factor}
                      className="text-[10px] bg-muted/65 text-muted-foreground px-sm py-0.5 rounded-full font-medium"
                    >
                      {factor}
                    </span>
                  ))}
                </div>

                <div className="text-body-sm text-foreground/80 mt-sm">
                  <span className="font-semibold text-foreground">Next Best Action: </span>
                  {c.recommended_action}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-xs border-border/80 text-body-sm hover:bg-primary hover:text-primary-foreground duration-300 font-medium"
                  disabled={actioningId === c.customer_id}
                  onClick={() => handleTakeAction(c.customer_id, c.recommended_action)}
                >
                  {actioningId === c.customer_id ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-foreground"></div>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Execute NBA
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
