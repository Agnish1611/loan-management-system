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
  DetailPageSkeleton,
  formatRupee,
  formatDate,
  formatDateTime,
  DocumentTextIcon,
  ExternalLinkIcon,
  CheckIcon,
  cn,
  openAuthenticatedFile,
} from "@repo/ui";
import { loansApi } from "@/lib/api/loans";
import type { LoanDto, PaymentDto, LoanStatus } from "@repo/types";

const STAGES: { status: LoanStatus; label: string }[] = [
  { status: "APPLIED", label: "Applied" },
  { status: "SANCTIONED", label: "Sanctioned" },
  { status: "DISBURSED", label: "Disbursed" },
  { status: "CLOSED", label: "Closed" },
];

function LoanStageStepper({ status }: { status: LoanStatus }) {
  if (status === "REJECTED") {
    return (
      <ol className="flex items-center gap-3" aria-label="Loan progress">
        <li className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
            <CheckIcon className="w-3.5 h-3.5" />
          </span>
          Applied
        </li>
        <li className="w-8 h-0.5 bg-rose-200" aria-hidden="true" />
        <li className="flex items-center gap-2 text-xs font-bold text-rose-700">
          <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-[11px]">
            !
          </span>
          Rejected
        </li>
      </ol>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.status === status);

  return (
    <ol className="flex items-center" aria-label="Loan progress">
      {STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={stage.status} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold",
                  isComplete && "bg-indigo-600 text-white",
                  isCurrent &&
                    "bg-indigo-600 text-white ring-4 ring-indigo-100",
                  !isComplete && !isCurrent && "bg-slate-100 text-slate-400",
                )}
              >
                {isComplete ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold whitespace-nowrap",
                  isComplete || isCurrent ? "text-slate-900" : "text-slate-400",
                )}
              >
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <span
                className={cn(
                  "w-8 sm:w-12 h-0.5 mx-2",
                  isComplete ? "bg-indigo-600" : "bg-slate-200",
                )}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loan, setLoan] = useState<LoanDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentError, setDocumentError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loansApi.getById(id), loansApi.getPayments(id)])
      .then(([loanRes, pmtRes]) => {
        setLoan(loanRes.loan);
        setPayments(pmtRes.payments);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleViewSalarySlip(documentId: string) {
    setDocumentError(null);
    try {
      await openAuthenticatedFile(`/documents/${documentId}/content`);
    } catch {
      setDocumentError("Couldn't open the salary slip. Please try again.");
    }
  }

  if (loading) return <DetailPageSkeleton />;
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

      <div className="mb-8 overflow-x-auto">
        <LoanStageStepper status={loan.status} />
      </div>

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
            <button
              type="button"
              onClick={() => handleViewSalarySlip(loan.salarySlipDocumentId)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
              <span>View Attached Salary Slip</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-indigo-400" />
            </button>
            {documentError && (
              <p className="mt-1.5 text-xs text-rose-600">{documentError}</p>
            )}
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
