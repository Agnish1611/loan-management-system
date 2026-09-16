"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { StatusBadge, Badge } from "./Badge";
import { formatRupee, formatDate, formatLeadStage } from "../lib/format";
import { cn } from "../lib/utils";
import {
  CheckIcon,
  XMarkIcon,
  ClipboardCopyIcon,
  UserIcon,
  ShieldCheckIcon,
} from "./Icons";
import type { SalesLeadDto, BreRuleResult } from "@repo/types";

export interface LeadProfileModalProps {
  open: boolean;
  onClose: () => void;
  lead: SalesLeadDto | null;
}

export function LeadProfileModal({
  open,
  onClose,
  lead,
}: LeadProfileModalProps) {
  const [copiedPan, setCopiedPan] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "bre">("profile");

  if (!lead) return null;

  const profile = lead.profile;
  const bre = lead.bre;

  function copyPan(pan: string) {
    navigator.clipboard.writeText(pan);
    setCopiedPan(true);
    setTimeout(() => setCopiedPan(false), 2000);
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  // Calculate age from DOB if present
  let ageString = "—";
  if (profile?.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    const diffMs = Date.now() - dob.getTime();
    const calculatedAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    if (calculatedAge > 0) {
      ageString = `${calculatedAge} yrs (${formatDate(profile.dateOfBirth)})`;
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Lead Profile — ${lead.fullName}`}
      description="Borrower registration overview, verified employment profile, and pre-qualification scorecard."
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400 font-mono">
            User ID: {lead.userId}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <a
              href={`mailto:${lead.email}?subject=CreditSea%20Instant%20Loan%20Assistance%20for%20${encodeURIComponent(lead.fullName)}`}
              className="inline-flex items-center justify-center font-semibold rounded-xl text-xs px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Contact Lead →
            </a>
          </div>
        </div>
      }
    >
      {/* Lead Header & Stage Intent Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-slate-900">
              {lead.fullName}
            </h4>
            <StatusBadge
              status={lead.stage}
              label={formatLeadStage(lead.stage)}
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-600">{lead.email}</span>
            <button
              onClick={() => copyEmail(lead.email)}
              className="text-[10px] text-indigo-600 hover:underline cursor-pointer font-medium"
            >
              {copiedEmail ? "Copied!" : "Copy"}
            </button>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-400">
              Registered on {formatDate(lead.registeredAt)}
            </span>
          </div>
        </div>

        {/* Quick BRE verdict pill if available */}
        {bre && (
          <div>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider",
                bre.passed
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-rose-100 text-rose-800 border border-rose-200",
              )}
            >
              {bre.passed ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5" /> BRE PASS
                </>
              ) : (
                <>
                  <XMarkIcon className="w-3.5 h-3.5" /> BRE REJECTED
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Stage-specific Strategy Alert */}
      {lead.stage === "REGISTERED_ONLY" && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200/70 text-xs text-amber-900">
          <strong className="font-bold block mb-0.5">
            Strategy: Onboarding Nudge Required
          </strong>
          This borrower has created an account but has not yet submitted their
          KYC profile, PAN, or income details. Reach out to offer assistance in
          completing onboarding.
        </div>
      )}

      {lead.stage === "PROFILE_DONE" && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs text-emerald-900">
          <strong className="font-bold block mb-0.5">
            Strategy: High-Intent Pre-Approved Lead
          </strong>
          This borrower has satisfied all baseline credit policy rules. Pitch
          tailored loan amounts and emphasize instant approval and immediate
          fund disbursal!
        </div>
      )}

      {lead.stage === "BRE_REJECTED" && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/70 text-xs text-rose-900">
          <strong className="font-bold block mb-0.5">
            Strategy: Consultative Outreach
          </strong>
          The applicant’s profile did not meet automated underwriting policy
          thresholds (see scorecard below). Consult on co-borrower criteria or
          re-application once eligible.
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5">
        <button
          className={cn(
            "px-4 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 -mb-px",
            activeTab === "profile"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700",
          )}
          onClick={() => setActiveTab("profile")}
        >
          Profile & KYC Details
        </button>
        <button
          className={cn(
            "px-4 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-1.5",
            activeTab === "bre"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-700",
          )}
          onClick={() => setActiveTab("bre")}
        >
          <span>Underwriting Scorecard</span>
          {bre && (
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                bre.passed ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
          )}
        </button>
      </div>

      {/* Tab 1: Profile & KYC Details */}
      {activeTab === "profile" && (
        <div>
          {profile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  PAN Number
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {profile.panNumber}
                  </span>
                  <button
                    onClick={() => copyPan(profile.panNumber)}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer inline-flex items-center gap-1"
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
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Date of Birth & Age
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {ageString}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Monthly Declared Salary
                </span>
                <p className="text-sm font-extrabold text-indigo-700 mt-1">
                  {formatRupee(profile.monthlySalaryPaise)}
                </p>
                <span className="text-[10px] text-slate-400">
                  (₹{profile.monthlySalaryRupees.toLocaleString("en-IN")})
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Employment Mode
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">
                  {profile.employmentMode.toLowerCase().replace(/_/g, " ")}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm font-bold text-slate-700">
                Profile Not Submitted
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                This lead registered on {formatDate(lead.registeredAt)} but has
                not completed PAN, date of birth, or income verification.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: BRE Underwriting Scorecard */}
      {activeTab === "bre" && (
        <div className="space-y-4">
          {bre ? (
            <>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Scorecard Evaluation
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    Evaluated for Age:{" "}
                    <span className="text-indigo-600">
                      {bre.ageAtEvaluation} yrs
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Verdict
                  </span>
                  <span
                    className={cn(
                      "text-xs font-black",
                      bre.passed ? "text-emerald-700" : "text-rose-700",
                    )}
                  >
                    {bre.passed ? "ALL CRITERIA SATISFIED" : "POLICY VIOLATION"}
                  </span>
                </div>
              </div>

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
                    <span className="text-base font-bold shrink-0">
                      {r.passed ? (
                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XMarkIcon className="w-4 h-4 text-rose-600" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm font-bold text-slate-700">
                No Underwriting Evaluation
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                BRE scorecard runs automatically when the borrower completes
                their profile submission.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
