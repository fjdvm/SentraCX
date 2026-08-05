"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { AiInput as Input } from "@/components/ui/ai-input";
import { AiTextarea as Textarea } from "@/components/ui/ai-textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { crmClient } from "@/lib/api/crm-client";
import { useTemplates } from "@/hooks/useTemplates";
import { CampaignChannel, CreateCampaignInput } from "@/types/campaign";
import { CampaignChannelPicker } from "./CampaignChannelPicker";
import { CampaignAudiencePicker } from "./CampaignAudiencePicker";
import { CampaignSchedulePicker } from "./CampaignSchedulePicker";
import { CampaignMediaPicker } from "./CampaignMediaPicker";

interface CampaignFormSheetProps {
  onSuccess: () => void;
  onShowToast: (msg: string) => void;
}

export function CampaignFormSheet({ onSuccess, onShowToast }: CampaignFormSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customEmailsText, setCustomEmailsText] = useState("");
  const { data: templates } = useTemplates();

  const form = useForm<CreateCampaignInput>({
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      channels: ["Email"],
      targetAudience: "All",
      scheduleType: "SendNow",
      recurrenceDays: [],
      imageUrl: "",
      templateId: "",
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await crmClient.upload.uploadFile(file, "campaigns");
      form.setValue("imageUrl", res.url);
      onShowToast("Image uploaded successfully!");
    } catch {
      onShowToast("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: CreateCampaignInput, targetStatus: "Draft" | "Active") => {
    if (!values.title.trim() || !values.subject.trim() || !values.description.trim()) {
      onShowToast("Please fill in all required fields.");
      return;
    }
    if (values.channels.length === 0) {
      onShowToast("Please select at least one channel.");
      return;
    }

    try {
      const parsedEmails = customEmailsText
        .split(/[\n,;]+/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      if (values.targetAudience === "Specific" && selectedCustomerIds.length === 0 && parsedEmails.length === 0) {
        onShowToast("Please select at least one contact or enter at least one email address for Specific audience.");
        return;
      }

      const payload: CreateCampaignInput = {
        ...values,
        status: targetStatus,
        templateId: values.templateId || undefined,
        targetCustomerIds: values.targetAudience === "Specific" && selectedCustomerIds.length > 0 ? selectedCustomerIds : undefined,
        targetEmails: values.targetAudience === "Specific" && parsedEmails.length > 0 ? parsedEmails : undefined,
      };

      const created = await crmClient.campaigns.create(payload);

      onShowToast(`Campaign ${created.title} saved as ${targetStatus}!`);
      form.reset();
      setSelectedCustomerIds([]);
      setCustomEmailsText("");
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : "Failed to create campaign");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if (!val) form.reset(); setIsOpen(val); }}>
      <DialogTrigger asChild>
        <Button className="self-start sm:self-center">
          <Plus className="w-4 h-4 mr-sm" />
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-md sm:p-lg rounded-lg sm:rounded-xl">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">Create Campaign</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure target channels and scheduling strategy.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4 py-sm">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Title *</FormLabel>
                <FormControl><Input context="Marketing campaign title." placeholder="e.g. Q4 Product Announcement" autoComplete="on" spellCheck={true} data-gramm="true" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject Line *</FormLabel>
                <FormControl><Input context="Marketing campaign email subject line." placeholder="e.g. Introducing our new features!" autoComplete="on" spellCheck={true} data-gramm="true" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl><Textarea context="Marketing campaign copy." rows={3} placeholder="Campaign copy and internal notes..." autoComplete="on" spellCheck={true} data-gramm="true" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Channels Multi-Select */}
            <FormField control={form.control} name="channels" render={({ field }) => (
              <FormItem>
                <CampaignChannelPicker selectedChannels={field.value} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )} />

            {/* Target Audience Filter with Specific Email Search */}
            <FormField control={form.control} name="targetAudience" render={({ field }) => (
              <CampaignAudiencePicker
                targetAudience={field.value ?? "All"}
                onAudienceChange={field.onChange}
                selectedCustomerIds={selectedCustomerIds}
                onSelectedCustomerIdsChange={setSelectedCustomerIds}
                customEmailsText={customEmailsText}
                onCustomEmailsTextChange={setCustomEmailsText}
              />
            )} />

            {/* Schedule Strategy */}
            <CampaignSchedulePicker
              scheduleType={form.watch("scheduleType")}
              onScheduleTypeChange={(st) => form.setValue("scheduleType", st)}
              recurrenceDays={form.watch("recurrenceDays") ?? []}
              onRecurrenceDaysChange={(days) => form.setValue("recurrenceDays", days)}
              startDate={form.watch("startDate")}
              onStartDateChange={(d) => form.setValue("startDate", d)}
              endDate={form.watch("endDate")}
              onEndDateChange={(d) => form.setValue("endDate", d)}
            />

            {/* Template & Image Media Picker */}
            <CampaignMediaPicker
              templateId={form.watch("templateId")}
              onTemplateIdChange={(id) => form.setValue("templateId", id)}
              templates={templates}
              isUploading={isUploading}
              onImageUpload={handleImageUpload}
            />

            <DialogFooter className="pt-md flex flex-col-reverse sm:flex-row justify-end gap-sm">
              <Button type="button" variant="outline" onClick={() => form.handleSubmit((v) => onSubmit(v, "Draft"))()}>
                Save as Draft
              </Button>
              <Button type="button" onClick={() => form.handleSubmit((v) => onSubmit(v, "Active"))()}>
                Deploy Campaign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
