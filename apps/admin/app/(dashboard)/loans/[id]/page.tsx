"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  DetailPageSkeleton,
  Button,
  Input,
  Label,
  Textarea,
  StatusBadge,
  LoanTimeline,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  formatRupee,
  formatDate,
  formatDateTime,
  ApiError,
  getApiBase,
  cn,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  ExternalLinkIcon,
  ClipboardCopyIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  UserIcon,
} from "@repo/ui";
import {
  opsApi,
  sanctionApi,
  disbursementApi,
  collectionApi,
} from "@/lib/api/ops";
import { authApi } from "@/lib/api/auth";
import type {
  OpsLoanDto,
  SanitizedUser,
  PaymentDto,
  BreRuleResult,
} from "@repo/types";

const REJECTION_PRESETS = [
  {
    label: "Salary Slip Discrepancy",
    text: "The uploaded salary slip does not match declared monthly earnings or is unreadable.",
  },
  {
    label: "BRE Policy Criteria Failed",
    text: "Applicant does not satisfy baseline underwriting policy requirements (age or minimum salary threshold).",
  },
  {
    label: "Employment Unverifiable",
    text: "Unable to verify active full-time salaried employment status with stated employer.",
  },
  {
    label: "High Debt-to-Income",
    text: "Existing debt commitments exceed acceptable affordability thresholds for the requested loan principal.",
  },
  {
    label: "Custom",
    text: "",
  },
];

