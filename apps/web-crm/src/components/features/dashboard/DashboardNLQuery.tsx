"use client";

import React, { useState, useEffect, useRef } from "react";
import { aiClient } from "@/lib/api/ai-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, History, Send, Database, BarChart3, HelpCircle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SUGGESTED_QUERIES = [
  "Show me customers at high churn risk",
  "Ticket volume last 7 days",
  "Top performing campaign this month",
];

export function DashboardNLQuery() {
  const [queryText, setQueryText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sentracx:nl_query_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load query history:", e);
    }
  }, []);

  const saveQueryToHistory = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const newHistory = [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, 10);
    setHistory(newHistory);
    try {
      localStorage.setItem("sentracx:nl_query_history", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save query history:", e);
    }
  };

  const handleQuerySubmit = async (textToSubmit: string) => {
    const trimmed = textToSubmit.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setResult(null);
    try {
      const res = await aiClient.dashboard.query(trimmed);
      setResult(res.result);
      saveQueryToHistory(trimmed);
    } catch (err) {
      toast.error(`Query failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    // Check if result has rows (Table)
    if (result.rows && Array.isArray(result.rows) && result.rows.length > 0) {
      const headers = Object.keys(result.rows[0]);
      return (
        <div className="space-y-sm mt-md">
          <div className="flex items-center gap-xs text-label-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            Query Result (Table)
          </div>
          <div className="border border-border/80 rounded-xl overflow-x-auto">
            <table className="w-full text-body-sm text-foreground border-collapse">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="text-left font-bold p-sm border-r border-border/40 last:border-r-0 uppercase text-[10px] tracking-wider text-muted-foreground">
                      {h.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border/40 last:border-b-0 hover:bg-muted/10">
                    {headers.map((h) => (
                      <td key={h} className="p-sm border-r border-border/40 last:border-r-0">
                        {row[h] !== null && row[h] !== undefined ? row[h].toString() : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Check if result has series (Line Chart)
    if (result.series && Array.isArray(result.series) && result.series.length > 0) {
      // Find keys representing X axis and Y axis
      const sample = result.series[0];
      const keys = Object.keys(sample);
      const xAxisKey = keys.find((k) => /date|time|label|category|name/i.test(k)) || keys[0];
      const yAxisKey = keys.find((k) => /value|count|total|score|amt/i.test(k)) || keys[1] || keys[0];

      return (
        <div className="space-y-sm mt-md">
          <div className="flex items-center gap-xs text-label-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            Query Result (Chart)
          </div>
          <div className="h-[220px] w-full border border-border/80 rounded-xl p-md bg-muted/5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.series} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border) / 0.5)" />
                <XAxis
                  dataKey={xAxisKey}
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(var(--card))",
                    borderColor: "oklch(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={yAxisKey}
                  stroke="oklch(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    // Default Single Value / Fallback Card
    return (
      <div className="space-y-sm mt-md">
        <div className="flex items-center gap-xs text-label-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          Query Result
        </div>
        <div className="border border-border/80 rounded-xl p-lg bg-muted/10">
          <span className="text-display-xs font-bold text-foreground block">
            {typeof result === "object" ? JSON.stringify(result, null, 2) : result.toString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border shadow-none h-full">
      <CardHeader className="p-lg pb-sm">
        <div className="flex items-center gap-sm">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-headline-sm font-bold text-foreground">AI Natural Language Query</CardTitle>
        </div>
        <CardDescription>
          Ask questions in plain English to search customers, metrics, campaigns, and ticket trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-lg pt-sm space-y-md">
        <div className="flex items-center gap-sm">
          <Input
            placeholder="e.g. Show me customers at high churn risk..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuerySubmit(queryText);
            }}
            disabled={isLoading}
            className="flex-1"
          />
          <Button disabled={isLoading || !queryText.trim()} onClick={() => handleQuerySubmit(queryText)}>
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Ask
              </>
            )}
          </Button>
        </div>

        {/* Suggested Queries */}
        <div className="flex flex-wrap items-center gap-xs">
          <span className="text-body-xs font-medium text-muted-foreground">Try:</span>
          {SUGGESTED_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQueryText(q);
                handleQuerySubmit(q);
              }}
              disabled={isLoading}
              className="text-[10px] bg-muted/65 text-muted-foreground px-sm py-1 rounded-md font-semibold border border-transparent hover:border-border/60 hover:bg-muted/80 transition-all duration-300"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Query History */}
        {history.length > 0 && (
          <div className="flex items-start gap-sm border-t border-border/40 pt-md mt-sm">
            <History className="w-3.5 h-3.5 text-muted-foreground mt-1.5" />
            <div className="flex flex-wrap gap-xs flex-1">
              {history.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQueryText(q);
                    handleQuerySubmit(q);
                  }}
                  disabled={isLoading}
                  className="text-[10px] border border-border/50 text-muted-foreground px-xs py-1 rounded-md font-medium hover:bg-muted/30 transition-all duration-300 max-w-[150px] truncate"
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {renderResult()}
      </CardContent>
    </Card>
  );
}
