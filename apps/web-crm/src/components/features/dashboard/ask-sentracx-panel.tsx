"use client";

import React, { useState, useEffect, useRef } from "react";
import { aiClient } from "@/lib/api/ai-client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Send, Sparkles, History, HelpCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  type?: "text" | "chart" | "table" | "value";
  content: any;
}

const SUGGESTED_QUERIES = [
  "How many support requests this month?",
  "Which customers might leave soon?",
  "Top performing campaign this month",
];

export function AskSentraCXPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history & session messages on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("sentracx:ask_query_history");
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
      const storedMessages = sessionStorage.getItem("sentracx:ask_messages");
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (e) {
      console.error("Failed to load history or messages:", e);
    }
  }, []);

  const saveQueryToHistory = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const newHistory = [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, 10);
    setHistory(newHistory);
    try {
      localStorage.setItem("sentracx:ask_query_history", JSON.stringify(newHistory));
    } catch (e) {
      console.error(e);
    }
  };

  const saveMessagesToSession = (newMsgs: Message[]) => {
    setMessages(newMsgs);
    try {
      sessionStorage.setItem("sentracx:ask_messages", JSON.stringify(newMsgs));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    saveMessagesToSession(updatedMessages);
    setQueryText("");
    setIsLoading(true);
    saveQueryToHistory(trimmed);

    // Scroll to bottom
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const response = await aiClient.dashboard.ask(trimmed);
      const assistantMsg: Message = {
        role: "assistant",
        type: response.type,
        content: response.content,
      };
      saveMessagesToSession([...updatedMessages, assistantMsg]);
    } catch (err) {
      toast.error("Failed to process your request. Please try again.");
      const errorMsg: Message = {
        role: "assistant",
        type: "text",
        content: "Sorry, I encountered an error while processing your request. Please try again later.",
      };
      saveMessagesToSession([...updatedMessages, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("sentracx:ask_query_history");
    } catch (e) {
      console.error(e);
    }
    toast.success("Query history cleared.");
  };

  const renderContent = (msg: Message) => {
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
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Floating Action Button (FAB) bottom-right */}
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-all duration-300 bg-primary text-primary-foreground z-50 border border-border/20 cursor-pointer"
        >
          <MessageSquare className="w-6 h-6 animate-pulse" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md h-full flex flex-col p-0 bg-background border-l border-border z-[100]">
        <SheetHeader className="p-lg border-b border-border bg-muted/10 space-y-sm">
          <div className="flex items-center gap-sm">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <SheetTitle className="text-headline-sm font-bold text-foreground">Ask SentraCX</SheetTitle>
          </div>
          <SheetDescription className="text-body-sm text-muted-foreground">
            Get instant AI insights on customers, support queue, campaigns, and sentiment.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable messages area */}
        <div className="flex-1 overflow-y-auto p-lg space-y-lg min-h-0 bg-muted/5">
          {messages.length === 0 ? (
            <div className="space-y-xl py-lg">
              <div className="flex flex-col items-center justify-center text-center space-y-md">
                <HelpCircle className="w-10 h-10 text-muted-foreground/60" />
                <div className="space-y-xs">
                  <h3 className="text-body-md font-bold text-foreground">How can I help you today?</h3>
                  <p className="text-body-sm text-muted-foreground max-w-[260px]">
                    Ask about support volumes, customer risks, campaign performance, or trends.
                  </p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-sm">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block px-xs">
                  Suggested Queries
                </span>
                <div className="flex flex-col gap-sm">
                  {SUGGESTED_QUERIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-left text-body-sm font-semibold p-md rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-all duration-300 text-foreground shadow-none"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="space-y-sm pt-md border-t border-border/50">
                  <div className="flex items-center justify-between px-xs">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-xs">
                      <History className="w-3.5 h-3.5" />
                      Recent Queries
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="text-[10px] text-muted-foreground hover:text-primary transition font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-col gap-xs max-h-[160px] overflow-y-auto">
                    {history.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(h)}
                        className="text-left text-body-sm p-sm rounded-lg hover:bg-muted/50 transition text-muted-foreground truncate w-full"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex w-full ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in duration-300`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-md shadow-none ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-card border border-border text-foreground rounded-tl-none"
                  }`}
                >
                  {renderContent(msg)}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-card border border-border text-foreground rounded-2xl rounded-tl-none p-md space-y-sm max-w-[200px]">
                <div className="flex items-center gap-sm">
                  <Sparkles className="w-4 h-4 text-success animate-pulse" />
                  <span className="text-body-xs font-semibold text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input pinned to bottom */}
        <div className="p-lg border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(queryText);
            }}
            className="flex items-center gap-sm"
          >
            <Input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 text-body-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 border-border/80 bg-muted/10 h-10"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 bg-primary text-primary-foreground shadow-none cursor-pointer"
              disabled={!queryText.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
