"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCustomer } from "@/hooks/useCustomer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { CustomerTypeControl } from "./CustomerTypeControl";
import { CustomerOverviewTab } from "./CustomerOverviewTab";
import { CustomerMarketingHistoryTab } from "./CustomerMarketingHistoryTab";
import { CustomerOrderHistoryTab } from "./CustomerOrderHistoryTab";

interface CustomerDetailProps {
  customerId: string;
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { customer, isLoading, error, refetch, setCustomer } = useCustomer(customerId);

  const isLead = (customer?.customerType as string) === "Lead";

  React.useEffect(() => {
    if (isLead && activeTab === "orders") {
      setActiveTab("overview");
    }
  }, [isLead, activeTab]);

  if (isLoading) {
    return (
      <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-md max-w-7xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-md max-w-7xl mx-auto">
        <Link href="/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft /> Back to Customers
          </Button>
        </Link>
        <div className="p-lg bg-muted/50 border border-border rounded-xl text-center flex flex-col items-center gap-md py-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <div>
            <p className="font-bold text-body-md text-foreground">Looking for customer...</p>
            <p className="text-body-sm text-muted-foreground mt-xs">
              {error || "The customer profile is being loaded. This may take a moment."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const initials = customer.displayName
    ? customer.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CU";

  return (
    <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-2xl max-w-7xl mx-auto">
      {/* Back Navigation */}
      <div>
        <Link href="/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft /> Back to Customers
          </Button>
        </Link>
      </div>

      {/* Customer Header Card - Mobile First */}
      <div className="p-lg bg-card border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border border-border">
            {customer.profileImage && <AvatarImage src={customer.profileImage} alt={customer.displayName} />}
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-body-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-xs overflow-hidden">
            <h1 className="text-headline-md font-bold tracking-tight text-foreground truncate">{customer.displayName}</h1>
            <p className="text-body-sm text-muted-foreground truncate">{customer.email}</p>
          </div>
        </div>

        {/* Dynamic Controls - Stacked on mobile */}
        <div className="flex flex-wrap items-center gap-sm border-t sm:border-t-0 pt-sm sm:pt-0 border-border">
          <div className="flex items-center gap-sm w-full sm:w-auto">
            <span className="text-label-sm font-semibold text-muted-foreground whitespace-nowrap">Status:</span>
            <CustomerStatusBadge status={customer.status} />
          </div>
          <CustomerTypeControl
            customerId={customer.id}
            currentType={customer.customerType}
            onUpdated={(customerType) => setCustomer({ ...customer, customerType })}
          />
        </div>
      </div>

      {/* Three Tabs View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-md">
        <div className="w-full overflow-x-auto pb-xs">
          <TabsList className={`w-full sm:w-auto grid ${isLead ? "grid-cols-2" : "grid-cols-3"} sm:inline-flex h-9 p-xs`}>
            <TabsTrigger value="overview" className="text-label-sm font-semibold">
              Overview
            </TabsTrigger>
            <TabsTrigger value="marketing" className="text-label-sm font-semibold">
              Marketing History
            </TabsTrigger>
            {!isLead && (
              <TabsTrigger value="orders" className="text-label-sm font-semibold">
                Order History
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="overview" className="p-lg bg-card border border-border rounded-xl">
          <CustomerOverviewTab
            customer={customer}
            onCustomerUpdated={(updated) => setCustomer(updated)}
            onSelectTab={(tab) => setActiveTab(tab)}
          />
        </TabsContent>

        <TabsContent value="marketing" className="p-lg bg-card border border-border rounded-xl">
          <CustomerMarketingHistoryTab customerId={customer.id} />
        </TabsContent>

        {!isLead && (
          <TabsContent value="orders" className="p-lg bg-card border border-border rounded-xl">
            <CustomerOrderHistoryTab customerId={customer.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
