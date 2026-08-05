"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import { CampaignChannel } from "@/types/campaign";

const CHANNELS: CampaignChannel[] = ["Email", "InApp"];

interface CampaignChannelPickerProps {
  selectedChannels: CampaignChannel[];
  onChange: (channels: CampaignChannel[]) => void;
}

export function CampaignChannelPicker({
  selectedChannels,
  onChange,
}: CampaignChannelPickerProps) {
  return (
    <div>
      <FormLabel>Marketing Channels *</FormLabel>
      <div className="flex flex-wrap gap-sm mt-xs.5">
        {CHANNELS.map((ch) => {
          const isSelected = selectedChannels.includes(ch);
          return (
            <Button
              type="button"
              key={ch}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const updated = isSelected
                  ? selectedChannels.filter((c) => c !== ch)
                  : [...selectedChannels, ch];
                onChange(updated);
              }}
            >
              {ch === "InApp" ? "In-App" : ch}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
