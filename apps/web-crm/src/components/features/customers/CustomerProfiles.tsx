"use client";

import React, { useState } from "react";
import { Search, Plus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomers } from "@/hooks/useCustomers";
import { CustomerListItem } from "@/types/customer";
import { CustomerTable } from "./CustomerTable";
import { CustomerFormSheet } from "./CustomerFormSheet";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";

export function CustomerProfiles() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(null);
  const [activeTab, setActiveTab] = useState<"contacts" | "leads">("contacts");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { customers, totalCount, totalPages, isLoading, error, refetch } = useCustomers({
    page,
    pageSize: 20,
    search: debouncedSearch,
    customerType: activeTab === "contacts" ? "Contact" : "Lead",
  });

  const handleTabChange = (val: string) => {
    setActiveTab(val as "contacts" | "leads");
    setPage(1);
  };

  return (
    <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-2xl max-w-7xl mx-auto">
      {/* Header Banner - Mobile-first layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div className="space-y-sm">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Customer Profiles</h1>
          <p className="text-body-md text-muted-foreground">
            Manage customer records, contact profiles, and transactional details.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus />
          Add Customer
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <Card className="shadow-none border-border">
          <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-2 p-lg">
            <span className="text-label-md text-muted-foreground font-medium uppercase tracking-wider">Total Customers</span>
            <Users className="w-4 h-4 text-foreground" />
          </CardHeader>
          <CardContent className="p-lg pt-0">
            {isLoading ? (
              <Skeleton className="h-8 w-20 rounded-md" />
            ) : (
              <span className="text-display-sm font-bold text-foreground">{totalCount}</span>
            )}
            <p className="text-body-sm text-muted-foreground mt-sm">Registered accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-lg bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-body-sm flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="contacts" value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-muted p-0.5 rounded-lg border border-border">
          <TabsTrigger value="contacts" className="px-lg py-sm text-label-sm font-medium">Contacts</TabsTrigger>
          <TabsTrigger value="leads" className="px-lg py-sm text-label-sm font-medium">Leads</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Customers Table Card */}
      <Card className="shadow-none border-border flex flex-col">
        <CardHeader className="pb-md p-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
          <CardTitle className="text-title-lg font-bold">
            {activeTab === "contacts" ? "Contact Registry" : "Lead Registry"}
          </CardTitle>
        </CardHeader>

        <CardContent className="py-md pt-0 overflow-x-auto">
          <CustomerTable
            customers={customers}
            isLoading={isLoading}
            onDeleteClick={(cust) => setDeleteTarget(cust)}
            searchQuery={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setPage(1);
            }}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-sm pt-md border-t border-border mt-md">
              <span className="text-label-sm text-muted-foreground order-2 sm:order-1">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-sm w-full sm:w-auto justify-end order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex-1 sm:flex-none"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex-1 sm:flex-none"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs and Sheets */}
      <CustomerFormSheet
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={() => refetch()}
      />

      <DeleteCustomerDialog
        customer={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onDeleted={() => refetch()}
      />
    </div>
  );
}
