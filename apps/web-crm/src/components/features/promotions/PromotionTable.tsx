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

  const filteredPromotions = promotions.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            ) : filteredPromotions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-around">
                <p className="text-body-sm font-medium flex justify-around">No promotions found.</p>
                <p className="text-label-sm text-muted-foreground mt-xs flex justify-around">
                  Try searching with a different keyword or create a new promotion.
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
                      <span className="flex items-center justify-around w-full">Type</span>
                    </TableHead>
                    <TableHead className="flex-1 flex items-center justify-around">
                      <span className="flex items-center justify-around w-full">Status</span>
                    </TableHead>
                    <TableHead className="flex-1 flex items-center justify-around">
                      <span className="flex items-center justify-around w-full">Discount Value</span>
                    </TableHead>
                    <TableHead className="flex-1 flex items-center justify-around">
                      <span className="flex items-center justify-around w-full">End Date</span>
                    </TableHead>
                    <TableHead className="flex-1 flex items-center justify-around text-right">
                      <span className="flex items-center justify-around w-full">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filteredPromotions.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/50 transition-colors flex items-center justify-around w-full">
                      <TableCell className="flex-1 font-semibold text-foreground flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">{p.title}</span>
                      </TableCell>
                      <TableCell className="flex-1 flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">
                          <PromotionTypeBadge type={p.promotionType} />
                        </span>
                      </TableCell>
                      <TableCell className="flex-1 flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">
                          <PromotionStatusBadge status={p.status} />
                        </span>
                      </TableCell>
                      <TableCell className="flex-1 font-mono text-body-sm text-muted-foreground flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">{p.discountValue ?? "—"}</span>
                      </TableCell>
                      <TableCell className="flex-1 text-muted-foreground text-body-sm flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">
                          {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="flex-1 text-right flex items-center justify-around">
                        <span className="flex items-center justify-around w-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPromotionId(p.id)}
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

      <PromotionDetailSheet
        promotionId={selectedPromotionId}
        onClose={() => setSelectedPromotionId(null)}
        onRefresh={onRefresh}
        onShowToast={onShowToast}
      />
    </Card>
  );
}
