"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketPaginationProps {
  selectedCount: number;
  totalCount: number;
}

export function TicketPagination({ selectedCount, totalCount }: TicketPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-md pt-xs text-muted-foreground text-label-sm font-medium px-xs">
      <div>
        {selectedCount} of {totalCount} row(s) selected.
      </div>

      <div className="flex items-center gap-lg">
        <div className="flex items-center gap-xs">
          <span>Rows per page</span>
          <select className="bg-transparent border border-input rounded p-xs text-label-sm outline-none text-foreground font-semibold">
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
        </div>

        <div>Page 1 of 1</div>

        <div className="flex items-center gap-xs">
          <Button variant="outline" size="icon" className="w-8 h-8 rounded p-0 text-muted-foreground" disabled>
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="w-8 h-8 rounded p-0 text-muted-foreground" disabled>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="w-8 h-8 rounded p-0 text-muted-foreground" disabled>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="w-8 h-8 rounded p-0 text-muted-foreground" disabled>
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
