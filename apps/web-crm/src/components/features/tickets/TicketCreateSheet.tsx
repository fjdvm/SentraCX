"use client";

import React, { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CreateTicketInput } from "@/types/ticket";

interface TicketCreateSheetProps {
  customerId?: string;
  onSuccess: () => void;
  onShowToast: (msg: string) => void;
}

export function TicketCreateSheet({ customerId = "00000000-0000-0000-0000-000000000001", onSuccess, onShowToast }: TicketCreateSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<CreateTicketInput>({
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await crmClient.upload.uploadFile(file, "tickets");
      form.setValue("imageUrl", res.url);
      onShowToast("Attachment uploaded successfully.");
    } catch {
      onShowToast("Failed to upload attachment.");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: CreateTicketInput) => {
    if (!values.title.trim() || !values.description.trim()) {
      onShowToast("Please fill in title and description.");
      return;
    }

    try {
      const ticket = await crmClient.tickets.create(values, customerId);
      onShowToast(`Ticket ${ticket.title} created successfully!`);
      form.reset();
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : "Failed to create ticket");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if (!val) form.reset(); setIsOpen(val); }}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-sm" />
          Create Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-md sm:p-lg rounded-lg sm:rounded-xl">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">Create Support Ticket</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Log a new support query into the CRM ticket queue.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-sm">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Account lockout during checkout" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Detailed explanation of the issue..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1">
              <FormLabel>Attachment Image (Optional)</FormLabel>
              <div className="flex items-center gap-sm">
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                {isUploading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              </div>
            </div>

            <DialogFooter className="pt-md flex flex-col-reverse sm:flex-row justify-end gap-sm">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Submit Ticket
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
