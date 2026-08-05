"use client";

import React, { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCampaign } from "@/hooks/useCampaign";
import { crmClient } from "@/lib/api/crm-client";
import { CampaignChannelBadge } from "./CampaignChannelBadge";
import { CampaignStatusBadge } from "./CampaignStatusBadge";

interface CampaignDetailSheetProps {
  campaignId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onShowToast: (msg: string) => void;
}

export function CampaignDetailSheet({ campaignId, onClose, onRefresh, onShowToast }: CampaignDetailSheetProps) {
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const [isSending, setIsSending] = useState(false);

  if (!campaignId) return null;

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await crmClient.campaigns.updateStatus(campaignId, newStatus);
      onShowToast(`Campaign status changed to ${newStatus}.`);
      onRefresh();
      onClose();
    } catch {
      onShowToast("Failed to update campaign status.");
    }
  };

  const handleSendEmail = async () => {
    if (!campaignId) return;
    setIsSending(true);
    try {
      const res = await crmClient.campaigns.send(campaignId);
      if (res.sentCount === 0) {
        onShowToast(res.message || "Failed to dispatch email campaign: 0 recipients reached.");
      } else if (res.failedCount > 0) {
        onShowToast(`Warning: ${res.message}`);
      } else {
        onShowToast(res.message || "Campaign email dispatched!");
      }
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch email campaign.";
      onShowToast(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={!!campaignId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[100vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-md sm:p-lg rounded-lg">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-xl font-bold">{campaign?.title ?? "Campaign Details"}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Subject: {campaign?.subject}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-xl text-center text-sm text-muted-foreground">Loading campaign details...</div>
        ) : campaign ? (
          <div className="space-y-4 py-sm text-sm">
            <div className="flex items-center justify-between border-b border-border pb-sm">
              <span className="text-muted-foreground font-medium">Status</span>
              <CampaignStatusBadge status={campaign.status} />
            </div>

            <div className="flex items-center justify-between border-b border-border pb-sm">
              <span className="text-muted-foreground font-medium">Target Audience</span>
              <span className="text-xs bg-muted text-foreground px-sm py-0.5 rounded font-medium">
                {campaign.targetAudience === "Specific"
                  ? `Specific Recipients (${(campaign.targetCustomerIds?.length ?? 0) + (campaign.targetEmails?.length ?? 0)} targeted)`
                  : campaign.targetAudience === "Regular"
                  ? "Regular Customers Only"
                  : campaign.targetAudience === "InstitutionalBuyer"
                  ? "Institutional Buyers Only"
                  : "All Active Contacts"}
              </span>
            </div>

            {campaign.targetEmails && campaign.targetEmails.length > 0 && (
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium block">Typed Specific Emails</span>
                <div className="flex flex-wrap gap-xs font-mono text-[11px]">
                  {campaign.targetEmails.map((email) => (
                    <span key={email} className="bg-muted px-sm py-0.5 rounded text-foreground">
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium block">Target Channels</span>
              <div className="flex flex-wrap gap-xs.5 pt-xs">
                {campaign.channels.map((ch) => (
                  <CampaignChannelBadge key={ch} channel={ch} />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground font-medium block">Description</span>
              <p className="bg-muted/30 p-sm.5 rounded text-xs text-foreground whitespace-pre-wrap">
                {campaign.description}
              </p>
            </div>

            {campaign.imageUrl && (
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium block">Banner Image</span>
                <img src={campaign.imageUrl} alt="Campaign banner" className="w-full h-36 object-cover rounded-md border" />
              </div>
            )}

            {campaign.schedule && (
              <div className="space-y-1 bg-muted/20 p-sm.5 rounded border border-border text-xs">
                <span className="font-semibold block mb-xs">Schedule Strategy ({campaign.schedule.scheduleType})</span>
                {campaign.schedule.recurrenceDays && campaign.schedule.recurrenceDays.length > 0 && (
                  <div>Days: {campaign.schedule.recurrenceDays.join(", ")}</div>
                )}
                {campaign.schedule.startDate && <div>Start: {new Date(campaign.schedule.startDate).toLocaleString()}</div>}
                {campaign.schedule.endDate && <div>End: {new Date(campaign.schedule.endDate).toLocaleString()}</div>}
              </div>
            )}


            <div className="pt-md flex flex-wrap justify-end gap-sm border-t border-border">
              {campaign.channels.some((ch) => ch.toLowerCase() === "email") && campaign.status === "Active" && (
                <Button variant="default" disabled={isSending} onClick={handleSendEmail} className="gap-xs.5">
                  <Mail className="w-4 h-4" />
                  {isSending ? "Sending..." : "Send Email Now"}
                </Button>
              )}
              {campaign.status === "Draft" && (
                <Button onClick={() => handleUpdateStatus("Active")}>
                  Activate Campaign
                </Button>
              )}
              {campaign.status === "Active" && (
                <Button variant="destructive" onClick={() => handleUpdateStatus("Ended")}>
                  End Campaign
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-xl text-center text-sm text-destructive">Campaign not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
