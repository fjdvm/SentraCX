"use client";

import React, { useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTickets } from "@/hooks/useTickets";
import { useSignalR } from "@/hooks/useSignalR";
import { TicketCreateSheet } from "./TicketCreateSheet";
import { TicketTable } from "./TicketTable";

export function Tickets() {
  const [activeTab, setActiveTab] = useState<string>("Unclaimed");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useTickets(1, 50, activeTab);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const handleNewTicketAvailable = useCallback(() => {
    refetch();
    showToast("🔔 New ticket submitted live from shop!");
  }, [refetch, showToast]);

  const handleTicketStatusChanged = useCallback(() => {
    refetch();
  }, [refetch]);

  useSignalR({
    onNewTicketAvailable: handleNewTicketAvailable,
    onTicketStatusChanged: handleTicketStatusChanged,
  });

  return (
    <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-2xl">
      {toastMsg && (
        <div className="fixed bottom-20 right-6 md:right-10 bg-primary text-primary-foreground px-lg py-sm rounded-lg text-body-sm font-medium z-[100] shadow-md border border-border animate-in fade-in slide-in-from-bottom-5 duration-300">
          {toastMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div className="space-y-sm">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">Support Tickets</h1>
          <p className="text-body-md text-muted-foreground">
            Claim available customer inquiries, track progress, and mark tasks as completed.
          </p>
        </div>
        <TicketCreateSheet onSuccess={refetch} onShowToast={showToast} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-md">
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start border-b border-border bg-transparent p-0">
          <TabsTrigger value="Unclaimed" className="px-lg py-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
            Available (Unclaimed)
          </TabsTrigger>
          <TabsTrigger value="Claimed" className="px-lg py-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
            Claimed
          </TabsTrigger>
          <TabsTrigger value="Completed" className="px-lg py-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="p-0 m-0 animate-in fade-in duration-300">
          <TicketTable
            tickets={data?.items ?? []}
            isLoading={isLoading}
            onRefresh={refetch}
            onShowToast={showToast}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
