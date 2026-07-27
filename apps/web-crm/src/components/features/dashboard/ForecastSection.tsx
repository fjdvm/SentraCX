"use client";

import React, { useState } from "react";
import { useDashboardForecasts } from "@/hooks/useDashboardForecasts";
import { TicketVolumeForecastChart } from "./TicketVolumeForecastChart";
import { RevenueBySegmentChart } from "./RevenueBySegmentChart";
import { ChurnDistributionChart } from "./ChurnDistributionChart";
import { SentimentTrendChart } from "./SentimentTrendChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ForecastSection() {
  const [days, setDays] = useState(7);
  const {
    ticketVolume,
    revenueBySegment,
    churnDistribution,
    sentimentTrend,
    isLoading,
  } = useDashboardForecasts(days);

  return (
    <div className="space-y-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md border-b border-border pb-md">
        <div>
          <h2 className="text-headline-sm font-bold text-foreground">Predictive & Forecast Intelligence</h2>
          <p className="text-body-sm text-muted-foreground">AI projected workloads, sentiment and financial metrics</p>
        </div>
        <div>
          <Tabs
            value={days.toString()}
            onValueChange={(val) => setDays(parseInt(val, 10))}
            className="w-auto"
          >
            <TabsList className="grid grid-cols-3 w-[240px]">
              <TabsTrigger value="7">7 Days</TabsTrigger>
              <TabsTrigger value="14">14 Days</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div>
          <TicketVolumeForecastChart data={ticketVolume} isLoading={isLoading} />
        </div>
        <div>
          <RevenueBySegmentChart data={revenueBySegment} isLoading={isLoading} days={days} />
        </div>
        <div>
          <ChurnDistributionChart data={churnDistribution} isLoading={isLoading} />
        </div>
        <div>
          <SentimentTrendChart data={sentimentTrend} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
