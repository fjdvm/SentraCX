"use client";

import React, { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BotContextPanelProps {
  botSummary: string;
}

export function BotContextPanel({ botSummary }: BotContextPanelProps) {
  const [isBotSummaryOpen, setIsBotSummaryOpen] = useState(true);

  if (!botSummary) return null;

  return (
    <div className="mx-lg mt-md shrink-0 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center justify-between px-md py-sm border-b border-primary/10 bg-primary/10">
        <span className="text-label-sm font-bold text-primary flex items-center gap-xs">
          <Bot className="w-3.5 h-3.5" />
          Bot-First Conversation
          <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 ml-xs">
            Escalated
          </Badge>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs font-semibold px-sm hover:bg-primary/10 text-primary"
          onClick={() => setIsBotSummaryOpen(!isBotSummaryOpen)}
        >
          {isBotSummaryOpen ? "Hide" : "Show context"}
        </Button>
      </div>
      {isBotSummaryOpen && (
        <div className="px-md py-sm">
          <p className="text-body-sm leading-relaxed text-foreground font-medium whitespace-pre-wrap">
            {botSummary}
          </p>
        </div>
      )}
    </div>
  );
}
