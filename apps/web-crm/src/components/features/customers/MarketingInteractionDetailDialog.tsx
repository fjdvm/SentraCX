"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MarketingInteraction } from "@/types/customer";

interface MarketingInteractionDetailDialogProps {
  interaction: MarketingInteraction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarketingInteractionDetailDialog({
  interaction,
  open,
  onOpenChange,
}: MarketingInteractionDetailDialogProps) {
  if (!interaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-md sm:p-lg rounded-lg sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-md pr-lg">
            <DialogTitle className="text-headline-md font-bold">
              {interaction.title}
            </DialogTitle>
            <Badge variant="outline" className="text-label-sm uppercase">
              {interaction.channel}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-md pt-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-label-sm text-muted-foreground gap-xs pb-sm border-b border-border">
            <span>Type: <strong className="text-foreground font-semibold">{interaction.interactionType}</strong></span>
            <span>Sent At: <strong className="text-foreground font-semibold">{new Date(interaction.sentAt).toLocaleString()}</strong></span>
          </div>

          <div className="space-y-xs">
            <h4 className="text-label-sm font-semibold text-muted-foreground uppercase tracking-wider">Description / Payload</h4>
            <p className="text-body-sm text-foreground p-sm bg-muted/30 rounded-lg border border-border whitespace-pre-wrap">
              {interaction.description || "No description payload logged."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

