"use client";

import React, { useState } from "react";
import { Plus, Upload, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { usePromotions } from "@/hooks/usePromotions";
import { useTemplates } from "@/hooks/useTemplates";
import { useCustomers } from "@/hooks/useCustomers";
import { CampaignChannel, CreateCampaignInput, RecurrenceDay, ScheduleType } from "@/types/campaign";

interface CampaignFormSheetProps {
  onSuccess: () => void;
  onShowToast: (msg: string) => void;
}

const CHANNELS: CampaignChannel[] = ["Email", "InApp", "Facebook", "Twitter", "Instagram"];
const DAYS: RecurrenceDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function CampaignFormSheet({ onSuccess, onShowToast }: CampaignFormSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPromotions, setSelectedPromotions] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customEmailsText, setCustomEmailsText] = useState("");
  const { data: promotions } = usePromotions("Active");
  const { data: templates } = useTemplates();
  const { customers } = useCustomers({ customerType: "Contact", pageSize: 50 });

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

      const payload: CreateCampaignInput = {
        ...values,
        status: targetStatus,
        templateId: values.templateId || undefined,
        targetCustomerIds: values.targetAudience === "Specific" && selectedCustomerIds.length > 0 ? selectedCustomerIds : undefined,
        targetEmails: values.targetAudience === "Specific" && parsedEmails.length > 0 ? parsedEmails : undefined,
      };

      const created = await crmClient.campaigns.create(payload);

      if (selectedPromotions.length > 0) {
        await crmClient.campaigns.attachPromotions(created.id, selectedPromotions);
      }

      onShowToast(`Campaign ${created.title} saved as ${targetStatus}!`);
      form.reset();
      setSelectedPromotions([]);
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
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg sm:rounded-xl">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">Create Campaign</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure target channels, scheduling, and attached promotions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4 py-2">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Title *</FormLabel>
                <FormControl><Input placeholder="e.g. Q4 Product Announcement" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem>
                <FormLabel>Subject Line *</FormLabel>
                <FormControl><Input placeholder="e.g. Introducing our new features!" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl><Textarea rows={3} placeholder="Campaign copy and internal notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Channels Multi-Select */}
            <FormField control={form.control} name="channels" render={({ field }) => (
              <FormItem>
                <FormLabel>Marketing Channels *</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map((ch) => {
                    const isSelected = field.value.includes(ch);
                    return (
                      <Button
                        type="button" key={ch} variant={isSelected ? "default" : "outline"} size="sm"
                        onClick={() => {
                          const updated = isSelected ? field.value.filter((c) => c !== ch) : [...field.value, ch];
                          field.onChange(updated);
                        }}
                      >
                        {ch}
                      </Button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )} />

            {/* Target Audience Filter */}
            <FormField control={form.control} name="targetAudience" render={({ field }) => (
              <FormItem>
                <FormLabel>Target Audience</FormLabel>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={field.value ?? "All"}
                  onChange={field.onChange}
                >
                  <option value="All">All Active Contacts</option>
                  <option value="Regular">Regular Customers Only</option>
                  <option value="InstitutionalBuyer">Institutional Buyers Only</option>
                  <option value="Specific">Specific Customers / Emails</option>
                </select>
              </FormItem>
            )} />

            {/* Specific Customers & Emails Picker */}
            {form.watch("targetAudience") === "Specific" && (
              <div className="space-y-4 border border-border rounded-lg p-3 bg-muted/10">
                {customers.length > 0 && (
                  <div className="space-y-2">
                    <FormLabel className="text-xs font-semibold">Select Customer Contacts</FormLabel>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 border rounded p-2 bg-background">
                      {customers.map((c) => {
                        const checked = selectedCustomerIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex items-center justify-between text-xs p-1 rounded hover:bg-muted/50 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(val) => {
                                  setSelectedCustomerIds((prev) =>
                                    val ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                                  );
                                }}
                              />
                              <span className="font-medium">{c.displayName}</span>
                            </div>
                            <span className="text-muted-foreground">{c.email}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <FormLabel className="text-xs font-semibold">Specific Email Addresses (Typed)</FormLabel>
                  <Textarea
                    rows={2}
                    placeholder="Enter emails separated by commas or new lines, e.g. john@company.com, partner@org.com"
                    value={customEmailsText}
                    onChange={(e) => setCustomEmailsText(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    You can type any specific email addresses here to receive the campaign.
                  </span>
                </div>
              </div>
            )}

            {/* Schedule Strategy */}
            <FormField control={form.control} name="scheduleType" render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Options</FormLabel>
                <div className="flex gap-2">
                  {(["SendNow", "Scheduled", "Recurring"] as ScheduleType[]).map((st) => (
                    <Button
                      type="button" key={st} variant={field.value === st ? "default" : "outline"} size="sm" className="flex-1"
                      onClick={() => field.onChange(st)}
                    >
                      {st === "SendNow" ? "Send Now" : st}
                    </Button>
                  ))}
                </div>
              </FormItem>
            )} />

            {/* Recurrence Days if Recurring */}
            {form.watch("scheduleType") === "Recurring" && (
              <div className="space-y-2 border border-border rounded-lg p-3">
                <FormLabel className="text-xs font-semibold">Recurring Days (Mon/Tue/Wed)</FormLabel>
                <div className="flex flex-wrap gap-3">
                  {DAYS.map((day) => (
                    <label key={day} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={form.watch("recurrenceDays")?.includes(day) ?? false}
                        onCheckedChange={(checked) => {
                          const curr = form.getValues("recurrenceDays") ?? [];
                          const updated = checked ? [...curr, day] : curr.filter((d) => d !== day);
                          form.setValue("recurrenceDays", updated);
                        }}
                      />
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Dates for Scheduled/Recurring */}
            {form.watch("scheduleType") !== "SendNow" && (
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* Template Picker */}
            <FormField control={form.control} name="templateId" render={({ field }) => (
              <FormItem>
                <FormLabel>Email Template (Optional)</FormLabel>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={field.value ?? ""} onChange={field.onChange}
                >
                  <option value="">Default Clean Email Layout</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.channel})</option>
                  ))}
                </select>
              </FormItem>
            )} />

            {/* Image Upload */}
            <div className="space-y-1">
              <FormLabel>Optional Banner Image</FormLabel>
              <div className="flex items-center gap-2">
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                {isUploading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              </div>
            </div>

            {/* CRM-004: Multi-Select Promotion Picker */}
            {promotions.length > 0 && (
              <div className="space-y-2 border border-border rounded-lg p-3">
                <FormLabel className="text-xs font-semibold">Attach Promotions (Multi-Select)</FormLabel>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {promotions.map((p) => {
                    const checked = selectedPromotions.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) => {
                              setSelectedPromotions((prev) =>
                                val ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                              );
                            }}
                          />
                          <span className="font-medium text-foreground">{p.title}</span>
                        </div>
                        <span className="text-muted-foreground">{p.promotionType}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2">
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
