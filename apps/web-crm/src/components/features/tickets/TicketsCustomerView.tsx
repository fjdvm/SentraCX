"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MessageSquare, XCircle, Eye, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTickets } from "@/hooks/useTickets";
import { crmClient } from "@/lib/api/crm-client";
import { TicketCreateSheet } from "./TicketCreateSheet";
import { TicketDetailSheet } from "./TicketDetailSheet";
import { TicketStatusBadge } from "./TicketStatusBadge";

interface TicketsCustomerViewProps {
  customerId?: string;
}

export function TicketsCustomerView({ customerId }: TicketsCustomerViewProps) {
  const [activeTab, setActiveTab] = useState<string>("Pending");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const apiStatus = activeTab === "Pending" ? "Unclaimed" : activeTab === "Ongoing" ? "Ongoing" : activeTab === "Completed" ? "Completed" : "Canceled";
  const { data, isLoading, refetch } = useTickets(page, 20, apiStatus, customerId);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCancelTicket = async (id: string) => {
    try {
      await crmClient.tickets.cancel(id);
      showToast("Ticket has been cancelled.");
      refetch();
    } catch {
      showToast("Failed to cancel ticket.");
    }
  };

  const filteredTickets = (data?.items ?? []).filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-2xl">
      {toastMsg && (
        <div className="fixed bottom-20 right-6 md:right-10 bg-primary text-primary-foreground px-lg py-sm rounded-lg text-body-sm font-medium z-[100] shadow-md border border-border animate-in fade-in slide-in-from-bottom-5 duration-300">
          {toastMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div className="space-y-sm">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">My Support Tickets</h1>
          <p className="text-body-md text-muted-foreground">
            Track status of your submitted inquiries, communicate with support staff, or open new tickets.
          </p>
        </div>
        <TicketCreateSheet customerId={customerId} onSuccess={refetch} onShowToast={showToast} />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setPage(1);
        }}
        className="w-full space-y-md"
      >
        <TabsList className="w-full sm:w-auto overflow-x-auto justify-start border-b border-border bg-transparent p-0">
          <TabsTrigger value="Pending" className="px-lg py-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
            Pending
          </TabsTrigger>
          <TabsTrigger value="Ongoing" className="px-lg py-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
            Ongoing
          </TabsTrigger>
          <TabsTrigger value="Completed" className="px-lg py-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
            Completed
          </TabsTrigger>
          <TabsTrigger value="Canceled" className="px-lg py-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent">
            Cancel
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="p-0 m-0">
          <Card className="shadow-none border-border flex flex-col">
            <CardHeader className="pb-md p-lg flex flex-col sm:flex-row sm:items-center justify-around gap-md">
              <CardTitle className="text-title-lg font-bold text-foreground">Inquiry History</CardTitle>
            </CardHeader>
            <CardContent className="py-md pt-0 overflow-x-auto">
              <div className="w-full border rounded-md border-border overflow-hidden bg-card">
                <div className="flex items-center justify-around gap-3 px-4 py-2 border-b border-border bg-muted/20">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-8 p-0 text-body-sm flex-1"
                    placeholder="Search tickets by title..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="w-full overflow-auto h-[480px]">
                  {isLoading ? (
                    <div className="space-y-2 py-4 px-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-md" />
                      ))}
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-around">
                      <p className="text-body-sm font-medium flex justify-around">No tickets found.</p>
                      <p className="text-label-sm text-muted-foreground mt-xs flex justify-around">
                        Try searching with a different keyword or create a new support inquiry.
                      </p>
                    </div>
                  ) : (
                    <Table className="w-full text-left text-body-sm">
                      <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                        <TableRow className="border-b border-border">
                          <TableHead className="px-4 py-3 font-semibold text-left">Title</TableHead>
                          <TableHead className="px-4 py-3 font-semibold text-left">Status</TableHead>
                          <TableHead className="px-4 py-3 font-semibold text-left">Created At</TableHead>
                          <TableHead className="px-4 py-3 font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {filteredTickets.map((t) => (
                          <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="px-4 py-3 font-semibold text-foreground text-left">
                              {t.title}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-left">
                              <TicketStatusBadge status={t.status} />
                            </TableCell>
                            <TableCell className="px-4 py-3 text-muted-foreground text-left">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedTicketId(t.id)} className="text-muted-foreground hover:text-foreground">
                                  <Eye className="w-4 h-4 mr-1" /> View
                                </Button>
                                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                                  <Link href={`/conversations?ticketId=${t.id}`}>
                                    <MessageSquare className="w-4 h-4 mr-1" /> Message
                                  </Link>
                                </Button>
                                {t.status !== "Completed" && t.status !== "Canceled" && (
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleCancelTicket(t.id)}>
                                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              {/* Pagination Controls */}
              {data && data.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-sm pt-md border-t border-border mt-md">
                  <span className="text-label-sm text-muted-foreground order-2 sm:order-1">
                    Page {page} of {data.totalPages}
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
                      disabled={page >= data.totalPages || isLoading}
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
        </TabsContent>
      </Tabs>

      <TicketDetailSheet
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        onRefresh={refetch}
        onShowToast={showToast}
      />
    </div>
  );
}
