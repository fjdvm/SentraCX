"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { crmClient } from "@/lib/api/crm-client";
import { CustomerListItem } from "@/types/customer";
import { toast } from "sonner";

interface DeleteCustomerDialogProps {
  customer: CustomerListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteCustomerDialog({
  customer,
  open,
  onOpenChange,
  onDeleted,
}: DeleteCustomerDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!customer) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await crmClient.customers.delete(customer.id);
      toast.success(`Customer "${customer.displayName}" has been deleted.`);
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-md sm:p-lg rounded-lg sm:rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer Record</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{customer.displayName}</strong>?
            This action will soft-delete the customer profile from the CRM database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-sm">
          <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            {isDeleting ? "Deleting..." : "Delete Customer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
