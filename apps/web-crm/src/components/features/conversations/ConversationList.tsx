"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketListItem } from "@/types/ticket";
import { formatConversationTime } from "@/lib/format-conversation-time";

interface ConversationListProps {
  tickets: TicketListItem[];
  activeTicketId: string | null;
  onSelect: (ticketId: string) => void;
  isLoading: boolean;
  error: string | null;
  activeTab: "all" | "unread" | "read";
  onTabChange: (tab: "all" | "unread" | "read") => void;
}

export function ConversationList({
  tickets,
  activeTicketId,
  onSelect,
  isLoading,
  error,
  activeTab,
  onTabChange,
}: ConversationListProps) {
  const unreadTotal = tickets.reduce(
    (acc, t) => acc + ((t.unreadMessageCount ?? 0) > 0 ? 1 : 0),
    0
  );

  const filteredTickets = tickets.filter((t) => {
    const count = t.unreadMessageCount ?? 0;
    if (activeTab === "unread") return count > 0;
    if (activeTab === "read") return count === 0;
    return true;
  });

  return (
    <div className="w-full md:w-80 border-r border-border flex flex-col h-full bg-card shrink-0">
      <div className="p-md border-b border-border flex flex-col gap-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-title-lg font-bold text-foreground flex items-center gap-sm">
            <MessageSquare className="w-5 h-5" />
            Conversations
          </h2>
          <Badge className="bg-primary text-primary-foreground border-none shadow-none font-bold">
            {unreadTotal} Unread
          </Badge>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-muted p-xs rounded-lg text-label-sm font-medium">
          {(["all", "unread", "read"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`flex-1 py-xs text-center rounded-md capitalize transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground font-semibold"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {isLoading ? (
          <div className="p-md space-y-md animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-md">
                <Skeleton className="h-10 w-10 rounded-full shrink-0 bg-muted/60" />
                <div className="space-y-xs flex-1">
                  <Skeleton className="h-4 w-24 bg-muted/60" />
                  <Skeleton className="h-3 w-36 bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-md text-body-sm text-destructive text-center">
            {error}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-md text-body-sm text-muted-foreground text-center py-lg">
            No conversations found.
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const hasUnread = (ticket.unreadMessageCount ?? 0) > 0;
            const initials =
              ticket.customerName
                .split(" ")
                .map((n) => n[0])
                .filter(Boolean)
                .join("")
                .toUpperCase() || "C";

            const activityTimestamp =
              ticket.lastMessageAt || ticket.updatedAt || ticket.createdAt;
            const formattedTime = formatConversationTime(activityTimestamp);
            const previewText = ticket.lastMessageContent || ticket.title;

            return (
              <div
                key={ticket.id}
                onClick={() => onSelect(ticket.id)}
                className={`p-md flex gap-md cursor-pointer transition-colors ${
                  ticket.id === activeTicketId ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-xs">
                    <h4 className="text-body-sm font-bold text-foreground truncate">
                      {ticket.customerName}
                    </h4>
                    <span
                      className={`text-label-sm font-mono ${
                        hasUnread ? "text-primary font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {formattedTime}
                    </span>
                  </div>
                  <p
                    className={`text-label-sm truncate ${
                      hasUnread
                        ? "text-foreground font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {previewText}
                  </p>
                </div>
                {hasUnread && (
                  <Badge className="h-5 px-xs.5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold self-center flex items-center justify-center">
                    {ticket.unreadMessageCount}
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
