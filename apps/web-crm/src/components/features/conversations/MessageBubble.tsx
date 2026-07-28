"use client";

import React from "react";
import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/types/message";

interface MessageBubbleProps {
  message: Message;
  isStaff: boolean;
}

export function MessageBubble({ message, isStaff }: MessageBubbleProps) {
  const isCustomer = !isStaff;
  const formattedTime = new Date(message.sentAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex gap-xs ${isStaff ? "flex-row-reverse" : "flex-row"} items-end`}>
      <Avatar className="h-6 w-6 shrink-0 mb-1">
        <AvatarFallback
          className={`text-[9px] font-bold ${
            isStaff
              ? "bg-primary text-primary-foreground"
              : "bg-muted-foreground/20 text-muted-foreground"
          }`}
        >
          {isStaff ? (
            <UserRound className="w-3 h-3" />
          ) : (
            message.senderName?.[0]?.toUpperCase() ?? "C"
          )}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col max-w-[72%] ${isStaff ? "items-end" : "items-start"}`}>
        <span className="text-[10px] text-muted-foreground mb-0.5 px-1 font-medium">
          {message.senderName}
        </span>
        <div
          className={`p-md rounded-xl space-y-xs ${
            isStaff
              ? "bg-primary text-primary-foreground rounded-tr-none font-medium"
              : isCustomer
              ? "bg-muted border border-border text-foreground rounded-tl-none font-medium"
              : "bg-muted border border-border text-foreground rounded-tl-none font-medium"
          }`}
        >
          <p className="text-body-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <span
            className={`text-[10px] block text-right font-mono ${
              isStaff ? "text-primary-foreground/85 font-semibold" : "text-muted-foreground"
            }`}
          >
            {formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
}
