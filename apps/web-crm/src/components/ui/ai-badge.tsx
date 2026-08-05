import React from "react";
import { Badge } from "./badge";
import { Sparkles } from "lucide-react";

interface AiBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function AiBadge({ children, className }: AiBadgeProps) {
  return (
    <Badge variant="purple" className={`inline-flex items-center gap-xs.5 w-fit ${className || ""}`}>
      <Sparkles className="w-3 h-3 text-badge-purple-foreground shrink-0" />
      <span>{children}</span>
    </Badge>
  );
}
