import React from "react";
import { cn } from "../lib/utils";

export type BadgeVariant =
  "default" | "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 ring-1 ring-slate-600/10",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-500/10",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
  info: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-slate-500",
  neutral: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
};

export function Badge({
  children,
  variant = "default",
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider uppercase",
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            dotColors[variant],
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  // Loan statuses
  APPLIED: "info",
  SANCTIONED: "success",
  DISBURSED: "warning",
  CLOSED: "neutral",
  REJECTED: "danger",
  // Lead stages
  REGISTERED_ONLY: "neutral",
  PROFILE_DONE: "success",
  BRE_REJECTED: "danger",
  // Generic
  ACTIVE: "success",
  INACTIVE: "neutral",
  PASSED: "success",
  FAILED: "danger",
};

/** Automatically maps known status strings to the correct variant with an indicator dot. */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const variant = STATUS_MAP[status] ?? "default";
  return (
    <Badge variant={variant} className={className} dot>
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
