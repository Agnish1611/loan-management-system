"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  EmptyState,
  PageSpinner,
  Modal,
  Button,
  Label,
  Textarea,
  formatRupee,
  formatDate,
  ApiError,
  getApiBase,
  cn,
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  ExternalLinkIcon,
} from "@repo/ui";
import { sanctionApi } from "@/lib/api/ops";
import type { OpsLoanDto } from "@repo/types";

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

export default function SanctionPage() {
  const [loans, setLoans] = useState<OpsLoanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OpsLoanDto | null>(null);
  const [action, setAction] = useState<"sanction" | "reject" | null>(null);

  // Form states
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [checkSlip, setCheckSlip] = useState(true);
  const [checkBre, setCheckBre] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sanctionApi
      .getLoans()
      .then((res) => setLoans(res.loans))
      .finally(() => setLoading(false));
  }, []);

  function openActionModal(loan: OpsLoanDto, act: "sanction" | "reject") {
    setSelected(loan);
    setAction(act);
    setNotes("");
    setReason("");
    setSelectedPreset(null);
    setCheckSlip(true);
    setCheckBre(true);
    setError(null);
  }

  function closeActionModal() {
    setSelected(null);
    setAction(null);
    setError(null);
  }

  function applyPreset(preset: (typeof REJECTION_PRESETS)[number]) {
    setSelectedPreset(preset.label);
    if (preset.text) {
      setReason(preset.text);
    }
  }

  async function handleAction() {
    if (!selected || !action) return;
    setProcessing(true);
    setError(null);
    try {
      if (action === "sanction") {
        await sanctionApi.sanction(selected.id, notes || undefined);
      } else {
        await sanctionApi.reject(selected.id, reason);
      }
      setLoans((prev) => prev.filter((l) => l.id !== selected.id));
      closeActionModal();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Action failed. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Sanction Module"
        title="Sanction Queue"
        subtitle="Review applicant KYC, inspect automated BRE audits, and record approval/rejection decisions"
      />

      {loading ? (
        <PageSpinner />
      ) : loans.length === 0 ? (
        <EmptyState
          title="Queue clear"
          description="There are currently no loan applications awaiting sanction review."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Reference</Th>
              <Th>Borrower</Th>
              <Th>PAN</Th>
              <Th>Principal</Th>
              <Th>Salary / Month</Th>
              <Th>BRE Status</Th>
              <Th>Applied On</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loans.map((loan) => {
              const bre = loan.borrower?.profile?.bre;
              const pan = loan.borrower?.profile?.panNumber ?? "—";

              return (
                <Tr key={loan.id}>
                  <Td>
                    <Link
                      href={`/loans/${loan.id}`}
                      className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left inline-block"
                    >
                      {loan.loanReference}
                    </Link>
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-900">
                      {loan.borrower?.fullName ?? "—"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {loan.borrower?.email ?? ""}
                    </div>
                  </Td>
                  <Td className="font-mono text-xs text-slate-700">{pan}</Td>
                  <Td className="font-extrabold text-slate-900">
                    {formatRupee(loan.principalPaise)}
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-800">
                      {formatRupee(loan.applicantSnapshot.monthlySalaryPaise)}
                    </div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      {loan.applicantSnapshot.employmentMode
                        .toLowerCase()
                        .replace(/_/g, " ")}
                    </div>
                  </Td>
                  <Td>
                    {bre ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase",
                          bre.passed
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
                        )}
                      >
                        {bre.passed ? (
                          <>
                            <CheckIcon className="w-3 h-3" />
                            <span>PASSED</span>
                          </>
                        ) : (
                          <>
                            <XMarkIcon className="w-3 h-3" />
                            <span>FAILED</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {formatDate(loan.createdAt)}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/loans/${loan.id}`}
                        className="inline-flex items-center justify-center font-semibold rounded-xl text-xs px-2.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Review
                      </Link>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openActionModal(loan, "sanction")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openActionModal(loan, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      {/* Action Decision Modal (Approve / Reject) */}
      <Modal
        open={!!selected && !!action}
        onClose={closeActionModal}
        title={
          action === "sanction"
            ? `Sanction Approval: ${selected?.loanReference}`
            : `Application Rejection: ${selected?.loanReference}`
        }
        description={
          action === "sanction"
            ? "Approving this loan locks underwriting terms and transitions status to SANCTIONED for payout disbursement."
            : "Rejections are permanent and audited. Provide a clear explanation that will be stored in the decision history."
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={closeActionModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={action === "sanction" ? "primary" : "danger"}
              loading={processing}
              onClick={handleAction}
              disabled={action === "reject" && reason.trim().length < 5}
            >
              {action === "sanction"
                ? "Confirm Sanction Approval"
                : "Confirm Rejection"}
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Quick Summary Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Applicant:</span>
                <strong className="text-slate-900">
                  {selected.borrower?.fullName ?? "—"} (
                  {selected.borrower?.email ?? ""})
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Principal Requested:</span>
                <strong className="text-slate-900 font-extrabold">
                  {formatRupee(selected.principalPaise)} ({selected.tenureDays}{" "}
                  days)
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">PAN & Salary:</span>
                <span className="text-slate-800 font-mono">
                  {selected.borrower?.profile?.panNumber ?? "—"} •{" "}
                  {formatRupee(selected.applicantSnapshot.monthlySalaryPaise)} /
                  mo
                </span>
              </div>
              {selected.salarySlipDocumentId && (
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-500">Income Document:</span>
                  <a
                    href={`${getApiBase()}/documents/${selected.salarySlipDocumentId}/content`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
                      View Uploaded Salary Slip
                      <ExternalLinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                    </span>
                  </a>
                </div>
              )}
            </div>

            {/* Approval Checklist & Notes */}
            {action === "sanction" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                    Underwriter Verification Checklist
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkSlip}
                      onChange={(e) => setCheckSlip(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>
                      Verified salary slip authenticity and earnings consistency
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkBre}
                      onChange={(e) => setCheckBre(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>
                      Confirmed automated BRE policy rules and applicant age
                    </span>
                  </label>
                </div>

                <div>
                  <Label htmlFor="sanction-notes">
                    Internal Underwriting Notes
                  </Label>
                  <Textarea
                    id="sanction-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Valid salary slip verified with employer. BRE passed. Approved for full loan amount."
                    rows={3}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    These notes will be permanently appended to the loan audit
                    history.
                  </span>
                </div>
              </div>
            )}

            {/* Rejection Reasons Presets */}
            {action === "reject" && (
              <div className="space-y-3">
                <div>
                  <Label>Common Rejection Reasons (Click to apply)</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {REJECTION_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer",
                          selectedPreset === p.label
                            ? "bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-400"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="reject-reason" required>
                    Specific Rejection Explanation
                  </Label>
                  <Textarea
                    id="reject-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Minimum 5 characters. State clearly why the application was declined."
                    rows={4}
                    required
                    minLength={5}
                    maxLength={500}
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>
                      This constructive explanation will be recorded in the
                      audit history.
                    </span>
                    <span>{reason.length}/500</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
