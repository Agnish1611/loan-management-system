"use client";

import { useEffect, useState } from "react";
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
} from "@repo/ui";
import { sanctionApi } from "@/lib/api/ops";
import type { OpsLoanDto } from "@repo/types";

export default function SanctionPage() {
  const [loans, setLoans] = useState<OpsLoanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OpsLoanDto | null>(null);
  const [action, setAction] = useState<"sanction" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sanctionApi
      .getLoans()
      .then((res) => setLoans(res.loans))
      .finally(() => setLoading(false));
  }, []);

  function openModal(loan: OpsLoanDto, act: "sanction" | "reject") {
    setSelected(loan);
    setAction(act);
    setNotes("");
    setReason("");
    setError(null);
  }

  function closeModal() {
    setSelected(null);
    setAction(null);
    setError(null);
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
      // Remove processed loan from queue
      setLoans((prev) => prev.filter((l) => l.id !== selected.id));
      closeModal();
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
        subtitle="Review, audit documentation, and approve or reject pending loan applications"
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
              <Th>Principal</Th>
              <Th>Interest</Th>
              <Th>Tenure</Th>
              <Th>Declared Salary</Th>
              <Th>Applied On</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loans.map((loan) => (
              <Tr key={loan.id}>
                <Td>
                  <span className="font-mono text-xs font-semibold text-indigo-600">
                    {loan.loanReference}
                  </span>
                </Td>
                <Td>
                  <div className="font-medium text-slate-900">
                    {loan.borrower?.fullName ?? "—"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {loan.borrower?.email ?? ""}
                  </div>
                </Td>
                <Td className="font-semibold text-slate-900">
                  {formatRupee(loan.principalPaise)}
                </Td>
                <Td className="text-slate-600">
                  {formatRupee(loan.interestPaise)}
                </Td>
                <Td>{loan.tenureDays}d</Td>
                <Td>
                  <div className="font-medium text-slate-800">
                    {formatRupee(loan.applicantSnapshot.monthlySalaryPaise)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {loan.applicantSnapshot.employmentMode.replace("_", " ")}
                  </div>
                </Td>
                <Td className="text-xs text-slate-500">
                  {formatDate(loan.createdAt)}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openModal(loan, "sanction")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => openModal(loan, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Action Modal */}
      <Modal
        open={!!selected && !!action}
        onClose={closeModal}
        title={
          action === "sanction"
            ? `Approve Application — ${selected?.loanReference}`
            : `Reject Application — ${selected?.loanReference}`
        }
        description={
          action === "sanction"
            ? `Approving will advance this loan to SANCTIONED status for disbursement.`
            : `Rejection is permanent. Please provide a clear, constructive reason.`
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={action === "sanction" ? "primary" : "danger"}
              loading={processing}
              onClick={handleAction}
              disabled={action === "reject" && reason.trim().length < 5}
            >
              {action === "sanction" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 mb-5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Borrower:</span>
              <strong className="text-slate-800">
                {selected.borrower?.fullName ?? "—"} (
                {selected.borrower?.email ?? ""})
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Principal Requested:</span>
              <strong className="text-slate-900 font-bold">
                {formatRupee(selected.principalPaise)}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Declared Salary:</span>
              <span className="text-slate-700">
                {formatRupee(selected.applicantSnapshot.monthlySalaryPaise)} /
                mo (
                {selected.applicantSnapshot.employmentMode.replace("_", " ")})
              </span>
            </div>
            {selected.salarySlipDocumentId && (
              <div className="pt-2 border-t border-slate-200">
                <a
                  href={`${getApiBase()}/documents/${selected.salarySlipDocumentId}/content`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  📄 View Uploaded Salary Slip ↗
                </a>
              </div>
            )}
          </div>
        )}

        {action === "sanction" && (
          <div>
            <Label htmlFor="sanction-notes">Internal Notes (Optional)</Label>
            <Textarea
              id="sanction-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add audit or underwriting notes…"
              rows={3}
            />
          </div>
        )}

        {action === "reject" && (
          <div>
            <Label htmlFor="reject-reason" required>
              Rejection Reason
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Minimum 5 characters. This explanation will be displayed to the applicant."
              rows={4}
              required
              minLength={5}
              maxLength={500}
            />
          </div>
        )}

        {error && (
          <p className="mt-3 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
