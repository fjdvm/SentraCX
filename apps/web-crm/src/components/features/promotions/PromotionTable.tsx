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
import { PromotionListItem } from "@/types/promotion";
import { PromotionTypeBadge } from "./PromotionTypeBadge";
import { PromotionStatusBadge } from "./PromotionStatusBadge";
import { PromotionDetailSheet } from "./PromotionDetailSheet";

interface PromotionTableProps {
  promotions: PromotionListItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onShowToast: (msg: string) => void;
}

export function PromotionTable({ promotions, isLoading, onRefresh, onShowToast }: PromotionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filteredPromotions = promotions.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageSize = 20;
  const totalPages = Math.ceil(filteredPromotions.length / pageSize);
  const paginatedPromotions = filteredPromotions.slice((page - 1) * pageSize, page * pageSize);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  return (
    <Card className="shadow-none border-border flex flex-col">
      <CardHeader className="pb-md p-lg flex flex-col sm:flex-row sm:items-center justify-around gap-md">
        <CardTitle className="text-title-lg font-bold text-foreground">Promotions Log</CardTitle>
      </CardHeader>
      <CardContent className="py-md pt-0 overflow-x-auto">
        <div className="w-full border rounded-md border-border overflow-hidden bg-card">
          <div className="flex items-center justify-around gap-3 px-4 py-2 border-b border-border bg-muted/20">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-8 p-0 text-body-sm flex-1"
              placeholder="Search promotions by title..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="w-full overflow-auto h-[480px]">
            {isLoading ? (
              <div className="space-y-2 py-4 px-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md bg-muted/60" />
                ))}
              </div>
            ) : paginatedPromotions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-around">
                <p className="text-body-sm font-medium flex justify-around">No promotions found.</p>
                <p className="text-label-sm text-muted-foreground mt-xs flex justify-around">
                  Try searching with a different keyword or create a new promotion.
                </p>
              </div>
            ) : (
              <Table className="w-full text-left text-body-sm">
                <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                  <TableRow className="border-b border-border">
                    <TableHead className="px-4 py-3 font-semibold text-left">Title</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-left">Type</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-left">Status</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-left">Discount Value</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-left">End Date</TableHead>
                    <TableHead className="px-4 py-3 font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {paginatedPromotions.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="px-4 py-3 font-semibold text-foreground text-left">
                        {p.title}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-left">
                        <PromotionTypeBadge type={p.promotionType} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-left">
                        <PromotionStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-body-sm text-muted-foreground text-left">
                        {p.discountValue ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground text-left">
                        {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPromotionId(p.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
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
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-sm pt-md border-t border-border mt-md">
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
      </CardContent>

      <PromotionDetailSheet
        promotionId={selectedPromotionId}
        onClose={() => setSelectedPromotionId(null)}
        onRefresh={onRefresh}
        onShowToast={onShowToast}
      />
    </Card>
  );
}
