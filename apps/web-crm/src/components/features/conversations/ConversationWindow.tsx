"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, CheckCircle, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Ticket } from "@/types/ticket";
import { Message } from "@/types/message";

interface ConversationWindowProps {
  ticket: Ticket | null;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onComplete: (ticketId: string) => void;
  onUnclaim: (ticketId: string) => void;
  onCancel?: (ticketId: string) => void;
}

export function ConversationWindow({
  ticket,
  messages,
  isLoading,
  onSendMessage,
  onComplete,
  onUnclaim,
  onCancel,
}: ConversationWindowProps) {
  const [typedMessage, setTypedMessage] = useState("");
  const [isBotSummaryOpen, setIsBotSummaryOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !ticket) return;
    onSendMessage(typedMessage);
    setTypedMessage("");
  };

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-background text-muted-foreground text-body-sm p-lg">
        Select a conversation to start messaging
      </div>
    );
  }

  const botContextDelimiter = "--- Bot Context ---";
  const hasBotContext = ticket.description?.includes(botContextDelimiter);
  let botSummary = "";
  if (hasBotContext) {
    const parts = ticket.description.split(botContextDelimiter);
    botSummary = parts[1]?.trim() || "";
  }

  const customerInitials =
    ticket.customerName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase() || "C";

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0">
      {/* Header */}
      <div className="p-md border-b border-border flex items-center justify-between bg-card gap-md">
        <div className="flex items-center gap-md min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
              {customerInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="text-label-md font-bold text-foreground truncate">
              {ticket.customerName}
            </h3>
            <p className="text-label-sm text-muted-foreground truncate">
              {ticket.title}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-xs shrink-0">
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(ticket.id)}
              className="text-destructive border-destructive/20 hover:bg-destructive/10 text-label-sm font-semibold gap-xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Ticket
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onUnclaim(ticket.id)}
            className="text-label-sm font-semibold gap-xs"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Unclaim
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="bg-primary text-primary-foreground font-semibold text-label-sm gap-xs">
                <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                Complete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg sm:rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Mark Conversation as Completed?</AlertDialogTitle>
                <AlertDialogDescription>
                  This ticket will be marked as resolved and closed. You can view completed tickets under closed filters.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-primary text-primary-foreground font-semibold" onClick={() => onComplete(ticket.id)}>
                  Mark Completed
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Bot Context Card */}
      {hasBotContext && (
        <div className="mx-lg mt-md p-md bg-muted/40 border border-border/80 rounded-xl shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-bold text-muted-foreground flex items-center gap-xs">
              🤖 Bot Context Summary
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-semibold px-sm hover:bg-muted/80"
              onClick={() => setIsBotSummaryOpen(!isBotSummaryOpen)}
            >
              {isBotSummaryOpen ? "Hide" : "Show"}
            </Button>
          </div>
          {isBotSummaryOpen && (
            <p className="mt-xs text-body-sm leading-relaxed text-foreground font-medium whitespace-pre-wrap">
              {botSummary}
            </p>
          )}
        </div>
      )}

      {/* Message Thread */}
      <div className="flex-1 p-lg overflow-y-auto space-y-md">
        {isLoading ? (
          <div className="space-y-md animate-pulse">
            <Skeleton className="h-12 w-2/3 rounded-xl bg-muted/60" />
            <Skeleton className="h-12 w-1/2 ml-auto rounded-xl bg-muted/60" />
            <Skeleton className="h-12 w-3/4 rounded-xl bg-muted/60" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-body-sm py-xl">
            No messages yet. Send a message to start the conversation.
          </div>
        ) : (
          messages.map((m) => {
            const isStaff = ticket.assignedToId ? m.senderId === ticket.assignedToId : false;
            const formattedTime = new Date(m.sentAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-muted-foreground mb-1 px-1 font-medium">
                  {m.senderName}
                </span>
                <div
                  className={`max-w-[75%] p-md rounded-xl space-y-xs ${
                    isStaff
                      ? "bg-primary text-primary-foreground rounded-tr-none font-medium"
                      : "bg-muted border border-border text-foreground rounded-tl-none font-medium"
                  }`}
                >
                  <p className="text-body-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  <span
                    className={`text-[10px] block text-right font-mono ${
                      isStaff ? "text-primary-foreground/85 font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {formattedTime}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-border bg-card flex gap-md">
        <Input
          placeholder="Type message here..."
          value={typedMessage}
          onChange={(e) => setTypedMessage(e.target.value)}
          className="flex-1 bg-muted/50 border-border text-body-sm"
        />
        <Button type="submit" size="icon" className="bg-primary text-primary-foreground font-semibold" disabled={!typedMessage.trim()}>
          <Send className="w-4 h-4 text-primary-foreground" />
        </Button>
      </form>
    </div>
  );
}
