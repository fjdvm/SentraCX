import React from "react";
import Link from "next/link";
import { Trash2, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CustomerListItem } from "@/types/customer";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { CustomerTypeBadge } from "./CustomerTypeBadge";

interface CustomerTableProps {
  customers: CustomerListItem[];
  isLoading: boolean;
  onDeleteClick: (customer: CustomerListItem) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function CustomerTable({
  customers,
  isLoading,
  onDeleteClick,
  searchQuery,
  onSearchChange,
}: CustomerTableProps) {
  return (
    <div className="w-full border rounded-md border-border overflow-hidden bg-card">
      <div className="flex items-center justify-around gap-3 px-4 py-2 border-b border-border bg-muted/20">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-8 p-0 text-body-sm flex-1"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="w-full overflow-x-auto">
        {isLoading ? (
          <div className="space-y-2 py-4 px-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md bg-muted/60" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-around">
            <p className="text-body-sm font-medium flex justify-around">No customers found.</p>
            <p className="text-label-sm text-muted-foreground mt-xs flex justify-around">
              Try searching with a different keyword or create a new customer record.
            </p>
          </div>
        ) : (
          <Table className="min-w-[700px] w-full text-left text-body-sm">
            <TableHeader>
              <TableRow className="border-b border-border flex items-center justify-around w-full">
                <TableHead className="flex-1 flex items-center justify-around">
                  <span className="flex items-center justify-around w-full">Customer Name</span>
                </TableHead>
                <TableHead className="flex-1 flex items-center justify-around">
                  <span className="flex items-center justify-around w-full">Email</span>
                </TableHead>
                <TableHead className="flex-1 flex items-center justify-around">
                  <span className="flex items-center justify-around w-full">Phone</span>
                </TableHead>
                <TableHead className="flex-1 flex items-center justify-around">
                  <span className="flex items-center justify-around w-full">Type</span>
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
              {customers.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/50 transition-colors flex items-center justify-around w-full">
                  <TableCell className="flex-1 font-semibold text-foreground flex items-center justify-around">
                    <span className="flex items-center justify-around w-full">
                      <Link
                        href={`/customers/${c.id}`}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {c.displayName}
                      </Link>
                    </span>
                  </TableCell>
                  <TableCell className="flex-1 text-muted-foreground text-body-sm flex items-center justify-around">
                    <span className="flex items-center justify-around w-full">{c.email}</span>
                  </TableCell>
                  <TableCell className="flex-1 text-muted-foreground text-body-sm flex items-center justify-around">
                    <span className="flex items-center justify-around w-full">{c.phoneNumber || "-"}</span>
                  </TableCell>
                  <TableCell className="flex-1 flex items-center justify-around">
                    <span className="flex items-center justify-around w-full">
                      <CustomerTypeBadge customerType={c.customerType} />
                    </span>
                  </TableCell>
                  <TableCell className="flex-1 flex items-center justify-around">
                    <span className="flex items-center justify-around w-full">
                      <CustomerStatusBadge status={c.status} />
                    </span>
                  </TableCell>
                  <TableCell className="flex-1 text-muted-foreground text-body-sm flex items-center justify-around">
                    <span className="flex items-center justify-around w-full">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="flex-1 text-right flex items-center justify-around">
                    <span className="flex items-center justify-around w-full">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteClick(c)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete customer"
                      >
                        <Trash2 className="w-4 h-4" />
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
  );
}
