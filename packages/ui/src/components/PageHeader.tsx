import React from "react";
import { cn } from "../lib/utils";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-8 border-b border-slate-200/80",
        className,
      )}
    >
      <div>
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3 shrink-0">{action}</div>
      )}
    </div>
  );
}
