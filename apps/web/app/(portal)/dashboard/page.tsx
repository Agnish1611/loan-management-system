"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  PageSpinner,
  Button,
  formatRupee,
  formatDate,
} from "@repo/ui";
import { loansApi } from "@/lib/api/loans";
import type { LoanDto } from "@repo/types";

export default function DashboardPage() {
  const [loans, setLoans] = useState<LoanDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loansApi
      .listMine()
      .then((res) => setLoans(res.loans))
      .finally(() => setLoading(false));
  }, []);

  const activeLoan = loans.find((l) =>
    ["APPLIED", "SANCTIONED", "DISBURSED"].includes(l.status),
  );
  const pastLoans = loans.filter((l) =>
    ["CLOSED", "REJECTED"].includes(l.status),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Track your active loan applications and financial overview"
        action={
          !activeLoan && (
            <Link href="/apply">
              <Button size="md">Apply for a Loan →</Button>
            </Link>
          )
        }
      />

      {loading ? (
        <PageSpinner />
      ) : loans.length === 0 ? (
        <EmptyState
          title="No loans yet"
          description="You haven't applied for a loan. Complete your KYC profile and submit your first application in minutes."
          action={
            <Link href="/apply">
              <Button size="md">Apply now →</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Active loan highlight card */}
          {activeLoan && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Active Loan Application
              </h2>
              <Link
                href={`/loans/${activeLoan.id}`}
                className="block rounded-2xl border border-indigo-100 bg-linear-to-br from-white via-indigo-50/20 to-white p-6 sm:p-7 shadow-sm shadow-indigo-100/50 hover:shadow-md hover:border-indigo-300/80 transition-all duration-200 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-xs text-indigo-600 font-semibold tracking-wider">
                      {activeLoan.loanReference}
                    </span>
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                      {formatRupee(activeLoan.principalPaise)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={activeLoan.status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-sm">
                  <div>
                    <span className="block text-xs text-slate-400 font-medium">
                      Total Repayment
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatRupee(activeLoan.totalRepaymentPaise)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400 font-medium">
                      Outstanding
                    </span>
                    <span className="font-semibold text-indigo-600">
                      {formatRupee(activeLoan.outstandingPaise)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400 font-medium">
                      Tenure
                    </span>
                    <span className="font-semibold text-slate-800">
                      {activeLoan.tenureDays} days
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400 font-medium">
                      Applied Date
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(activeLoan.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                  <span>View Details & Timeline →</span>
                </div>
              </Link>
            </div>
          )}

          {/* Stats overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Applications
              </span>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {loans.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Closed Loans
              </span>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {loans.filter((l) => l.status === "CLOSED").length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Repaid
              </span>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {formatRupee(
                  loans
                    .filter((l) => l.status === "CLOSED")
                    .reduce((sum, l) => sum + l.amountPaidPaise, 0),
                )}
              </p>
            </div>
          </div>

          {/* Past loans list */}
          {pastLoans.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Past Applications
              </h2>
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden divide-y divide-slate-100">
                {pastLoans.map((loan) => (
                  <Link
                    key={loan.id}
                    href={`/loans/${loan.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-slate-50/80 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs font-semibold text-slate-600">
                        {loan.loanReference}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatRupee(loan.principalPaise)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={loan.status} />
                      <span className="text-xs text-slate-400">
                        {formatDate(loan.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
