"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { StatusBadge } from "./Badge";
import { LoanTimeline } from "./LoanTimeline";
import { formatRupee, formatDate } from "../lib/format";
import { cn } from "../lib/utils";
import {
  UserIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  ExternalLinkIcon,
  ClipboardCopyIcon,
} from "./Icons";
import type { OpsLoanDto, BreRuleResult } from "@repo/types";

export interface BorrowerProfileModalProps {
  open: boolean;
  onClose: () => void;
  loan: OpsLoanDto | null;
  apiBaseUrl?: string;
  onActionClick?: (
    action: "sanction" | "reject" | "disburse" | "collect",
  ) => void;
  userRole?: string;
}

export function BorrowerProfileModal({
  open,
  onClose,
  loan,
  apiBaseUrl = "http://localhost:8000/api/v1",
  onActionClick,
  userRole,
}: BorrowerProfileModalProps) {
  const [copiedPan, setCopiedPan] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "bre" | "history">(
    "profile",
  );

  if (!loan) return null;

  const profile = loan.borrower?.profile;
  const bre = profile?.bre;

  function copyPan(pan: string) {
    navigator.clipboard.writeText(pan);
    setCopiedPan(true);
    setTimeout(() => setCopiedPan(false), 2000);
  }

  // Calculate age from DOB if present
  let ageString = `${loan.applicantSnapshot.ageAtApplication} yrs`;
  if (profile?.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    const diffMs = Date.now() - dob.getTime();
    const calculatedAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    if (calculatedAge > 0) {
      ageString = `${calculatedAge} yrs (${formatDate(profile.dateOfBirth)})`;
    }
  }

  const salaryPaise =
    profile?.monthlySalaryPaise ?? loan.applicantSnapshot.monthlySalaryPaise;
  const employmentMode =
    profile?.employmentMode ?? loan.applicantSnapshot.employmentMode;
  const panNumber = profile?.panNumber ?? "—";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Application Audit — ${loan.loanReference}`}
      description="Detailed borrower KYC profile, BRE underwriting scorecard, and complete state transition log."
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400 font-mono">
            ID: {loan.id}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>

            {loan.status === "APPLIED" &&
              (userRole === "ADMIN" || userRole === "SANCTION") &&
              onActionClick && (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      onClose();
                      onActionClick("reject");
                    }}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onClose();
                      onActionClick("sanction");
                    }}
                  >
                    Sanction Loan
                  </Button>
                </>
              )}

            {loan.status === "SANCTIONED" &&
              (userRole === "ADMIN" || userRole === "DISBURSEMENT") &&
              onActionClick && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onActionClick("disburse");
                  }}
                >
                  Proceed to Disburse
                </Button>
              )}

            {loan.status === "DISBURSED" &&
              (userRole === "ADMIN" || userRole === "COLLECTION") &&
              onActionClick && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onActionClick("collect");
                  }}
                >
                  Record Repayment
                </Button>
              )}
          </div>
        </div>
      }
    >
      {/* Borrower Header Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">
              {loan.borrower?.fullName ?? "Borrower"}
            </h4>
            <StatusBadge status={loan.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {loan.borrower?.email ?? "—"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">
              Principal Loan
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {formatRupee(loan.principalPaise)}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">
              Tenure
            </span>
            <span className="text-sm font-bold text-slate-800">
              {loan.tenureDays} days
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5 gap-4">
        <button
          className={cn(
            "pb-2.5 text-xs font-bold transition-colors relative cursor-pointer inline-flex items-center gap-1.5",
            activeTab === "profile"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-500 hover:text-slate-800",
          )}
          onClick={() => setActiveTab("profile")}
        >
          <UserIcon className="w-3.5 h-3.5" />
          Profile & Financials
        </button>
        <button
          className={cn(
            "pb-2.5 text-xs font-bold transition-colors relative cursor-pointer flex items-center gap-1.5",
            activeTab === "bre"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-500 hover:text-slate-800",
          )}
          onClick={() => setActiveTab("bre")}
        >
          <ShieldCheckIcon className="w-3.5 h-3.5" />
          <span>BRE Underwriting</span>
          {bre && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase",
                bre.passed
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800",
              )}
            >
              {bre.passed ? "Passed" : "Failed"}
            </span>
          )}
        </button>
        <button
          className={cn(
            "pb-2.5 text-xs font-bold transition-colors relative cursor-pointer flex items-center gap-1.5",
            activeTab === "history"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-slate-500 hover:text-slate-800",
          )}
          onClick={() => setActiveTab("history")}
        >
          <ClockIcon className="w-3.5 h-3.5" />
          <span>Audit Trail & History</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
            {loan.statusHistory.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Profile & Financials */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* PAN Card */}
            <div className="rounded-lg border border-slate-200 p-3.5 bg-white">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Permanent Account Number (PAN)
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
                  {panNumber}
                </span>
                {panNumber !== "—" && (
                  <button
                    onClick={() => copyPan(panNumber)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    {copiedPan ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckIcon className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <ClipboardCopyIcon className="w-3 h-3" /> Copy
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Age & DOB */}
            <div className="rounded-lg border border-slate-200 p-3.5 bg-white">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Date of Birth & Age
              </span>
              <span className="text-sm font-bold text-slate-900 block mt-1">
                {ageString}
              </span>
            </div>

            {/* Declared Monthly Salary */}
            <div className="rounded-lg border border-slate-200 p-3.5 bg-white">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Declared Monthly Income
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-base font-extrabold text-slate-900">
                  {formatRupee(salaryPaise)}
                </span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
            </div>

            {/* Employment Mode */}
            <div className="rounded-lg border border-slate-200 p-3.5 bg-white">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Employment Mode
              </span>
              <span className="text-sm font-bold text-slate-800 block mt-1 capitalize">
                {employmentMode.toLowerCase().replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Salary Slip Document Card */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Uploaded Salary Slip Document
                </p>
                <p className="text-[11px] text-slate-500">
                  Verified salary documentation for underwriting proof.
                </p>
              </div>
            </div>
            {loan.salarySlipDocumentId ? (
              <a
                href={`${apiBaseUrl}/documents/${loan.salarySlipDocumentId}/content`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-2xs"
              >
                <span>View Salary Slip</span>
                <ExternalLinkIcon className="w-3.5 h-3.5 text-indigo-500" />
              </a>
            ) : (
              <span className="text-xs text-slate-400 italic">
                No document attached
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: BRE Rules Evaluation */}
      {activeTab === "bre" && (
        <div className="space-y-4">
          {bre ? (
            <>
              <div
                className={cn(
                  "p-4 rounded-xl border flex items-center justify-between",
                  bre.passed
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-rose-50/70 border-rose-200 text-rose-900",
                )}
              >
                <div>
                  <h5 className="text-sm font-bold flex items-center gap-2">
                    {bre.passed ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700">
                        <CheckIcon className="w-4 h-4" /> All Rule Checks Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-700">
                        <XMarkIcon className="w-4 h-4" /> Underwriting Policy
                        Failed
                      </span>
                    )}
                  </h5>
                  <p className="text-xs opacity-90 mt-0.5">
                    Evaluated automatically on{" "}
                    {formatDate(bre.evaluatedAt.toString())} at age{" "}
                    {bre.ageAtEvaluation} years.
                  </p>
                </div>
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider",
                    bre.passed
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white",
                  )}
                >
                  {bre.passed ? "ELIGIBLE" : "INELIGIBLE"}
                </span>
              </div>

              {/* Rule Results Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 font-bold">Policy Rule</th>
                      <th className="px-4 py-2.5 font-bold">Status</th>
                      <th className="px-4 py-2.5 font-bold">
                        Evaluation Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bre.results.map((r: BreRuleResult, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                          {r.rule}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-extrabold",
                              r.passed
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
                            )}
                          >
                            {r.passed ? "PASS" : "FAIL"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {r.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic border border-slate-200 rounded-xl bg-slate-50">
              No automated BRE profile evaluation records found for this
              borrower.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: History & Decision Audit Trail */}
      {activeTab === "history" && (
        <div className="py-2">
          <LoanTimeline history={loan.statusHistory} />
        </div>
      )}
    </Modal>
  );
}
