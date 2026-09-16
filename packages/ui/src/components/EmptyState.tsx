import React from "react";
import { cn } from "../lib/utils";
import { SparklesIcon } from "./Icons";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-10 rounded-2xl border border-dashed border-slate-300/80 bg-white/60 backdrop-blur-xs",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-slate-400 text-3xl">{icon}</div>
      ) : (
        <div className="mb-4 w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
          <SparklesIcon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
