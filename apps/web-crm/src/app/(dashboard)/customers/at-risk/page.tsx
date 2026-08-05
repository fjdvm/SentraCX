import React from "react";
import { Metadata } from "next";
import { AtRiskTable } from "@/components/features/customers/AtRiskTable";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "At-Risk Customers | SentraCX",
  description: "Manage and execute retention actions for at-risk customers.",
};

export default function AtRiskCustomersPage() {
  return (
    <div className="w-full min-h-full py-xl px-lg md:px-xl space-y-2xl max-w-7xl mx-auto">
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div className="space-y-sm">
          <h1 className="text-headline-md font-bold tracking-tight text-foreground">
            At-Risk Customers
          </h1>
          <p className="text-body-md text-muted-foreground">
            Review customers with high churn probability and execute retention strategies.
          </p>
        </div>
      </div>

      <Card className="shadow-none border-border flex flex-col">
        <CardHeader className="pb-md p-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
          <CardTitle className="text-title-lg font-bold">
            Watchlist Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="py-md pt-0 overflow-x-auto">
          <AtRiskTable />
        </CardContent>
      </Card>
    </div>
  );
}
