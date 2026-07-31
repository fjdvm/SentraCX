"use client";

import React, { useState } from "react";
import { useCustomerOrders } from "@/hooks/useCustomerOrders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { OrderHistory } from "@/types/customer";
import { OrderDetailDialog } from "./OrderDetailDialog";

interface CustomerOrderHistoryTabProps {
  customerId: string;
}

export function CustomerOrderHistoryTab({ customerId }: CustomerOrderHistoryTabProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderHistory | null>(null);
  const [page, setPage] = useState(1);
  const { orders, isLoading, error } = useCustomerOrders(customerId);

  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-md text-body-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-body-sm font-medium">No orders found for this customer.</p>
      </div>
    );
  }

  const pageSize = 20;
  const totalPages = Math.ceil(orders.length / pageSize);
  const paginatedOrders = orders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-md">
      <div className="w-full overflow-auto h-[400px] border rounded-md border-border">
        <Table className="min-w-[500px] w-full text-left text-body-sm">
          <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
            <TableRow className="border-b border-border">
              <TableHead>Order Number</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ordered At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {paginatedOrders.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => setSelectedOrder(item)}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <TableCell className="font-semibold text-foreground">{item.orderNumber}</TableCell>
                <TableCell className="font-medium text-foreground">
                  ${item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-label-sm">
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-label-sm text-muted-foreground font-mono">
                  {new Date(item.orderedAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-sm pt-sm border-t border-border">
          <span className="text-label-sm text-muted-foreground order-2 sm:order-1">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-sm w-full sm:w-auto justify-end order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex-1 sm:flex-none"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <OrderDetailDialog
        order={selectedOrder}
        open={selectedOrder !== null}
        onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}
      />
    </div>
  );
}
