"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Message {
  role: "user" | "assistant";
  type?: "text" | "chart" | "table" | "value";
  content: any;
}

export function renderMessageContent(msg: Message) {
  if (msg.role === "user") {
    return <p className="text-body-sm text-primary-foreground">{msg.content}</p>;
  }

  const { type, content } = msg;

  switch (type) {
    case "value":
      return (
        <div className="bg-card border border-border p-md rounded-xl space-y-sm shadow-sm animate-in fade-in duration-300">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            {content.label || "Result"}
          </span>
          <div className="flex items-baseline gap-md">
            <span className="text-headline-md font-bold text-foreground">{content.value}</span>
            {content.delta && (
              <span className="text-body-sm font-bold text-success">
                {content.delta}
              </span>
            )}
          </div>
        </div>
      );

    case "table":
      const headers = content.headers || [];
      const rows = content.rows || [];
      return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300 w-full">
          <div className="max-h-[220px] overflow-auto">
            <Table className="w-full text-left border-collapse">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/30">
                  {headers.map((h: string) => (
                    <TableHead key={h} className="text-body-xs font-bold text-muted-foreground uppercase p-sm">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any, rIdx: number) => (
                  <TableRow key={rIdx} className="border-b border-border hover:bg-muted/10">
                    {headers.map((h: string) => (
                      <TableCell key={h} className="text-body-sm text-foreground p-sm font-medium">
                        {row[h] !== undefined ? String(row[h]) : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );

    case "chart":
      const series = content.series || [];
      return (
        <div className="bg-card border border-border p-md rounded-xl space-y-sm shadow-sm animate-in fade-in duration-300 w-full">
          <div className="flex items-center gap-xs text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-success" />
            <span>Projected Trend Chart</span>
          </div>
          <div className="h-[140px] w-full mt-sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(var(--card))",
                    borderColor: "oklch(var(--border))",
                    borderRadius: "0.25rem",
                    fontSize: "10px",
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="oklch(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );

    case "text":
    default:
      return <p className="text-body-sm text-foreground whitespace-pre-wrap leading-relaxed">{String(content)}</p>;
  }
}

export type { Message };
