"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { aiClient } from "@/lib/api/ai-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, History, HelpCircle, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { renderMessageContent, type Message } from "./ask-sentracx-message-renderer";

const SUGGESTED_QUERIES = [
  "How many support requests this month?",
  "Which customers might leave soon?",
  "Top performing campaign this month",
];

export function AskSentraCXPanel() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("sentracx:ask_query_history");
      if (storedHistory) setHistory(JSON.parse(storedHistory));
      const storedMessages = sessionStorage.getItem("sentracx:ask_messages");
      if (storedMessages) setMessages(JSON.parse(storedMessages));
    } catch (e) {
      console.error("Failed to load history or messages:", e);
    }
  }, []);

  const saveQueryToHistory = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const newHistory = [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, 10);
    setHistory(newHistory);
    try { localStorage.setItem("sentracx:ask_query_history", JSON.stringify(newHistory)); } catch (e) { console.error(e); }
  };

  const saveMessagesToSession = (newMsgs: Message[]) => {
    setMessages(newMsgs);
    try { sessionStorage.setItem("sentracx:ask_messages", JSON.stringify(newMsgs)); } catch (e) { console.error(e); }
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
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const agentId = session?.user?.id || session?.user?.email || undefined;
      const response = await aiClient.dashboard.ask(trimmed, agentId);
      saveMessagesToSession([...updatedMessages, { role: "assistant", type: response.type, content: response.content }]);
    } catch {
      toast.error("Failed to process your request. Please try again.");
      saveMessagesToSession([...updatedMessages, { role: "assistant", type: "text", content: "Sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem("sentracx:ask_query_history"); } catch (e) { console.error(e); }
    toast.success("Query history cleared.");
  };

  const handleClearChat = () => {
    saveMessagesToSession([]);
    toast.success("Conversation cleared.");
  };

  return (
    <>
      {/* FAB trigger — fixed to viewport bottom-right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-all duration-300 bg-primary text-primary-foreground z-[999] border border-border/20 cursor-pointer flex items-center justify-center"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
        </button>
      )}

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] bg-black/80 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side panel — fixed to viewport, slides in from right */}
      <div
        className={`fixed top-0 right-0 z-[999] h-dvh w-full sm:w-[400px] md:w-[440px] bg-background border-l border-border shadow-lg flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="p-lg border-b border-border bg-muted/10 space-y-sm shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-headline-sm font-bold text-foreground">Ask SentrAI</h2>
            </div>
            <div className="flex items-center gap-sm">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Clear conversation</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Get instant AI insights on customers, support queue, campaigns, and sentiment.
          </p>
        </div>

        {/* Scrollable messages */}
        <div className="flex-1 overflow-y-auto p-lg space-y-lg min-h-0 bg-muted/5">
          {messages.length === 0 ? (
            <EmptyState
              history={history}
              onSend={handleSend}
              onClearHistory={handleClearHistory}
            />
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-300`}
              >
                <div className={`max-w-[85%] rounded-2xl p-md shadow-none ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-card border border-border text-foreground rounded-tl-none"
                }`}>
                  {renderMessageContent(msg)}
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
        <div className="p-lg border-t border-border bg-card shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(queryText); }} className="flex items-center gap-sm">
            <Input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 text-body-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 border-border/80 bg-muted/10 h-10"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0 bg-primary text-primary-foreground shadow-none cursor-pointer" disabled={!queryText.trim() || isLoading}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

function EmptyState({ history, onSend, onClearHistory }: { history: string[]; onSend: (q: string) => void; onClearHistory: () => void }) {
  return (
    <div className="space-y-xl py-lg">
      <div className="flex flex-col items-center justify-center text-center space-y-md">
        <HelpCircle className="w-10 h-10 text-muted-foreground/60" />
        <div className="space-y-xs">
          <h3 className="text-body-md font-bold text-foreground">How can I help you today?</h3>
          <p className="text-body-sm text-muted-foreground max-w-[260px]">Ask about support volumes, customer risks, campaign performance, or trends.</p>
        </div>
      </div>
      <div className="space-y-sm">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block px-xs">Suggested Queries</span>
        <div className="flex flex-col gap-sm">
          {SUGGESTED_QUERIES.map((q) => (
            <button key={q} onClick={() => onSend(q)} className="text-left text-body-sm font-semibold p-md rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-all duration-300 text-foreground shadow-none">
              {q}
            </button>
          ))}
        </div>
      </div>
      {history.length > 0 && (
        <div className="space-y-sm pt-md border-t border-border/50">
          <div className="flex items-center justify-between px-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-xs">
              <History className="w-3.5 h-3.5" />Recent Queries
            </span>
            <button onClick={onClearHistory} className="text-[10px] text-muted-foreground hover:text-primary transition font-semibold">Clear</button>
          </div>
          <div className="flex flex-col gap-xs max-h-[160px] overflow-y-auto">
            {history.map((h, i) => (
              <button key={i} onClick={() => onSend(h)} className="text-left text-body-sm p-sm rounded-lg hover:bg-muted/50 transition text-muted-foreground truncate w-full">{h}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
