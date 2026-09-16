import React from "react";
import { cn } from "../lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeStyles: Record<NonNullable<SpinnerProps["size"]>, string> = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-3",
};

export function Spinner({
  size = "md",
  className,
  label = "Loading…",
}: SpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-slate-200 border-t-indigo-600 animate-spin shrink-0",
        sizeStyles[size],
        className,
      )}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageSpinner() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center py-12 gap-3">
      <Spinner size="lg" />
      <span className="text-xs font-medium text-slate-400 animate-pulse">
        Loading...
      </span>
    </div>
  );
}
