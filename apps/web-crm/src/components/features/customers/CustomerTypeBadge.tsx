import React from "react";
import { Badge } from "@/components/ui/badge";
import { CustomerType } from "@/types/customer";

interface CustomerTypeBadgeProps {
  customerType: CustomerType;
}

export function CustomerTypeBadge({ customerType }: CustomerTypeBadgeProps) {
  let label = "Regular";
  let styleClass = "bg-badge-info text-badge-info-foreground border-transparent";

  switch (customerType) {
    case "InstitutionalBuyer":
      label = "Institutional Buyer";
      styleClass = "bg-badge-indigo text-badge-indigo-foreground border-transparent";
      break;
    default:
      label = "Regular";
      styleClass = "bg-badge-info text-badge-info-foreground border-transparent";
      break;
  }

  return (
    <Badge className={`text-label-sm font-medium border-none shadow-none ${styleClass}`}>
      {label}
    </Badge>
  );
}
