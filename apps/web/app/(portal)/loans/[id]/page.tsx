"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  StatusBadge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  PageSpinner,
  formatRupee,
  formatDate,
  formatDateTime,
  DocumentTextIcon,
  ExternalLinkIcon,
} from "@repo/ui";
import { loansApi } from "@/lib/api/loans";
import type { LoanDto, PaymentDto } from "@repo/types";
import { documentsApi } from "@/lib/api/documents";

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loan, setLoan] = useState<LoanDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loansApi.getById(id), loansApi.getPayments(id)])
      .then(([loanRes, pmtRes]) => {
        setLoan(loanRes.loan);
        setPayments(pmtRes.payments);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSpinner />;
  if (!loan) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loan application not found.
      </div>
    );
  }

  const paidPercent = Math.min(
    100,
    Math.round((loan.amountPaidPaise / loan.totalRepaymentPaise) * 100),
  );

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link
            href="/loans"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            ← Back to My Loans
          </Link>
        }
        title={loan.loanReference}
        action={<StatusBadge status={loan.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ── Left Column: Loan Summary */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Principal Sanctioned
            </span>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {formatRupee(loan.principalPaise)}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-500">Repayment Progress</span>
              <span className="text-indigo-600 font-bold">{paidPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>{formatRupee(loan.amountPaidPaise)} paid</span>
              <span>{formatRupee(loan.outstandingPaise)} remaining</span>
            </div>
          </div>

          {/* Loan terms */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="block text-slate-400 font-medium">Interest</span>
              <span className="font-semibold text-slate-800">
                {formatRupee(loan.interestPaise)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">
                Total Repayment
              </span>
              <span className="font-semibold text-slate-800">
                {formatRupee(loan.totalRepaymentPaise)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">Tenure</span>
              <span className="font-semibold text-slate-800">
                {loan.tenureDays} days
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">
                Interest Rate
              </span>
              <span className="font-semibold text-slate-800">
                {loan.annualInterestRateBps / 100}% p.a.
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">
                Applied On
              </span>
              <span className="font-semibold text-slate-800">
                {formatDate(loan.createdAt)}
              </span>
            </div>
            <div>
              <span className="block text-slate-400 font-medium">
                Employment
              </span>
              <span className="font-semibold text-slate-800">
                {loan.applicantSnapshot.employmentMode.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Salary slip link */}
          <div className="pt-4 border-t border-slate-100">
            <a
              href={documentsApi.getContentUrl(loan.salarySlipDocumentId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
              <span>View Attached Salary Slip</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-indigo-400" />
            </a>
          </div>
        </div>

        {/* ── Right Column: Timeline & Payments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Status timeline */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-6">
              Application Timeline
            </h2>

            <ol className="relative border-l border-slate-200 ml-3 space-y-6">
              {loan.statusHistory.map((item, i) => (
                <li key={i} className="ml-6">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-600 ring-4 ring-indigo-50" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.from ? `${item.from} → ${item.to}` : item.to}
                    </p>
                    <time className="text-xs text-slate-400 font-medium">
                      {formatDateTime(item.at)}
                    </time>
                  </div>
                  {item.reason && (
                    <p className="mt-1 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      Note: {item.reason}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900">
                Payment History
              </h2>
              <Table>
                <Thead>
                  <Tr>
                    <Th>UTR Number</Th>
                    <Th>Amount</Th>
                    <Th>Outstanding After</Th>
                    <Th>Paid Date</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {payments.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {p.utrNumber}
                        </span>
                      </Td>
                      <Td className="font-semibold text-emerald-600">
                        {formatRupee(p.amountPaise)}
                      </Td>
                      <Td>{formatRupee(p.outstandingAfterPaise)}</Td>
                      <Td className="text-xs text-slate-500">
                        {formatDate(p.paidAt)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
