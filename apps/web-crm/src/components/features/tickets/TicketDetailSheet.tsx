"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTicket } from "@/hooks/useTicket";
import { crmClient } from "@/lib/api/crm-client";
import { MessageSquare } from "lucide-react";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { AiBadge } from "@/components/ui/ai-badge";

interface TicketDetailSheetProps {
  ticketId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onShowToast: (msg: string) => void;
}

export function TicketDetailSheet({ ticketId, onClose, onRefresh, onShowToast }: TicketDetailSheetProps) {
  const { data: ticket, isLoading } = useTicket(ticketId);

  if (!ticketId) return null;

  const handleClaim = async () => {
    try {
      await crmClient.tickets.claim(ticketId);
      onShowToast("Ticket claimed successfully.");
      onRefresh();
      onClose();
    } catch {
      onShowToast("Failed to claim ticket.");
    }
  };

  const handleUnclaim = async () => {
    try {
      await crmClient.tickets.unclaim(ticketId);
      onShowToast("Ticket status set to Unclaimed.");
      onRefresh();
      onClose();
    } catch {
      onShowToast("Failed to unclaim ticket.");
    }
  };

  const handleComplete = async () => {
    try {
      await crmClient.tickets.updateStatus(ticketId, "Completed");
      onShowToast("Ticket marked as Completed.");
      onRefresh();
      onClose();
    } catch {
      onShowToast("Failed to complete ticket.");
    }
  };

  return (
    <Dialog open={!!ticketId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[100vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-md sm:p-lg rounded-lg">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-xl font-bold">{ticket?.title ?? "Ticket Details"}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Customer: {ticket?.customerName ?? "Unknown"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-xl text-center text-sm text-muted-foreground">Loading ticket details...</div>
        ) : ticket ? (
          <div className="space-y-4 py-sm text-sm">
            <div className="flex items-center justify-between border-b border-border pb-sm">
              <span className="text-muted-foreground font-medium">Status</span>
              <TicketStatusBadge status={ticket.status} />
            </div>

            <div className="flex items-center justify-between border-b border-border pb-sm">
              <span className="text-muted-foreground font-medium">Category</span>
              {ticket.category && ticket.category !== "Uncategorized" ? (
                <AiBadge>{ticket.category}</AiBadge>
              ) : (
                <span className="text-foreground">{ticket.category ?? "Uncategorized"}</span>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-border pb-sm">
              <span className="text-muted-foreground font-medium">Sentiment</span>
              {ticket.sentiment && ticket.sentiment !== "neutral" ? (
                <AiBadge>{ticket.sentiment}</AiBadge>
              ) : (
                <span className="text-foreground">{ticket.sentiment ?? "neutral"}</span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium block">Issue Description</span>
              <p className="bg-muted/30 p-sm.5 rounded text-xs text-foreground whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {ticket.imageUrl && (
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium block">Attachment</span>
                <img src={ticket.imageUrl} alt="Ticket attachment" className="w-full h-36 object-cover rounded-md border" />
              </div>
            )}

            <div className="flex justify-between text-xs py-xs border-t border-border">
              <span className="text-muted-foreground font-medium">Created At</span>
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>

            <div className="pt-md flex flex-wrap justify-end gap-sm border-t border-border">
              {(ticket.status === "Claimed" || ticket.status === "Ongoing") && (
                <Button variant="outline" asChild>
                  <Link href={`/conversations?ticketId=${ticket.id}`}>
                    <MessageSquare className="w-4 h-4 mr-xs.5" /> Message
                  </Link>
                </Button>
              )}

              {(ticket.status === "Unclaimed" || (ticket.status === "Ongoing" && !ticket.assignedToId)) && (
                <Button onClick={handleClaim}>Claim Ticket</Button>
              )}

              {(ticket.status === "Claimed" || ticket.status === "Ongoing") && (
                <>
                  <Button variant="outline" onClick={handleUnclaim}>Unclaim</Button>
                  <Button onClick={handleComplete}>Mark Completed</Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="py-xl text-center text-sm text-destructive">Ticket not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
