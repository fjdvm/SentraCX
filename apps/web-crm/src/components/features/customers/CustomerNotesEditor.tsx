"use client";

import React, { useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { crmClient } from "@/lib/api/crm-client";
import { toast } from "sonner";

interface CustomerNotesEditorProps {
  customerId: string;
  initialNotes?: string | null;
  onUpdated: (newNotes: string) => void;
}

export function CustomerNotesEditor({
  customerId,
  initialNotes,
  onUpdated,
}: CustomerNotesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (!isEditing) {
      setNotes(initialNotes || "");
    }
  }, [initialNotes, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await crmClient.customers.updateNotes(customerId, { notes });
      toast.success("Customer notes updated successfully.");
      onUpdated(notes);
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-xs">
        <div className="flex items-center justify-between">
          <Label className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground">Internal Notes</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 />
            Edit
          </Button>
        </div>
        <div className="p-md bg-muted/30 rounded-lg border border-border text-body-sm text-foreground">
          {initialNotes ? (
            <p className="whitespace-pre-wrap">{initialNotes}</p>
          ) : (
            <p className="italic text-muted-foreground">No notes recorded for this customer.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-xs">
      <Label htmlFor="notes" className="text-label-sm font-semibold uppercase tracking-wider text-muted-foreground block">Edit Notes</Label>
      <Textarea
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        placeholder="Enter internal notes about this customer..."
        className="text-body-sm"
      />
      <div className="flex justify-end gap-sm pt-xs">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setNotes(initialNotes || "");
            setIsEditing(false);
          }}
          disabled={isSaving}
        >
          <X />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save />
          {isSaving ? "Saving..." : "Save Note"}
        </Button>
      </div>
    </div>
  );
}
