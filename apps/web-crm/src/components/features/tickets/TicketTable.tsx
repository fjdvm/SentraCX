"use client";

import React, { useState } from "react";
import { Search, Eye } from "lucide-react";
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
import { TicketListItem } from "@/types/ticket";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketDetailSheet } from "./TicketDetailSheet";

interface TicketTableProps {
  tickets: TicketListItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onShowToast: (msg: string) => void;
}

export function TicketTable({ tickets, isLoading, onRefresh, onShowToast }: TicketTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const filteredTickets = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="shadow-none border-border flex flex-col">
      <CardHeader className="pb-md p-lg flex flex-col sm:flex-row sm:items-center justify-around gap-md">
        <CardTitle className="text-title-lg font-bold text-foreground">Support Ticket Queue</CardTitle>
      </CardHeader>
      <CardContent className="py-md pt-0 overflow-x-auto">
        <div className="w-full border rounded-md border-border overflow-hidden bg-card">
          <div className="flex items-center justify-around gap-3 px-4 py-2 border-b border-border bg-muted/20">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-8 p-0 text-body-sm flex-1"
              placeholder="Search by title or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full overflow-x-auto">
            {isLoading ? (
              <div className="space-y-2 py-4 px-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md bg-muted/60" />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-around">
                <p className="text-body-sm font-medium flex justify-around">No tickets found.</p>
                <p className="text-label-sm text-muted-foreground mt-xs flex justify-around">
                  Try searching with a different keyword or create a new support ticket.
                </p>
              </div>
            ) : (
              <Table className="min-w-[700px] w-full text-left text-body-sm">
                <TableHeader>
                  <TableRow className="border-b border-border flex items-center justify-around w-full">
                    <TableHead className="flex-1 flex items-center justify-around">
                      <span className="flex items-center justify-around w-full">Title</span>
                    </TableHead>
                    <TableHead className="flex-1 flex items-center justify-around">
                      <span className="flex items-center justify-around w-full">Customer</span>
                    </TableHead>
                    <TableHead className="flex-1 flex items-center justify-around">
                      <span className="flex items-center justify-around w-full">Status</span>
                    </TableHead>
                    <TableHead className="flex-1 flex items-center justify-around">
                      <span className="flex items-center justify-around w-full">Created At</span>
                    </TableHead>
                    <TableHead className="flex-1 flex items-center justify-around text-right">
                      <span className="flex items-center justify-around w-full">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filteredTickets.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/50 transition-colors flex items-center justify-around w-full">
                      <TableCell className="flex-1 font-semibold text-foreground flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">{t.title}</span>
                      </TableCell>
                      <TableCell className="flex-1 text-muted-foreground text-body-sm flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">{t.customerName}</span>
                      </TableCell>
                      <TableCell className="flex-1 flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">
                          <TicketStatusBadge status={t.status} />
                        </span>
                      </TableCell>
                      <TableCell className="flex-1 text-muted-foreground text-body-sm flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="flex-1 text-right flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTicketId(t.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </CardContent>

      <TicketDetailSheet
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        onRefresh={onRefresh}
        onShowToast={onShowToast}
      />
    </Card>
  );
}
