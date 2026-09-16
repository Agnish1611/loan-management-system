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
} from "@repo/ui";
import { disbursementApi } from "@/lib/api/ops";
import type { OpsLoanDto } from "@repo/types";

export default function DisbursementPage() {
  const [loans, setLoans] = useState<OpsLoanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OpsLoanDto | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    disbursementApi
      .getLoans()
      .then((res) => setLoans(res.loans))
      .finally(() => setLoading(false));
  }, []);

  function openModal(loan: OpsLoanDto) {
    setSelected(loan);
    setNotes("");
    setError(null);
  }

  function closeModal() {
    setSelected(null);
    setError(null);
  }

  async function handleDisburse() {
    if (!selected) return;
    setProcessing(true);
    setError(null);
    try {
      await disbursementApi.disburse(selected.id, notes || undefined);
      setLoans((prev) => prev.filter((l) => l.id !== selected.id));
      closeModal();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Disbursement failed. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Disbursement Module"
        title="Sanctioned Loans"
        subtitle="Process payout disbursement for sanctioned loans ready for release"
      />

      {loading ? (
        <PageSpinner />
      ) : loans.length === 0 ? (
        <EmptyState
          title="Disbursement queue clear"
          description="No sanctioned loans are currently pending fund release."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Reference</Th>
              <Th>Borrower</Th>
              <Th>Disbursement Amount</Th>
              <Th>Total Repayment</Th>
              <Th>Tenure</Th>
              <Th>Sanctioned Date</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loans.map((loan) => {
              const sanctionedAt = loan.statusHistory.find(
                (h) => h.to === "SANCTIONED",
              )?.at;
              return (
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
                  <Td className="font-bold text-slate-900">
                    {formatRupee(loan.principalPaise)}
                  </Td>
                  <Td>{formatRupee(loan.totalRepaymentPaise)}</Td>
                  <Td>{loan.tenureDays} days</Td>
                  <Td className="text-xs text-slate-500">
                    {sanctionedAt ? formatDate(sanctionedAt) : "—"}
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openModal(loan)}
                    >
                      Disburse Funds
                    </Button>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      <Modal
        open={!!selected}
        onClose={closeModal}
        title={`Disburse Loan — ${selected?.loanReference}`}
        description={`This will trigger release of ${selected ? formatRupee(selected.principalPaise) : ""} to the borrower and transition status to DISBURSED.`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button size="sm" loading={processing} onClick={handleDisburse}>
              Confirm Disbursement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="disburse-notes">
              Disbursement Notes (Optional)
            </Label>
            <Textarea
              id="disburse-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add bank reference or treasury remarks…"
              rows={3}
            />
          </div>
          {error && (
            <p className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
