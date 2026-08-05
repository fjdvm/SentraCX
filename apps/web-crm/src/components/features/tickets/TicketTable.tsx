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
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function TicketTable({
  tickets,
  isLoading,
  onRefresh,
  onShowToast,
  page = 1,
  totalPages = 1,
  onPageChange,
}: TicketTableProps) {
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
          <div className="flex items-center justify-around gap-sm px-md py-sm border-b border-border bg-muted/20">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-8 p-0 text-body-sm flex-1"
              placeholder="Search by title or customer name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (onPageChange) onPageChange(1);
              }}
            />
          </div>
          <div className="w-full overflow-auto h-[480px]">
            {isLoading ? (
              <div className="space-y-2 py-md px-md animate-pulse">
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
              <Table className="w-full text-left text-body-sm">
                <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                  <TableRow className="border-b border-border">
                    <TableHead className="px-md py-sm font-semibold text-left">Title</TableHead>
                    <TableHead className="px-md py-sm font-semibold text-left">Customer</TableHead>
                    <TableHead className="px-md py-sm font-semibold text-left">Status</TableHead>
                    <TableHead className="px-md py-sm font-semibold text-left">Created At</TableHead>
                    <TableHead className="px-md py-sm font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filteredTickets.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="px-md py-sm font-semibold text-foreground text-left">
                        {t.title}
                      </TableCell>
                      <TableCell className="px-md py-sm text-muted-foreground text-left truncate">
                        {t.customerName}
                      </TableCell>
                      <TableCell className="px-md py-sm text-left">
                        <TicketStatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="px-md py-sm text-muted-foreground text-left">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-md py-sm text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTicketId(t.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-4 h-4 mr-xs" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && onPageChange && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-sm pt-md border-t border-border mt-md">
            <span className="text-label-sm text-muted-foreground order-2 sm:order-1">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-sm w-full sm:w-auto justify-end order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => onPageChange(page - 1)}
                className="flex-1 sm:flex-none"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => onPageChange(page + 1)}
                className="flex-1 sm:flex-none"
              >
                Next
              </Button>
            </div>
          </div>
        )}
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
