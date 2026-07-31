"use client";

import React from "react";
import { Customer } from "@/types/customer";
import { CustomerNotesEditor } from "./CustomerNotesEditor";
import { useCustomerOrders } from "@/hooks/useCustomerOrders";
import { useCustomerMarketingHistory } from "@/hooks/useCustomerMarketingHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerOverviewTabProps {
  customer: Customer;
  onCustomerUpdated: (updated: Customer) => void;
  onSelectTab: (tab: string) => void;
}

export function CustomerOverviewTab({
  customer,
  onCustomerUpdated,
  onSelectTab,
}: CustomerOverviewTabProps) {
  const isLead = customer.customerType === "Lead";
  const { orders, isLoading: isOrdersLoading } = useCustomerOrders(isLead ? "" : customer.id);
  const { interactions, isLoading: isInteractionsLoading } = useCustomerMarketingHistory({ customerId: customer.id, page: 1, pageSize: 5 });

  const recentOrders = orders.slice(0, 5);
  const recentInteractions = interactions.slice(0, 5);

  return (
    <div className="space-y-lg">
      {/* Basic Attributes Grid - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md bg-muted/40 p-lg rounded-xl border border-border">
        <div className="space-y-xs">
          <span className="text-label-sm font-semibold text-muted-foreground uppercase tracking-wider block">Email</span>
          <p className="text-body-sm font-medium text-foreground truncate">{customer.email}</p>
        </div>
        <div className="space-y-xs">
          <span className="text-label-sm font-semibold text-muted-foreground uppercase tracking-wider block">Phone</span>
          <p className="text-body-sm font-medium text-foreground">{customer.phoneNumber || "—"}</p>
        </div>
        <div className="space-y-xs">
          <span className="text-label-sm font-semibold text-muted-foreground uppercase tracking-wider block">Address</span>
          <p className="text-body-sm font-medium text-foreground">{customer.address || "—"}</p>
        </div>
        <div className="space-y-xs">
          <span className="text-label-sm font-semibold text-muted-foreground uppercase tracking-wider block">Customer Type</span>
          <p className="text-body-sm font-medium text-foreground">{customer.customerType}</p>
        </div>
        <div className="space-y-xs">
          <span className="text-label-sm font-semibold text-muted-foreground uppercase tracking-wider block">Account Created</span>
          <p className="text-body-sm font-medium text-foreground">
            {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Notes Section */}
      <CustomerNotesEditor
        customerId={customer.id}
        initialNotes={customer.notes}
        onUpdated={(newNotes) =>
          onCustomerUpdated({ ...customer, notes: newNotes })
        }
      />

      {/* Recent Orders Preview */}
      {!isLead && (
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-label-md font-bold text-foreground">Recent Orders</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectTab("orders")}
              className="text-label-sm h-8 font-semibold"
            >
              View all ({orders.length})
            </Button>
          </div>
          {isOrdersLoading ? (
            <div className="space-y-xs">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-body-sm text-muted-foreground italic">No recent orders recorded.</p>
          ) : (
            <div className="space-y-xs">
              {recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-sm bg-background border border-border rounded-lg text-body-sm"
                >
                  <span className="font-semibold text-foreground">{o.orderNumber}</span>
                  <span className="font-medium">${o.totalAmount.toLocaleString()}</span>
                  <Badge variant="outline" className="text-label-sm">
                    {o.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Marketing Preview */}
      <div className="space-y-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-label-md font-bold text-foreground">Recent Marketing Interactions</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectTab("marketing")}
            className="text-label-sm h-8 font-semibold"
          >
            View all
          </Button>
        </div>
        {isInteractionsLoading ? (
          <div className="space-y-xs">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : recentInteractions.length === 0 ? (
          <p className="text-body-sm text-muted-foreground italic">No recent marketing interactions.</p>
        ) : (
          <div className="space-y-xs">
            {recentInteractions.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-sm bg-background border border-border rounded-lg text-body-sm"
              >
                <span className="font-semibold text-foreground truncate pr-sm">{m.title}</span>
                <Badge variant="outline" className="text-label-sm shrink-0">
                  {m.channel}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
