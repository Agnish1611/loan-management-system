"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  DashboardSkeleton,
  Button,
  StatusBadge,
  formatRupee,
  formatDate,
  getApiBase,
  cn,
  ArrowRightIcon,
} from "@repo/ui";
import { authApi } from "@/lib/api/auth";
import {
  sanctionApi,
  disbursementApi,
  collectionApi,
  salesApi,
  opsApi,
  type RecentActivityItem,
  type PortfolioStats,
} from "@/lib/api/ops";
import type { SanitizedUser } from "@repo/types";

export default function DashboardOverviewPage() {
  const [user, setUser] = useState<SanitizedUser | null>(null);
  const [sanctionCount, setSanctionCount] = useState<number | null>(null);
  const [disbursementCount, setDisbursementCount] = useState<number | null>(
    null,
  );
  const [collectionCount, setCollectionCount] = useState<number | null>(null);
  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        const u = res.user;
        setUser(u);

        const fetches: Promise<void>[] = [];

        // Portfolio Stats
        fetches.push(
          opsApi
            .getStats()
            .then((res) => setStats(res))
            .catch(() => {}),
        );

        // Recent Audit Activity Feed
        fetches.push(
          opsApi
            .getActivity(8)
            .then((res) => setActivities(res.activity))
            .catch(() => {}),
        );

        if (u.role === "ADMIN" || u.role === "SALES") {
          fetches.push(
            salesApi
              .getLeads()
              .then((r) => setLeadsCount(r.leads.length))
              .catch(() => {}),
          );
        }
        if (u.role === "ADMIN" || u.role === "SANCTION") {
          fetches.push(
            sanctionApi
              .getLoans()
              .then((r) => setSanctionCount(r.loans.length))
              .catch(() => {}),
          );
        }
        if (u.role === "ADMIN" || u.role === "DISBURSEMENT") {
          fetches.push(
            disbursementApi
              .getLoans()
              .then((r) => setDisbursementCount(r.loans.length))
              .catch(() => {}),
          );
        }
        if (u.role === "ADMIN" || u.role === "COLLECTION") {
          fetches.push(
            collectionApi
              .getLoans()
              .then((r) => setCollectionCount(r.loans.length))
              .catch(() => {}),
          );
        }

        return Promise.all(fetches).finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton statCount={3} />;

  const moduleCards = [
    leadsCount !== null && {
      href: "/sales",
      title: "Sales Leads",
      count: leadsCount,
      description: "Borrowers without an active loan application",
      badge: "Leads",
    },
    sanctionCount !== null && {
      href: "/sanction",
      title: "Sanction Queue",
      count: sanctionCount,
      description: "Pending loan applications awaiting underwriting review",
      badge: "Pending Review",
    },
    disbursementCount !== null && {
      href: "/disbursement",
      title: "Disbursement Queue",
      count: disbursementCount,
      description: "Sanctioned loans ready for immediate payout",
      badge: "Ready",
    },
    collectionCount !== null && {
      href: "/collection",
      title: "Collection Queue",
      count: collectionCount,
      description: "Active disbursed loans with outstanding balance",
      badge: "Active",
    },
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    count: number;
    description: string;
    badge: string;
  }>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Credit Operations & Risk Management"
        title={`Welcome, ${user?.fullName ?? ""}`.trimEnd()}
        subtitle={`Signed in as ${user?.role}. Real-time portfolio liquidity, underwriting throughput, and audit trails.`}
      />

      {/* Portfolio Financial Metrics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Disbursed Volume
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {formatRupee(stats.totalDisbursedPaise)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Cumulative credit capital deployed
            </span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Collections Recovered
            </span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
              {formatRupee(stats.totalCollectedPaise)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Principal and interest returned to date
            </span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Outstanding Portfolio Book
            </span>
            <p className="text-2xl sm:text-3xl font-black text-indigo-700 mt-2">
              {formatRupee(stats.outstandingPaise)}
            </p>
            <span className="text-xs text-slate-500 mt-1 block">
              Active credit risk exposure
            </span>
          </div>
        </div>
      )}

      {/* Operational Queues */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Operational Work queues
          </h2>
          <Link
            href="/loans"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View All Loans Ledger
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {moduleCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {card.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open
                    <ArrowRightIcon className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
                  {card.count}
                </p>
                <p className="text-sm font-bold text-slate-900 mt-2">
                  {card.title}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {card.description}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Process Queue</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Real-time Operational Decision Feed */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Live Operational Decision Feed
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological audit log of underwriting approvals, fund
              disbursements, and loan closures
            </p>
          </div>
          <Link
            href="/loans"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Audit full ledger
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No operational state transitions recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((act, i) => (
              <div
                key={`${act.loanId}-${act.at}-${i}`}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/loans/${act.loanId}`}
                      className="font-mono text-xs font-bold text-indigo-600 hover:underline"
                    >
                      {act.loanReference}
                    </Link>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-800">
                      {act.borrowerName}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {act.from ? (
                        <span className="inline-flex items-center gap-1">
                          <span>{act.from}</span>
                          <ArrowRightIcon className="w-2.5 h-2.5 text-slate-400" />
                          <span>{act.to}</span>
                        </span>
                      ) : (
                        act.to
                      )}
                    </span>
                  </div>

                  {/* Decision note / Reason callout */}
                  {act.reason && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 inline-block font-mono">
                      “{act.reason}”
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>
                      Action by:{" "}
                      <strong className="text-slate-700">
                        {act.byUserName || "System Operator"}
                      </strong>
                      {act.byUserRole && ` (${act.byUserRole})`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-slate-400">
                    {formatDate(act.at)}
                  </span>
                  <Link
                    href={`/loans/${act.loanId}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    View Loan
                    <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
