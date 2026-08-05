"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, CheckCircle, Undo2, XCircle, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AiTextarea as Textarea } from "@/components/ui/ai-textarea";
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
import { BotContextPanel } from "./BotContextPanel";
import { MessageBubble } from "./MessageBubble";

interface ConversationWindowProps {
  ticket: Ticket | null;
  messages: Message[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSendMessage: (content: string) => void;
  onComplete: (ticketId: string) => void;
  onUnclaim: (ticketId: string) => void;
  onCancel?: (ticketId: string) => void;
}

export function ConversationWindow({
  ticket,
  messages,
  isLoading,
  error,
  onRetry,
  onSendMessage,
  onComplete,
  onUnclaim,
  onCancel,
}: ConversationWindowProps) {
  const [typedMessage, setTypedMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !ticket) return;
    onSendMessage(typedMessage);
    setTypedMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
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
            <AlertDialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[80vw] md:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-md sm:p-lg rounded-lg sm:rounded-xl">
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
      <BotContextPanel botSummary={botSummary} />

      {/* Message Thread */}
      <div className="flex-1 p-lg overflow-y-auto space-y-md">
        {isLoading ? (
          <div className="space-y-md animate-pulse">
            <Skeleton className="h-12 w-2/3 rounded-xl bg-muted/60" />
            <Skeleton className="h-12 w-1/2 ml-auto rounded-xl bg-muted/60" />
            <Skeleton className="h-12 w-3/4 rounded-xl bg-muted/60" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-sm text-center">
            <p className="text-body-sm text-destructive">{error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-body-sm py-xl">
            No messages yet. Send a message to start the conversation.
          </div>
        ) : (
          <>
            {hasBotContext && (
              <div className="flex items-center gap-sm py-xs">
                <div className="flex-1 h-px bg-border" />
                <div className="flex items-center gap-xs px-sm py-xs rounded-full bg-muted border border-border text-[10px] font-semibold text-muted-foreground shrink-0">
                  <ArrowUpFromLine className="w-3 h-3" />
                  Escalated from bot — live agent joined
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isStaff={ticket.assignedToId ? m.senderId === ticket.assignedToId : false}
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-sm sm:p-md border-t border-border bg-card flex items-end gap-md">
        <Textarea
          ref={textareaRef}
          context="Replying to customer support ticket."
          placeholder="Type message here..."
          value={typedMessage}
          onChange={(e) => {
            setTypedMessage(e.target.value);
            if (textareaRef.current) {
              textareaRef.current.style.height = "40px";
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          className="flex-1 bg-muted/50 border-border text-body-sm min-h-[40px] max-h-[120px] py-2 resize-none overflow-y-auto"
          spellCheck={true}
          autoComplete="on"
          data-gramm="true"
          data-gramm_editor="true"
        />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0 bg-primary text-primary-foreground font-semibold" disabled={!typedMessage.trim()}>
          <Send className="w-4 h-4 text-primary-foreground" />
        </Button>
      </form>
    </div>
  );
}
