import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/80 dark:bg-blue-950/60 dark:text-blue-200",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/60 dark:text-emerald-200",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200",
        destructive:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800/80 dark:bg-red-950/60 dark:text-red-200",
        outline:
          "border-slate-200 text-slate-700 bg-white dark:border-slate-700 dark:text-slate-300 dark:bg-slate-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
