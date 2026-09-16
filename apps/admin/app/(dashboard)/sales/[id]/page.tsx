"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  PageSpinner,
  Button,
  StatusBadge,
  Badge,
  formatRupee,
  formatDate,
  formatLeadStage,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  ClipboardCopyIcon,
  MailIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  cn,
} from "@repo/ui";
import { salesApi } from "@/lib/api/ops";
import type { SalesLeadDto, BreRuleResult } from "@repo/types";

export default function SalesLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const leadId = resolvedParams.id;

  const [lead, setLead] = useState<SalesLeadDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedPan, setCopiedPan] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    salesApi
      .getLeadById(leadId)
      .then((res) => setLead(res.lead))
      .catch((err) => console.error("Failed to load lead details:", err))
      .finally(() => setLoading(false));
  }, [leadId]);

  function copyText(text: string, type: "pan" | "email") {
    navigator.clipboard.writeText(text);
    if (type === "pan") {
      setCopiedPan(true);
      setTimeout(() => setCopiedPan(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  }

  if (loading) return <PageSpinner />;
  if (!lead) {
    return (
      <div className="py-12 text-center">
        <p className="text-base font-bold text-slate-800">Lead Not Found</p>
        <Link
          href="/sales"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Sales Leads
        </Link>
      </div>
    );
  }

  const profile = lead.profile;
  const bre = lead.bre;

  let ageString = "—";
  if (profile?.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    const diffMs = Date.now() - dob.getTime();
    const calculatedAge = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    if (calculatedAge > 0) {
      ageString = `${calculatedAge} years (${formatDate(profile.dateOfBirth)})`;
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Page Header */}
      <div>
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Back to Sales Leads</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {lead.fullName}
              </h1>
              <StatusBadge
                status={lead.stage}
                label={formatLeadStage(lead.stage)}
              />
            </div>
            <p className="text-xs text-slate-500">
              Registered on {formatDate(lead.registeredAt)} • ID:{" "}
              <span className="font-mono text-slate-700">{lead.userId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyText(lead.email, "email")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ClipboardCopyIcon className="w-4 h-4 text-slate-400" />
              <span>{copiedEmail ? "Email Copied" : "Copy Email"}</span>
            </button>
            <a
              href={`mailto:${lead.email}?subject=CreditSea%20Instant%20Loan%20Assistance%20for%20${encodeURIComponent(lead.fullName)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <MailIcon className="w-4 h-4" />
              <span>Contact Lead</span>
            </a>
          </div>
        </div>
      </div>

      {/* Stage Strategy Guidance Card */}
      {lead.stage === "REGISTERED_ONLY" && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-950">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-sm block text-amber-900">
              Strategy: Onboarding Nudge Required
            </strong>
            <p className="mt-0.5 text-amber-800">
              This borrower created an account but has not yet submitted their
              KYC profile, PAN, or income details. Reach out via email or phone
              to assist them through onboarding.
            </p>
          </div>
        </div>
      )}

      {lead.stage === "PROFILE_DONE" && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3 text-xs text-emerald-950">
          <ShieldCheckIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-sm block text-emerald-900">
              Strategy: High-Intent Pre-Approved Opportunity
            </strong>
            <p className="mt-0.5 text-emerald-800">
              This borrower has completed their KYC and successfully satisfied
              all credit underwriting rules. Pitch customized loan amounts and
              highlight rapid disbursement.
            </p>
          </div>
        </div>
      )}

      {lead.stage === "BRE_REJECTED" && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-xs text-rose-950">
          <XMarkIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-sm block text-rose-900">
              Strategy: Consultative Outreach
            </strong>
            <p className="mt-0.5 text-rose-800">
              The applicant’s profile did not meet automated underwriting policy
              thresholds. Review the scorecard below to consult on co-borrower
              criteria or future reapplication.
            </p>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Borrower Profile & KYC Details */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Profile & KYC Verification
            </h2>
          </div>

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
                    onClick={() => copyText(profile.panNumber, "pan")}
                    className="text-slate-400 hover:text-indigo-600 cursor-pointer p-0.5 transition-colors"
                    title="Copy PAN"
                  >
                    <ClipboardCopyIcon className="w-3.5 h-3.5" />
                  </button>
                  {copiedPan && (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      Copied
                    </span>
                  )}
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
                  Declared Monthly Earnings
                </span>
                <p className="text-sm font-extrabold text-indigo-700 mt-1">
                  {formatRupee(profile.monthlySalaryPaise)}
                </p>
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
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <DocumentTextIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                Profile Incomplete
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Borrower has not yet submitted their PAN, age, or monthly income
                details.
              </p>
            </div>
          )}
        </div>

        {/* BRE Policy Scorecard */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Underwriting Eligibility Audit (BRE)
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
                {bre.passed ? "ALL RULES PASSED" : "POLICY VIOLATION"}
              </span>
            )}
          </div>

          {bre ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-500">Evaluated Applicant Age:</span>
                <span className="font-bold text-slate-900">
                  {bre.ageAtEvaluation} years
                </span>
              </div>

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
                      <span className="font-bold text-slate-900">{r.rule}</span>
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
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ShieldCheckIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                No Scorecard Available
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Underwriting rules execute automatically when the borrower
                completes their profile.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