export default function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const loanId = resolvedParams.id;
  const router = useRouter();

  const [loan, setLoan] = useState<OpsLoanDto | null>(null);
  const [user, setUser] = useState<SanitizedUser | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedPan, setCopiedPan] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Sanction action state
  const [sanctionNotes, setSanctionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [checkSlip, setCheckSlip] = useState(true);
  const [checkBre, setCheckBre] = useState(true);
  const [sanctionProcessing, setSanctionProcessing] = useState(false);
  const [sanctionError, setSanctionError] = useState<string | null>(null);

  // Disbursement action state
  const [payoutRef, setPayoutRef] = useState("");
  const [disburseNotes, setDisburseNotes] = useState("");
  const [disburseProcessing, setDisburseProcessing] = useState(false);
  const [disburseError, setDisburseError] = useState<string | null>(null);

  // Collection action state
  const [utrNumber, setUtrNumber] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [paidAt, setPaidAt] = useState<string>(
    () => new Date().toISOString().split("T")[0] ?? "",
  );
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchLoanDetails = async () => {
    try {
      const [loanRes, userRes] = await Promise.all([
        opsApi.getLoanById(loanId),
        authApi.me(),
      ]);
      setLoan(loanRes.loan);
      setUser(userRes.user);

      if (["DISBURSED", "CLOSED"].includes(loanRes.loan.status)) {
        try {
          const payRes = await collectionApi.getPayments(loanId);
          setPayments(payRes.payments);
        } catch {
          // ignore payment fetch failure
        }
      }
    } catch (err) {
      console.error("Failed to load loan details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanDetails();
  }, [loanId]);

  function copyText(text: string, type: "pan" | "ref") {
    navigator.clipboard.writeText(text);
    if (type === "pan") {
      setCopiedPan(true);
      setTimeout(() => setCopiedPan(false), 2000);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  }

  // Sanction handlers
  async function handleSanction() {
    if (!loan) return;
    setSanctionProcessing(true);
    setSanctionError(null);
    try {
      const res = await sanctionApi.sanction(
        loan.id,
        sanctionNotes || undefined,
      );
      setLoan(res.loan);
      setSanctionNotes("");
    } catch (err) {
      if (err instanceof ApiError) {
        setSanctionError(err.message);
      } else {
        setSanctionError("Failed to sanction loan.");
      }
    } finally {
      setSanctionProcessing(false);
    }
  }

  async function handleReject() {
    if (!loan) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setSanctionError(
        "Please provide a constructive rejection explanation (min 5 characters).",
      );
      return;
    }
    setSanctionProcessing(true);
    setSanctionError(null);
    try {
      const res = await sanctionApi.reject(loan.id, rejectionReason.trim());
      setLoan(res.loan);
      setRejectionReason("");
    } catch (err) {
      if (err instanceof ApiError) {
        setSanctionError(err.message);
      } else {
        setSanctionError("Failed to reject loan.");
      }
    } finally {
      setSanctionProcessing(false);
    }
  }

  // Disbursement handler
  async function handleDisburse() {
    if (!loan) return;
    setDisburseProcessing(true);
    setDisburseError(null);

    const fullNotes = payoutRef.trim()
      ? `[UTR/Ref: ${payoutRef.trim().toUpperCase()}] ${disburseNotes.trim()}`.trim()
      : disburseNotes.trim() || undefined;

    try {
      const res = await disbursementApi.disburse(loan.id, fullNotes);
      setLoan(res.loan);
    } catch (err) {
      if (err instanceof ApiError) {
        setDisburseError(err.message);
      } else {
        setDisburseError("Failed to disburse loan funds.");
      }
    } finally {
      setDisburseProcessing(false);
    }
  }

  // Payment handler
  async function handleRecordPayment() {
    if (!loan) return;
    setPaymentProcessing(true);
    setPaymentError(null);
    const amountPaise = Math.round(Number(amountRupees) * 100);
    try {
      const res = await collectionApi.recordPayment(loan.id, {
        utrNumber: utrNumber.toUpperCase(),
        amountPaise,
        paidAt: new Date(paidAt || Date.now()).toISOString(),
      });
      setLoan(res.loan);
      setPayments((prev) => [res.payment, ...prev]);
      setUtrNumber("");
      setAmountRupees("");
    } catch (err) {
      if (err instanceof ApiError) {
        setPaymentError(err.message);
      } else {
        setPaymentError("Failed to post repayment voucher.");
      }
    } finally {
      setPaymentProcessing(false);
    }
  }

  if (loading) return <DetailPageSkeleton />;
  if (!loan) {
    return (
      <div className="py-12 text-center">
        <p className="text-base font-bold text-slate-800">Loan Not Found</p>
        <Link
          href="/loans"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Loans Ledger
        </Link>
      </div>
    );
  }

  const profile = loan.borrower?.profile;
  const bre = profile?.bre;
  const pan = profile?.panNumber ?? "—";
  const salaryPaise =
    profile?.monthlySalaryPaise ?? loan.applicantSnapshot.monthlySalaryPaise;
  const employmentMode =
    profile?.employmentMode ?? loan.applicantSnapshot.employmentMode;
  const percentPaid =
    loan.totalRepaymentPaise > 0
      ? Math.min(
          100,
          Math.round((loan.amountPaidPaise / loan.totalRepaymentPaise) * 100),
        )
      : 0;

  const isUnderwriter = user?.role === "ADMIN" || user?.role === "SANCTION";
  const isDisbursementManager =
    user?.role === "ADMIN" || user?.role === "DISBURSEMENT";
  const isCollectionOfficer =
    user?.role === "ADMIN" || user?.role === "COLLECTION";

  const sanctionEvent = loan.statusHistory.find((h) => h.to === "SANCTIONED");

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Page Header */}
      <div>
        <Link
          href="/loans"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Back to Loans Ledger</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                {loan.loanReference}
              </h1>
              <button
                onClick={() => copyText(loan.loanReference, "ref")}
                className="text-slate-400 hover:text-indigo-600 cursor-pointer p-1 rounded-md transition-colors"
                title="Copy Loan Reference"
              >
                <ClipboardCopyIcon className="w-4 h-4" />
              </button>
              {copiedRef && (
                <span className="text-[11px] font-semibold text-emerald-600">
                  Copied
                </span>
              )}
              <StatusBadge status={loan.status} />
            </div>
            <p className="text-xs text-slate-500">
              Borrower:{" "}
              <strong className="text-slate-800">
                {loan.borrower?.fullName ?? "—"}
              </strong>{" "}
              ({loan.borrower?.email ?? ""}) • Applied on{" "}
              {formatDate(loan.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Principal Sanctioned
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatRupee(loan.principalPaise)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Tenure: {loan.tenureDays} days
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Repayable
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatRupee(loan.totalRepaymentPaise)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Interest: {formatRupee(loan.interestPaise)}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Amount Repaid
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            {formatRupee(loan.amountPaidPaise)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {percentPaid}% of total obligation
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Outstanding Book
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            {formatRupee(loan.outstandingPaise)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Current balance due
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: KYC, Document, BRE, and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Borrower Profile & KYC Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
              <UserIcon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Borrower Details
              </h2>
            </div>

            <dl className="divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-semibold text-slate-900">
                  {loan.borrower?.fullName ?? "—"}
                </dd>
              </div>

              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-semibold text-slate-900">
                  {loan.borrower?.email ?? "—"}
                </dd>
              </div>

              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-slate-500">PAN</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900">
                    {pan}
                  </span>
                  {pan !== "—" && (
                    <button
                      onClick={() => copyText(pan, "pan")}
                      className="text-slate-400 hover:text-indigo-600 cursor-pointer p-0.5 transition-colors"
                      title="Copy PAN"
                    >
                      <ClipboardCopyIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {copiedPan && (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      Copied
                    </span>
                  )}
                </dd>
              </div>

              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-slate-500">Age</dt>
                <dd className="font-semibold text-slate-900">
                  {loan.applicantSnapshot.ageAtApplication} years
                  {profile?.dateOfBirth &&
                    ` (born ${formatDate(profile.dateOfBirth)})`}
                </dd>
              </div>

              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-slate-500">Monthly Salary</dt>
                <dd className="font-semibold text-indigo-700">
                  {formatRupee(salaryPaise)} / mo
                </dd>
              </div>

              <div className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-slate-500">Employment</dt>
                <dd className="font-semibold text-slate-900 capitalize">
                  {employmentMode.toLowerCase().replace(/_/g, " ")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Salary Slip Document Card */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Salary Slip
                </h2>
              </div>
              <a
                href={`${getApiBase()}/documents/${loan.salarySlipDocumentId}/content`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <span>Open document</span>
                <ExternalLinkIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Underwriting BRE Policy Audit Scorecard */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  BRE Eligibility Check
                </h2>
              </div>
              {bre && (
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider",
                    bre.passed
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
                  )}
                >
                  {bre.passed ? "Passed" : "Failed"}
                </span>
              )}
            </div>

            {bre ? (
              <div className="space-y-2.5">
                {bre.results.map((r: BreRuleResult, idx: number) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 rounded-xl border flex items-start justify-between gap-3 text-xs",
                      r.passed
                        ? "bg-emerald-50/40 border-emerald-100"
                        : "bg-rose-50/40 border-rose-200",
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {r.rule}
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase",
                            r.passed
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800",
                          )}
                        >
                          {r.passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{r.message}</p>
                    </div>
                    <span className="font-bold shrink-0 text-slate-700">
                      {r.passed ? (
                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XMarkIcon className="w-4 h-4 text-rose-600" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center italic">
                No automated policy audit record attached to this application
                snapshot.
              </p>
            )}
          </div>

          {/* Interactive Operations Action Section */}
          {/* Action 1: Underwriter Decision (Sanction / Reject) */}
          {loan.status === "APPLIED" && isUnderwriter && (
            <div className="p-6 bg-white rounded-2xl border-2 border-indigo-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  Sanction Decision
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review the details above, then approve or decline this
                  application.
                </p>
              </div>

              {/* Checklist */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkSlip}
                    onChange={(e) => setCheckSlip(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-800">
                    I have verified the salary slip document against declared
                    earnings.
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkBre}
                    onChange={(e) => setCheckBre(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-medium text-slate-800">
                    I have reviewed the BRE scorecard and confirm underwriting
                    compliance.
                  </span>
                </label>
              </div>

              {/* Sanction form */}
              <div className="space-y-3">
                <Label htmlFor="sanction-notes">
                  Approval Notes (Optional)
                </Label>
                <Textarea
                  id="sanction-notes"
                  value={sanctionNotes}
                  onChange={(e) => setSanctionNotes(e.target.value)}
                  placeholder="State underwriting rationale or terms summary…"
                  rows={2}
                />
                <Button
                  size="md"
                  variant="primary"
                  loading={sanctionProcessing}
                  disabled={!checkSlip || !checkBre}
                  onClick={handleSanction}
                  className="w-full sm:w-auto"
                >
                  Approve & Sanction Loan
                </Button>
              </div>

              {/* Rejection form */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <Label>Decline Application (With Constructive Reason)</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {REJECTION_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(p.label);
                        if (p.text) setRejectionReason(p.text);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        selectedPreset === p.label
                          ? "bg-rose-100 text-rose-900 ring-1 ring-rose-300"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Minimum 5 characters. State clearly why the application was declined."
                  rows={3}
                />
                <Button
                  size="md"
                  variant="danger"
                  loading={sanctionProcessing}
                  disabled={rejectionReason.trim().length < 5}
                  onClick={handleReject}
                  className="w-full sm:w-auto"
                >
                  Decline Application
                </Button>
              </div>

              {sanctionError && (
                <p className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {sanctionError}
                </p>
              )}
            </div>
          )}

          {/* Action 2: Disbursement Payout */}
          {loan.status === "SANCTIONED" && isDisbursementManager && (
            <div className="p-6 bg-white rounded-2xl border-2 border-indigo-200 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  Disburse Funds
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm the payout reference to release funds to the borrower.
                </p>
              </div>

              {/* Sanction Underwriter Audit Callout */}
              {sanctionEvent && (
                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-200/50">
                    <span className="font-bold text-indigo-900 uppercase tracking-wider text-[10px]">
                      Underwriter Approval Audit
                    </span>
                    <span className="text-[11px] text-indigo-600 font-medium">
                      {formatDate(sanctionEvent.at)}
                    </span>
                  </div>
                  <div className="mt-2 text-slate-800">
                    Approved by:{" "}
                    <strong className="text-indigo-950">
                      {sanctionEvent.byUserName || "Sanction Officer"}
                    </strong>
                    {sanctionEvent.byUserEmail &&
                      ` (${sanctionEvent.byUserEmail})`}
                  </div>
                  {sanctionEvent.reason && (
                    <p className="mt-1.5 text-slate-600 italic bg-white/70 p-2 rounded-lg border border-indigo-100/60 font-mono text-[11px]">
                      “{sanctionEvent.reason}”
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <Label htmlFor="payout-ref">
                    Bank NEFT UTR / IMPS RRN Reference
                  </Label>
                  <Input
                    id="payout-ref"
                    value={payoutRef}
                    onChange={(e) => setPayoutRef(e.target.value.toUpperCase())}
                    placeholder="e.g. UTR123456789012"
                    maxLength={50}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Unique bank sequence for treasury ledger reconciliation.
                  </span>
                </div>

                <div>
                  <Label htmlFor="disburse-notes">
                    Disbursement Remarks (Optional)
                  </Label>
                  <Textarea
                    id="disburse-notes"
                    value={disburseNotes}
                    onChange={(e) => setDisburseNotes(e.target.value)}
                    placeholder="Add batch transaction ID or treasury remarks…"
                    rows={2}
                  />
                </div>

                <Button
                  size="md"
                  variant="primary"
                  loading={disburseProcessing}
                  onClick={handleDisburse}
                  className="w-full sm:w-auto"
                >
                  Confirm & Release Funds ({formatRupee(loan.principalPaise)})
                </Button>

                {disburseError && (
                  <p className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {disburseError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action 3: Collection Repayment Voucher & Ledger */}
          {["DISBURSED", "CLOSED"].includes(loan.status) && (
            <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Repayments
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Record incoming repayments and track the balance.
                  </p>
                </div>
                <span className="text-xs font-extrabold text-slate-900 font-mono">
                  {loan.status === "CLOSED"
                    ? "Loan closed"
                    : `Balance: ${formatRupee(loan.outstandingPaise)}`}
                </span>
              </div>

              {/* Payment form if still disbursed and authorized */}
              {loan.status === "DISBURSED" && isCollectionOfficer && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Record a Payment
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="pay-utr" required>
                        Bank UTR
                      </Label>
                      <Input
                        id="pay-utr"
                        value={utrNumber}
                        onChange={(e) =>
                          setUtrNumber(e.target.value.toUpperCase())
                        }
                        placeholder="e.g. HDFC123456"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pay-amount" required>
                        Amount (₹)
                      </Label>
                      <Input
                        id="pay-amount"
                        type="number"
                        value={amountRupees}
                        onChange={(e) => setAmountRupees(e.target.value)}
                        placeholder={`Max ${formatRupee(loan.outstandingPaise)}`}
                        min={0.01}
                        step={0.01}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pay-date" required>
                        Date
                      </Label>
                      <Input
                        id="pay-date"
                        type="date"
                        value={paidAt}
                        onChange={(e) => setPaidAt(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    loading={paymentProcessing}
                    disabled={!utrNumber || !amountRupees}
                    onClick={handleRecordPayment}
                  >
                    Record Payment
                  </Button>

                  {paymentError && (
                    <p className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                      {paymentError}
                    </p>
                  )}
                </div>
              )}

              {/* Payments History Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2">
                  Payment History ({payments.length})
                </h4>
                {payments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center italic bg-slate-50 rounded-xl">
                    No repayments recorded yet.
                  </p>
                ) : (
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>UTR Number</Th>
                        <Th>Amount Paid</Th>
                        <Th>Balance After</Th>
                        <Th>Paid Date</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {payments.map((p) => (
                        <Tr key={p.id}>
                          <Td className="font-mono text-xs font-bold text-slate-900">
                            {p.utrNumber}
                          </Td>
                          <Td className="font-extrabold text-emerald-600">
                            {formatRupee(p.amountPaise)}
                          </Td>
                          <Td className="font-medium text-slate-700">
                            {formatRupee(p.outstandingAfterPaise)}
                          </Td>
                          <Td className="text-xs text-slate-500">
                            {formatDate(p.paidAt)}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Complete Timeline & Metadata */}
        <div className="space-y-6">
          {/* Lifecycle Audit Trail */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Activity Timeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every status change, with who made it and when.
              </p>
            </div>

            <LoanTimeline history={loan.statusHistory} />
          </div>

          {/* System Identifiers — collapsed, low-priority reference info */}
          <details className="group px-5 py-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <summary className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none list-none">
              System references
            </summary>
            <div className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Loan ID:</span>
                <span className="truncate max-w-40 text-slate-800">
                  {loan.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Borrower ID:</span>
                <span className="truncate max-w-40 text-slate-800">
                  {loan.borrowerUserId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Salary Slip ID:</span>
                <span className="truncate max-w-40 text-slate-800">
                  {loan.salarySlipDocumentId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Applied:</span>
                <span className="text-slate-800">
                  {formatDateTime(loan.createdAt)}
                </span>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
