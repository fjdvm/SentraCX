"use client";

import React, { useEffect, useState, useCallback } from "react";
import { aiClient } from "@/lib/api/ai-client";
import { crmClient } from "@/lib/api/crm-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldAlert, Check, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Anomaly {
  anomaly_id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "acknowledged";
  detected_at: string;
}

interface TaskItem {
  id: string;
  originalId: string;
  type: "anomaly" | "unclaimed_ticket" | "unreplied_ticket" | "draft_campaign" | "new_customer";
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  date: string;
  actionLabel: string;
  actionHref?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const [anomaliesRes, allTicketsRes, draftCampaignsRes, customersRes] = await Promise.all([
        aiClient.dashboard.getAnomalies().catch(() => ({ anomalies: [] })),
        crmClient.tickets.list(1, 100).catch(() => ({ items: [] })),
        crmClient.campaigns.list("Draft").catch(() => []),
        crmClient.customers.list(1, 20).catch(() => ({ items: [] }))
      ]);

      const newTasks: TaskItem[] = [];

      // Anomalies
      const openAnomalies = (anomaliesRes.anomalies || []).filter(
        (a: Anomaly) => a.status !== "resolved" && a.status !== "acknowledged"
      );
      
      openAnomalies.forEach((a: Anomaly) => {
        newTasks.push({
          id: `anomaly-${a.anomaly_id}`,
          originalId: a.anomaly_id,
          type: "anomaly",
          title: "System Anomaly",
          description: a.description,
          severity: a.severity,
          date: a.detected_at,
          actionLabel: "Acknowledge",
        });
      });

      // Unclaimed Tickets
      const allTickets = allTicketsRes.items || [];
      const unclaimedTickets = allTickets.filter((t: any) => t.status === "Unclaimed");
      unclaimedTickets.forEach((t: any) => {
        newTasks.push({
          id: `unclaimed-${t.id}`,
          originalId: t.id,
          type: "unclaimed_ticket",
          title: "Unclaimed Ticket",
          description: t.title,
          severity: "high",
          date: t.createdAt,
          actionLabel: "Claim",
        });
      });

      // Unreplied Messages
      const unrepliedTickets = allTickets.filter((t: any) => 
        (t.status === "Claimed" || t.status === "Ongoing") && t.unreadMessageCount && t.unreadMessageCount > 0
      );
      unrepliedTickets.forEach((t: any) => {
        newTasks.push({
          id: `unreplied-${t.id}`,
          originalId: t.id,
          type: "unreplied_ticket",
          title: "Unreplied Message",
          description: `Ticket: ${t.title} (${t.unreadMessageCount} unread)`,
          severity: "medium",
          date: t.lastMessageAt || t.updatedAt || t.createdAt,
          actionLabel: "Reply",
          actionHref: `/conversations?ticketId=${t.id}`,
        });
      });

      // Draft Campaigns
      const draftCampaigns = draftCampaignsRes || [];
      draftCampaigns.forEach((c: any) => {
        newTasks.push({
          id: `campaign-${c.id}`,
          originalId: c.id,
          type: "draft_campaign",
          title: "Draft Campaign",
          description: c.title,
          severity: "low",
          date: c.createdAt,
          actionLabel: "Review",
          actionHref: `/campaigns/${c.id}`,
        });
      });

      // New Customers
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const newCustomers = (customersRes.items || []).filter((c: any) => new Date(c.createdAt) >= threeDaysAgo);
      newCustomers.forEach((c: any) => {
        newTasks.push({
          id: `customer-${c.id}`,
          originalId: c.id,
          type: "new_customer",
          title: "New Customer Sign Up",
          description: `${c.displayName} (${c.email})`,
          severity: "low",
          date: c.createdAt,
          actionLabel: "View Profile",
          actionHref: `/customers/${c.id}`,
        });
      });

      // Sort by severity then date
      const severityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      newTasks.sort((a, b) => {
        const scoreA = severityScore[a.severity] || 0;
        const scoreB = severityScore[b.severity] || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setTasks(newTasks);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAcknowledgeAnomaly = async (id: string) => {
    try {
      await aiClient.dashboard.acknowledgeAnomaly(id);
      toast.success("Anomaly acknowledged.");
      fetchTasks();
    } catch (err) {
      toast.error(`Failed to acknowledge: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const handleClaimTicket = async (id: string) => {
    try {
      await crmClient.tickets.claim(id);
      toast.success("Ticket claimed successfully.");
      fetchTasks();
    } catch (err) {
      toast.error(`Failed to claim ticket: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const handleAction = (task: TaskItem) => {
    if (task.type === "anomaly") {
      handleAcknowledgeAnomaly(task.originalId);
    } else if (task.type === "unclaimed_ticket") {
      handleClaimTicket(task.originalId);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-badge-destructive text-badge-destructive-foreground border-badge-destructive/30 font-bold";
      case "high":
        return "bg-badge-orange text-badge-orange-foreground border-badge-orange/30 font-semibold";
      case "medium":
        return "bg-badge-warning text-badge-warning-foreground border-badge-warning/30 font-medium";
      default:
        return "bg-badge-info text-badge-info-foreground border-badge-info/30 font-medium";
    }
  };

  return (
    <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-2xl max-w-7xl mx-auto">
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div className="space-y-sm">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Tasks & Attention</h1>
          <p className="text-body-md text-muted-foreground">A unified feed of items requiring your attention</p>
        </div>
      </div>
      
      {isLoading ? (
        <Card className="bg-card border-border shadow-none flex flex-col">
          <CardContent className="py-md pt-0 space-y-md">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-none flex flex-col">
          <CardHeader className="pb-md p-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
            <div className="flex items-center gap-sm">
              <ShieldAlert className="w-5 h-5 text-warning" />
              <CardTitle className="text-title-lg font-bold text-foreground">Action Items</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-md pt-0 space-y-md">
            {tasks.length === 0 ? (
              <div className="flex flex-row items-center justify-center py-xl text-left gap-md">
                <CheckCircle2 className="w-10 h-10 text-success shrink-0" />
                <div className="flex flex-col text-left">
                  <div className="text-body-lg font-semibold text-foreground">All Clear</div>
                  <p className="text-body-md text-muted-foreground">
                    No active anomalies, open tickets, or capacity alerts detected at this time.
                  </p>
                </div>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-md border border-border/80 rounded-xl p-md bg-muted/20 hover:bg-muted/40 transition-all duration-300 animate-in fade-in duration-300"
                >
                  <div className="space-y-xs flex-1">
                    <div className="flex items-center gap-sm flex-wrap">
                      <Badge variant="outline" className={getSeverityBadgeClass(task.severity)}>
                        {task.title.toUpperCase()}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {formatTimeAgo(task.date)}
                      </span>
                    </div>
                    <p className="text-body-sm font-medium text-foreground">{task.description}</p>
                  </div>
                  <div className="flex items-center justify-end">
                    {task.actionHref ? (
                      <Link href={task.actionHref} passHref>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-xs border-border/80 text-body-sm bg-background hover:bg-muted duration-300 font-medium"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          {task.actionLabel}
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-xs border-border/80 text-body-sm bg-background hover:bg-muted duration-300 font-medium"
                        onClick={() => handleAction(task)}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {task.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
