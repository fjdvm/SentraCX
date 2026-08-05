import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-sm.5 py-0.5 text-xs font-semibold transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:opacity-80",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-badge-destructive text-badge-destructive-foreground",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-badge-success text-badge-success-foreground",
        warning:
          "border-transparent bg-badge-warning text-badge-warning-foreground",
        info:
          "border-transparent bg-badge-info text-badge-info-foreground",
        purple:
          "border-transparent bg-badge-purple text-badge-purple-foreground",
        indigo:
          "border-transparent bg-badge-indigo text-badge-indigo-foreground",
        notification:
          "border-transparent bg-badge-notification text-badge-notification-foreground shadow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
