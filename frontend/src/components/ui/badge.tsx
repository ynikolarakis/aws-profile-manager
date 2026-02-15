import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--ac)]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--ac)] text-white",
        secondary: "border-transparent bg-[var(--bg-3)] text-[var(--t2)]",
        outline: "border-[var(--border)] text-[var(--t3)]",
        destructive: "border-transparent bg-[var(--red-dim)] text-[var(--red)]",
        success: "border-transparent bg-[var(--green-dim)] text-[var(--green)]",
        warning: "border-transparent bg-[var(--amber-dim)] text-[var(--amber)]",
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
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
