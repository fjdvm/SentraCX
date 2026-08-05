"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { aiClient } from "@/lib/api/ai-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RetentionActionModal, RetentionActionCustomer } from "./RetentionActionModal";
import { Play, ArrowUpDown, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface AtRiskCustomer extends RetentionActionCustomer {
  last_order_date?: string;
}

export function AtRiskTable() {
  const [customers, setCustomers] = useState<AtRiskCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<AtRiskCustomer | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchWatchlist = async () => {
    setIsLoading(true);
    try {
      const res = await aiClient.dashboard.getAtRiskCustomers(100);
      setCustomers(res.customers || []);
    } catch (err) {
      console.error("Failed to load at-risk customers:", err);
      toast.error("Failed to load at-risk customers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleActionSuccess = async (msg: string) => {
    toast.success(msg);
    await fetchWatchlist();
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-badge-destructive text-badge-destructive-foreground border-badge-destructive/30";
      case "high":
        return "bg-badge-orange text-badge-orange-foreground border-badge-orange/30";
      case "medium":
        return "bg-badge-warning text-badge-warning-foreground border-badge-warning/30";
      default:
        return "bg-badge-success text-badge-success-foreground border-badge-success/30";
    }
  };

  const filteredCustomers = customers.filter(
    (c) => (riskFilter === "all" || c.risk_level === riskFilter) &&
           (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (sortDirection === "asc") {
      return a.churn_score - b.churn_score;
    }
    return b.churn_score - a.churn_score;
  });

  return (
    <>
      <div className="w-full border rounded-md border-border overflow-hidden bg-card">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-sm px-md py-sm border-b border-border bg-muted/20">
          <div className="flex items-center gap-sm w-full sm:w-auto flex-1">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-8 p-0 text-body-sm flex-1"
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-sm shrink-0 w-full sm:w-auto">
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-8 text-body-sm bg-transparent border-input">
                <SelectValue placeholder="Filter by Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-auto min-h-[400px]">
          {isLoading ? (
            <div className="space-y-2 py-md px-md animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 w-full rounded-md bg-muted/60" />
              ))}
            </div>
          ) : sortedCustomers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-around">
              <p className="text-body-sm font-medium flex justify-around">No at-risk customers found.</p>
              <p className="text-label-sm text-muted-foreground mt-xs flex justify-around">
                Try adjusting your filters or search query.
              </p>
            </div>
          ) : (
            <Table className="w-full text-left text-body-sm">
              <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                <TableRow className="border-b border-border">
                  <TableHead className="px-md py-sm font-semibold text-left">Customer</TableHead>
                  <TableHead 
                    className="px-md py-sm font-semibold text-left cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
                  >
                    <div className="flex items-center gap-xs">
                      Churn Risk
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead className="px-md py-sm font-semibold text-left">Risk Level</TableHead>
                  <TableHead className="px-md py-sm font-semibold text-left">Last Order</TableHead>
                  <TableHead className="px-md py-sm font-semibold text-left w-[300px]">Factors</TableHead>
                  <TableHead className="px-md py-sm font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {sortedCustomers.map((c) => (
                  <TableRow key={c.customer_id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="px-md py-sm font-semibold text-foreground text-left">
                      <Link
                        href={`/customers/${c.customer_id}`}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-md py-sm text-left">
                      <div className="space-y-xs">
                        <span className="font-medium text-foreground">{(c.churn_score * 100).toFixed(0)}%</span>
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${c.churn_score >= 0.8 ? 'bg-destructive' : c.churn_score >= 0.6 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, c.churn_score * 100))}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-md py-sm text-left">
                      <Badge className={getRiskBadgeClass(c.risk_level)}>
                        <span className="capitalize">{c.risk_level}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="px-md py-sm text-muted-foreground text-left">
                      {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="px-md py-sm text-left">
                      <div className="flex flex-wrap gap-xs">
                        {c.contributing_factors.map((factor) => (
                          <span
                            key={factor}
                            className="text-[10px] bg-muted text-muted-foreground px-sm py-0.5 rounded-full"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-md py-sm text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-xs text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Execute NBA
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <RetentionActionModal 
        customer={selectedCustomer} 
        open={!!selectedCustomer} 
        onClose={() => setSelectedCustomer(null)}
        onSuccess={handleActionSuccess}
      />
    </>
  );
}
