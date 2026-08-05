"use client";

import React, { useEffect, useState } from "react";
import { User, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket } from "@/types/ticket";
import { Message } from "@/types/message";
import { aiClient } from "@/lib/api/ai-client";

interface CustomerContextPanelProps {
  ticket: Ticket | null;
  messages: Message[];
  onUseTemplate: (text: string) => void;
}

export function CustomerContextPanel({ ticket, messages, onUseTemplate }: CustomerContextPanelProps) {
  const [smartReply, setSmartReply] = useState<string>("I'm looking into your request now and will get back to you shortly.");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    
    // We only want to generate a new smart reply when there are messages
    // and when it's the customer's turn, but for now we'll do it on every new message
    // with a slight debounce to avoid spamming the API.
    const generateReply = async () => {
      setIsGenerating(true);
      try {
        const messageTexts = messages.map(m => m.content);
        const res = await aiClient.tickets.generateSmartReply(ticket.id, messageTexts);
        setSmartReply(res.smart_reply);
      } catch (err) {
        console.error("Failed to generate smart reply:", err);
      } finally {
        setIsGenerating(false);
      }
    };

    const timer = setTimeout(() => {
      generateReply();
    }, 1000);

    return () => clearTimeout(timer);
  }, [ticket, messages]);

  if (!ticket) {
    return (
      <div className="hidden lg:flex w-72 border-l border-border flex-col h-full bg-card p-lg items-center justify-center text-muted-foreground text-body-sm shrink-0">
        No context available
      </div>
    );
  }

  return (
    <div className="hidden lg:flex w-72 border-l border-border flex-col h-full bg-card p-lg space-y-lg overflow-y-auto shrink-0">
      <h3 className="text-label-md font-bold text-foreground flex items-center gap-sm">
        <User className="w-4 h-4" />
        Customer Context
      </h3>

      {/* Client Identity */}
      <div className="space-y-sm bg-muted/50 border border-border rounded-xl p-md">
        <p className="text-label-sm text-muted-foreground font-mono">CLIENT IDENTITY</p>
        <div className="space-y-xs">
          <h4 className="text-body-sm font-bold text-foreground">{ticket.customerName}</h4>
          <p className="text-label-sm text-muted-foreground font-mono truncate">{ticket.customerId}</p>
        </div>
      </div>

      {/* Financial Metrics Placeholder */}
      <div className="space-y-sm bg-muted/50 border border-border rounded-xl p-md">
        <p className="text-label-sm text-muted-foreground font-mono">FINANCIAL METRICS</p>
        <div className="flex justify-between items-baseline">
          <span className="text-body-sm text-muted-foreground">LTV (CLV)</span>
          {/* TODO: Wire CLV and churn risk from the AI Analytics service once the ai-analytics → web-crm integration sprint is planned. */}
          <span className="text-label-md font-bold text-foreground">—</span>
        </div>
      </div>

      {/* AI Predictive Insights Placeholder */}
      <div className="space-y-sm bg-muted/50 border border-border rounded-xl p-md">
        <p className="text-label-sm text-muted-foreground font-mono">AI PREDICTIVE INSIGHTS</p>
        <div className="flex justify-between items-center">
          <span className="text-body-sm text-muted-foreground">Churn Risk</span>
          <Badge variant="outline" className="text-label-sm font-bold">
            —
          </Badge>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-muted-foreground/30 w-0" />
        </div>
      </div>

      {/* AI Suggested Smart Reply */}
      <div className="space-y-sm border border-border rounded-xl p-md bg-muted text-foreground">
        <div className="flex items-center gap-xs text-label-sm text-foreground font-mono">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          AI SUGGESTED SMART REPLY
        </div>
        <div className="text-body-sm italic leading-relaxed text-muted-foreground min-h-[4rem] relative">
          {isGenerating ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          ) : (
            <>&quot;{smartReply}&quot;</>
          )}
        </div>
        <Button
          variant="default"
          size="sm"
          className="w-full bg-primary text-primary-foreground font-bold text-label-sm mt-xs shadow-xs"
          onClick={() => onUseTemplate(smartReply)}
          disabled={isGenerating}
        >
          Use Template
        </Button>
      </div>
    </div>
  );
}
