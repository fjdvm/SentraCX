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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomerTableProps {
  customers: CustomerListItem[];
  isLoading: boolean;
  onDeleteClick: (customer: CustomerListItem) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  customerTypeFilter: "Contact" | "Regular" | "InstitutionalBuyer";
  onCustomerTypeChange: (value: "Contact" | "Regular" | "InstitutionalBuyer") => void;
}

export function CustomerTable({
  customers,
  isLoading,
  onDeleteClick,
  searchQuery,
  onSearchChange,
  customerTypeFilter,
  onCustomerTypeChange,
}: CustomerTableProps) {
  return (
    <div className="w-full border rounded-md border-border overflow-hidden bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-8 p-0 text-body-sm flex-1"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={customerTypeFilter}
            onValueChange={(val: any) => onCustomerTypeChange(val)}
          >
            <SelectTrigger className="w-[150px] h-8 text-body-sm bg-transparent border-input">
              <SelectValue placeholder="Customer Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Contact">All Contacts</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="InstitutionalBuyer">Institutional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="w-full overflow-auto h-[480px]">
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
          <Table className="w-full text-left text-body-sm">
            <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
              <TableRow className="border-b border-border">
                <TableHead className="px-4 py-3 font-semibold text-left">Customer Name</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-left">Email</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-left">Phone</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-left">Type</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-left">Status</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-left">Created At</TableHead>
                <TableHead className="px-4 py-3 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {customers.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="px-4 py-3 font-semibold text-foreground text-left">
                    <Link
                      href={`/customers/${c.id}`}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {c.displayName}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground text-left">{c.email}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground text-left">{c.phoneNumber || "-"}</TableCell>
                  <TableCell className="px-4 py-3 text-left">
                    <CustomerTypeBadge customerType={c.customerType} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-left">
                    <CustomerStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground text-left">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteClick(c)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
