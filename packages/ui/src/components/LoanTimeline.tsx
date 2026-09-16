"use client";

import React from "react";
import { formatDateTime } from "../lib/format";
import { cn } from "../lib/utils";
import type { LoanStatusHistoryItem } from "@repo/types";
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  XMarkIcon,
  LockClosedIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "./Icons";

export interface LoanTimelineProps {
  history: LoanStatusHistoryItem[];
  className?: string;
}

const statusConfig: Record<
  string,
  {
    badgeBg: string;
    badgeText: string;
    border: string;
    dotColor: string;
    IconComponent: React.ComponentType<{ className?: string }>;
    title: string;
  }
> = {
  APPLIED: {
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
    border: "border-blue-200",
    dotColor: "bg-blue-500 ring-blue-100",
    IconComponent: DocumentTextIcon,
    title: "Application Submitted",
  },
  SANCTIONED: {
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    border: "border-amber-200",
    dotColor: "bg-amber-500 ring-amber-100",
    IconComponent: ShieldCheckIcon,
    title: "Sanction Approved",
  },
  DISBURSED: {
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    border: "border-emerald-200",
    dotColor: "bg-emerald-500 ring-emerald-100",
    IconComponent: BanknotesIcon,
    title: "Funds Disbursed",
  },
  REJECTED: {
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    border: "border-rose-200",
    dotColor: "bg-rose-500 ring-rose-100",
    IconComponent: XMarkIcon,
    title: "Application Rejected",
  },
  CLOSED: {
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-700",
    border: "border-slate-300",
    dotColor: "bg-slate-500 ring-slate-200",
    IconComponent: LockClosedIcon,
    title: "Loan Fully Repaid & Closed",
  },
};

export function LoanTimeline({ history, className }: LoanTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-3 text-center italic">
        No lifecycle status records found.
      </div>
    );
  }

  // Chronological order (oldest to newest)
  const sorted = [...history].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  return (
    <div
      className={cn(
        "relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200",
        className,
      )}
    >
      {sorted.map((item, index) => {
        const cfg = statusConfig[item.to] ?? {
          badgeBg: "bg-slate-50",
          badgeText: "text-slate-700",
          border: "border-slate-200",
          dotColor: "bg-slate-400 ring-slate-100",
          IconComponent: ClockIcon,
          title: `Status: ${item.to}`,
        };

        const Icon = cfg.IconComponent;

        return (
          <div key={index} className="relative group">
            {/* Timeline Dot Indicator */}
            <div
              className={cn(
                "absolute -left-6 top-1 w-5 h-5 rounded-full ring-4 flex items-center justify-center text-[10px] text-white shadow-xs",
                cfg.dotColor,
              )}
            >
              <Icon className="w-3 h-3 text-white" />
            </div>

            {/* Event Header */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-bold border",
                    cfg.badgeBg,
                    cfg.badgeText,
                    cfg.border,
                  )}
                >
                  {cfg.title}
                </span>
                {item.from && (
                  <span className="text-[11px] text-slate-400">
                    from {item.from}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {formatDateTime(item.at)}
              </span>
            </div>

            {/* Executive Attribution */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
              <span className="text-slate-400">Action by:</span>
              <span className="font-semibold text-slate-800">
                {item.byUserName ||
                  (item.byUserId ? "System Operator" : "Borrower")}
              </span>
              {item.byUserEmail && (
                <span className="text-[11px] text-slate-400 font-mono">
                  ({item.byUserEmail})
                </span>
              )}
              {item.byUserRole && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                  {item.byUserRole}
                </span>
              )}
            </div>

            {/* Decision Explanation / Reason Callout */}
            {item.reason && (
              <div
                className={cn(
                  "mt-2 p-3 rounded-xl border text-xs leading-relaxed",
                  item.to === "REJECTED"
                    ? "bg-rose-50/70 border-rose-200 text-rose-900"
                    : item.to === "SANCTIONED"
                      ? "bg-amber-50/70 border-amber-200 text-amber-900"
                      : item.to === "DISBURSED"
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                        : "bg-slate-50 border-slate-200 text-slate-700",
                )}
              >
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  {item.to === "REJECTED" ? (
                    <>
                      <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-600 inline shrink-0" />
                      <span>Rejection Reason:</span>
                    </>
                  ) : item.to === "SANCTIONED" ? (
                    <>
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-amber-600 inline shrink-0" />
                      <span>Underwriting Review Notes:</span>
                    </>
                  ) : item.to === "DISBURSED" ? (
                    <>
                      <BanknotesIcon className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                      <span>Disbursement Reference & Notes:</span>
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="w-3.5 h-3.5 text-slate-500 inline shrink-0" />
                      <span>Decision Notes:</span>
                    </>
                  )}
                </div>
                <p className="whitespace-pre-wrap font-mono text-[11px]">
                  {item.reason}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
