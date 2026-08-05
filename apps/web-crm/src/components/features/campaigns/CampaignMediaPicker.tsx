"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TemplateItem {
  id: string;
  name: string;
  channel: string;
}

interface CampaignMediaPickerProps {
  templateId?: string;
  onTemplateIdChange: (value: string) => void;
  templates: TemplateItem[];
  isUploading: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CampaignMediaPicker({
  templateId,
  onTemplateIdChange,
  templates,
  isUploading,
  onImageUpload,
}: CampaignMediaPickerProps) {
  return (
    <div className="space-y-4">
      <FormItem>
        <FormLabel>Email Template (Optional)</FormLabel>
        <select
          className="w-full border border-input rounded-md px-sm py-sm text-sm bg-background"
          value={templateId ?? ""}
          onChange={(e) => onTemplateIdChange(e.target.value)}
        >
          <option value="">Default Clean Email Layout</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.channel})
            </option>
          ))}
        </select>
      </FormItem>

      <div className="space-y-1">
        <Label>Optional Banner Image</Label>
        <div className="flex items-center gap-sm">
          <Input
            type="file"
            accept="image/*"
            onChange={onImageUpload}
            disabled={isUploading}
          />
          {isUploading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        </div>
      </div>
    </div>
  );
}
