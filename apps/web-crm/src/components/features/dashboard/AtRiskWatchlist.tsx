"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { aiClient } from "@/lib/api/ai-client";
import { crmClient } from "@/lib/api/crm-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, User, Play, ArrowRight, Star } from "lucide-react";
import { RetentionActionModal, RetentionActionCustomer } from "../customers/RetentionActionModal";
import { CustomerListItem } from "@/types/customer";

interface AtRiskCustomer extends RetentionActionCustomer {
  last_order_date?: string;
}

interface ValuableCustomer extends CustomerListItem {
  totalSpent: number;
  orderCount: number;
}

interface AtRiskWatchlistProps {
  onShowToast: (msg: string) => void;
}

export function AtRiskWatchlist({ onShowToast }: AtRiskWatchlistProps) {
  const [atRiskCustomers, setAtRiskCustomers] = useState<AtRiskCustomer[]>([]);
  const [valuableCustomers, setValuableCustomers] = useState<ValuableCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<AtRiskCustomer | null>(null);

  const fetchWatchlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const [riskRes, valRes] = await Promise.all([
        aiClient.dashboard.getAtRiskCustomers(5).catch(() => ({ customers: [] })),
        crmClient.customers.list(1, 5, "InstitutionalBuyer").catch(() => ({ items: [] }))
      ]);
      setAtRiskCustomers(riskRes.customers || []);
      
      let customersToEnrich = valRes.items || [];
      // If no institutional buyers, fallback to regular customers to ensure the tab isn't empty
      if (customersToEnrich.length === 0) {
        const fallbackRes = await crmClient.customers.list(1, 10);
        customersToEnrich = fallbackRes.items || [];
      }

      // Fetch order data for valuable customers to calculate total spent
      const enrichedValuable = await Promise.all(
        customersToEnrich.map(async (c) => {
          try {
            const orders = await crmClient.orders.listByCustomer(c.id);
            const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);
            return { ...c, orderCount: orders.length, totalSpent };
          } catch (err) {
            return { ...c, orderCount: 0, totalSpent: 0 };
          }
        })
      );

      // Sort by total spent descending and take top 5
      enrichedValuable.sort((a, b) => b.totalSpent - a.totalSpent);
      setValuableCustomers(enrichedValuable.slice(0, 5));
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleTakeAction = (customer: AtRiskCustomer) => {
    setSelectedCustomer(customer);
  };

  const handleActionSuccess = async (msg: string) => {
    onShowToast(msg);
    await fetchWatchlist();
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-badge-destructive text-badge-destructive-foreground border-badge-destructive/30 font-bold";
      case "high":
        return "bg-badge-orange text-badge-orange-foreground border-badge-orange/30 font-semibold";
      case "medium":
        return "bg-badge-warning text-badge-warning-foreground border-badge-warning/30 font-medium";
      default:
        return "bg-badge-success text-badge-success-foreground border-badge-success/30 font-medium";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-none h-full">
        <CardHeader className="p-lg">
          <CardTitle className="text-headline-sm font-bold text-foreground">Customer Watchlist</CardTitle>
          <CardDescription>Key customer segments needing attention</CardDescription>
        </CardHeader>
        <CardContent className="p-lg pt-0 space-y-md">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-sm border border-border/55 rounded-lg p-md animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
              <div className="h-6 bg-muted rounded w-full mt-sm"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-none h-full flex flex-col">
      <CardHeader className="p-lg shrink-0">
        <CardTitle className="text-headline-sm font-bold text-foreground">Customer Watchlist</CardTitle>
        <CardDescription>Key customer segments needing attention</CardDescription>
      </CardHeader>
      
      <Tabs defaultValue="at-risk" className="flex-1 flex flex-col min-h-0">
        <div className="px-lg pb-sm">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="at-risk" className="flex items-center gap-xs">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              At-Risk
            </TabsTrigger>
            <TabsTrigger value="valuable" className="flex items-center gap-xs">
              <Star className="w-4 h-4 text-badge-warning-foreground" />
              Most Valuable
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="at-risk" className="p-lg pt-0 flex-1 overflow-y-auto mt-0 h-full data-[state=active]:flex flex-col">
          <div className="space-y-md flex-1">
            {atRiskCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl text-center space-y-sm text-muted-foreground text-body-sm h-full">
                No at-risk customers detected.
              </div>
            ) : (
              atRiskCustomers.map((c) => (
                <div
                  key={c.customer_id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-md border border-border/80 rounded-xl p-md bg-muted/20 hover:bg-muted/40 transition-all duration-300"
                >
                  <div className="space-y-sm flex-1">
                    <div className="flex items-center gap-sm flex-wrap">
                      <Link
                        href={`/customers/${c.customer_id}`}
                        className="text-body-md font-bold text-foreground hover:underline flex items-center gap-xs"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        {c.name}
                      </Link>
                      <Badge className={getRiskBadgeClass(c.risk_level)}>
                        {(c.churn_score * 100).toFixed(0)}% Churn Risk
                      </Badge>
                    </div>
                    
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-xs">
                      <div 
                        className={`h-full ${c.churn_score >= 0.8 ? 'bg-destructive' : c.churn_score >= 0.6 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.min(100, Math.max(0, c.churn_score * 100))}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-xs mt-sm">
                      {c.contributing_factors.map((factor) => (
                        <span
                          key={factor}
                          className="text-[10px] bg-muted/65 text-muted-foreground px-sm py-0.5 rounded-full font-medium"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                    
                    {c.last_order_date && (
                      <div className="text-[11px] text-muted-foreground mt-xs">
                        Last Order: {new Date(c.last_order_date).toLocaleDateString()}
                      </div>
                    )}

                    <div className="text-body-sm text-foreground/80 mt-sm">
                      <span className="font-semibold text-foreground">Next Best Action: </span>
                      {c.recommended_action}
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-xs border-border/80 text-body-sm hover:bg-primary hover:text-primary-foreground duration-300 font-medium"
                      onClick={() => handleTakeAction(c)}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Execute NBA
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-sm border-t border-border mt-md">
            <Link 
              href="/customers/at-risk" 
              className="flex items-center justify-center gap-sm text-sm font-medium text-primary hover:underline py-sm"
            >
              View all at-risk customers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="valuable" className="p-lg pt-0 flex-1 overflow-y-auto mt-0 h-full data-[state=active]:flex flex-col">
          <div className="space-y-md flex-1">
            {valuableCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl text-center space-y-sm text-muted-foreground text-body-sm h-full">
                No highly valuable customers detected yet.
              </div>
            ) : (
              valuableCustomers.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-md border border-border/80 rounded-xl p-md bg-muted/20 hover:bg-muted/40 transition-all duration-300"
                >
                  <div className="space-y-sm flex-1">
                    <div className="flex items-center gap-sm flex-wrap">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-body-md font-bold text-foreground hover:underline flex items-center gap-xs"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        {c.displayName}
                      </Link>
                      <Badge className="bg-badge-success text-badge-success-foreground border-badge-success/30 font-medium">
                        High CLV Segment
                      </Badge>
                    </div>
                    
                    <div className="text-body-sm text-foreground/80 mt-sm">
                      <span className="text-muted-foreground">{c.email}</span>
                    </div>

                    <div className="flex flex-wrap gap-xs mt-xs">
                      <span className="text-[10px] bg-primary/10 text-primary px-sm py-0.5 rounded-full font-medium">
                        {c.orderCount} Orders
                      </span>
                      <span className="text-[10px] bg-success/10 text-success font-bold px-sm py-0.5 rounded-full">
                        ${c.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LTV
                      </span>
                      <span className="text-[10px] bg-muted/65 text-muted-foreground px-sm py-0.5 rounded-full font-medium">
                        Since {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Link href={`/customers/${c.id}`} passHref>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-xs border-border/80 text-body-sm hover:bg-primary hover:text-primary-foreground duration-300 font-medium"
                      >
                        View Profile
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pt-sm border-t border-border mt-md">
            <Link 
              href="/customers" 
              className="flex items-center justify-center gap-sm text-sm font-medium text-primary hover:underline py-sm"
            >
              View all customers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </TabsContent>
      </Tabs>

      <RetentionActionModal 
        customer={selectedCustomer} 
        open={!!selectedCustomer} 
        onClose={() => setSelectedCustomer(null)}
        onSuccess={handleActionSuccess}
      />
    </Card>
  );
}
