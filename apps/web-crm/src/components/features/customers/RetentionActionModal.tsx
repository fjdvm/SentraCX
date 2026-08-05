"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { crmClient } from "@/lib/api/crm-client";
import { Play } from "lucide-react";

export interface RetentionActionCustomer {
  customer_id: string;
  name: string;
  churn_score: number;
  risk_level: string;
  contributing_factors: string[];
  recommended_action: string;
}

interface RetentionActionModalProps {
  customer: RetentionActionCustomer | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function RetentionActionModal({
  customer,
  open,
  onClose,
  onSuccess,
}: RetentionActionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (customer && open) {
      // Pre-fill personalised message based on factors and recommended action
      const factorsText = customer.contributing_factors.length > 0 
        ? `Given the following factors: ${customer.contributing_factors.join(", ")}.`
        : "";
      
      setMessage(`Action Required: ${customer.recommended_action}\n\n${factorsText}\n\nPlease follow up with ${customer.name} immediately to mitigate churn risk.`);
    } else {
      setMessage("");
    }
  }, [customer, open]);

  const handleSubmit = async () => {
    if (!customer) return;

    setIsSubmitting(true);
    try {
      await crmClient.customers.executeRetentionAction(customer.customer_id, {
        riskLevel: customer.risk_level,
        recommendedAction: message,
        churnScore: customer.churn_score,
      });
      onSuccess(`Retention action for ${customer.name} executed successfully.`);
      onClose();
    } catch (err) {
      onSuccess(`Failed to execute action: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Execute Retention Action</DialogTitle>
          <DialogDescription>
            Confirm the details below to mark <strong>{customer.name}</strong> as At-Risk and create a follow-up ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-sm">
          <div className="flex items-center justify-between border border-border p-sm rounded-md bg-muted/20">
            <span className="text-body-sm font-medium">Churn Risk</span>
            <div className="flex items-center gap-sm">
              <Badge variant="outline">{(customer.churn_score * 100).toFixed(0)}%</Badge>
              <Badge className="capitalize">{customer.risk_level}</Badge>
            </div>
          </div>

          <div className="space-y-xs">
            <label className="text-body-sm font-semibold text-foreground">
              Follow-up Ticket Description
            </label>
            <Textarea
              className="min-h-[120px] text-body-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the personalised retention action details..."
            />
          </div>

          <div className="bg-muted/30 p-sm rounded-md border border-border/50 text-body-sm text-muted-foreground space-y-xs">
            <p className="font-semibold text-foreground mb-xs">Preview of actions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Mark {customer.name} as <strong>At-Risk</strong> in CRM</li>
              <li>Create a follow-up ticket assigned to retention team</li>
              <li>Log this retention action</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-xs"></div>
            ) : (
              <Play className="w-4 h-4 mr-xs fill-current" />
            )}
            Execute Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
