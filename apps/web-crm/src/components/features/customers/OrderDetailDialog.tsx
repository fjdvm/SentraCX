"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { OrderHistory } from "@/types/customer";

interface OrderDetailDialogProps {
  order: OrderHistory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: OrderDetailDialogProps) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-md sm:p-lg rounded-lg sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-md pr-lg">
            <DialogTitle className="text-headline-md font-bold">
              Order {order.orderNumber}
            </DialogTitle>
            <Badge variant="outline" className="text-label-sm uppercase">
              {order.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-md pt-xs">
          <div className="flex items-center justify-between p-md bg-muted/30 rounded-lg border border-border">
            <span className="text-body-sm text-muted-foreground font-medium">Total Amount</span>
            <span className="text-headline-md font-bold text-foreground">
              ${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="text-label-sm text-muted-foreground">
            Ordered At: <strong className="text-foreground font-semibold">{new Date(order.orderedAt).toLocaleString()}</strong>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
