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
  TableSkeleton,
  Modal,
  Button,
  Label,
  Input,
  Textarea,
  formatRupee,
  formatDate,
  ApiError,
  getApiBase,
  cn,
  ArrowRightIcon,
} from "@repo/ui";
import { disbursementApi } from "@/lib/api/ops";
import type { OpsLoanDto } from "@repo/types";

export default function DisbursementPage() {
  const [loans, setLoans] = useState<OpsLoanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OpsLoanDto | null>(null);
  const [payoutRef, setPayoutRef] = useState("");
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
    setPayoutRef("");
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

    const fullNotes = payoutRef.trim()
      ? `[UTR/Ref: ${payoutRef.trim().toUpperCase()}] ${notes.trim()}`.trim()
      : notes.trim() || undefined;

    try {
      await disbursementApi.disburse(selected.id, fullNotes);
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
        subtitle="Verify underwriter approval audits and process fund release with bank payout references"
      />

      {loading ? (
        <TableSkeleton rows={6} />
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
              <Th>Tenure</Th>
              <Th>Sanctioned By</Th>
              <Th>Sanctioned Date</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loans.map((loan) => {
              const sanctionEvent = loan.statusHistory.find(
                (h) => h.to === "SANCTIONED",
              );
              return (
                <Tr key={loan.id}>
                  <Td>
                    <Link
                      href={`/loans/${loan.id}`}
                      className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
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
                  <Td className="font-extrabold text-slate-900">
                    {formatRupee(loan.principalPaise)}
                  </Td>
                  <Td className="text-slate-600">{loan.tenureDays} days</Td>
                  <Td>
                    <div className="text-xs font-semibold text-slate-800">
                      {sanctionEvent?.byUserName || "Sanction Officer"}
                    </div>
                    {sanctionEvent?.byUserEmail && (
                      <div className="text-[11px] text-slate-400">
                        {sanctionEvent.byUserEmail}
                      </div>
                    )}
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {sanctionEvent?.at ? formatDate(sanctionEvent.at) : "—"}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/loans/${loan.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      >
                        Review Loan
                        <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openModal(loan)}
                      >
                        Disburse Funds
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      {/* Disbursement Confirmation & Treasury Details Modal */}
      <Modal
        open={!!selected}
        onClose={closeModal}
        size="lg"
        title={`Disburse Loan — ${selected?.loanReference}`}
        description={`Execute treasury payout and transition status to DISBURSED.`}
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
        {selected && (
          <div className="space-y-5">
            {/* Sanction Underwriting Audit Callout */}
            {(() => {
              const sanctionEvent = selected.statusHistory.find(
                (h) => h.to === "SANCTIONED",
              );
              return (
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-200/50">
                    <span className="font-bold text-indigo-900 uppercase tracking-wider text-[10px]">
                      Underwriter Approval Audit
                    </span>
                    <span className="text-[11px] text-indigo-600 font-medium">
                      {sanctionEvent?.at
                        ? formatDate(sanctionEvent.at)
                        : "Verified"}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      Approved by:
                    </span>
                    <span className="font-bold text-indigo-950">
                      {sanctionEvent?.byUserName || "Sanction Officer"}
                    </span>
                    {sanctionEvent?.byUserEmail && (
                      <span className="text-slate-500 font-mono text-[11px]">
                        ({sanctionEvent.byUserEmail})
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-slate-700 bg-white/80 p-2.5 rounded-lg border border-indigo-100/80">
                    <span className="font-semibold text-slate-900 block mb-0.5">
                      Underwriter Decision Notes:
                    </span>
                    <p className="text-slate-600 italic">
                      {sanctionEvent?.reason ||
                        "Sanction policy criteria satisfied. Approved for fund release."}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Payout Summary Cards */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Beneficiary
                </span>
                <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                  {selected.borrower?.fullName ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Disbursement Amount
                </span>
                <p className="text-xs font-black text-emerald-700 mt-0.5">
                  {formatRupee(selected.principalPaise)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Repayable
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {formatRupee(selected.totalRepaymentPaise)}
                </p>
              </div>
            </div>

            {/* Treasury Input Fields */}
            <div className="space-y-3.5">
              <div>
                <Label htmlFor="payout-ref">
                  Bank Reference / NEFT UTR / IMPS RRN (Recommended)
                </Label>
                <Input
                  id="payout-ref"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value.toUpperCase())}
                  placeholder="e.g. UTR123456789012"
                  maxLength={50}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Unique bank transaction sequence for reconciliation.
                </p>
              </div>

              <div>
                <Label htmlFor="disburse-notes">
                  Disbursement Notes / Treasury Remarks (Optional)
                </Label>
                <Textarea
                  id="disburse-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add treasury ledger remarks or banking batch ID…"
                  rows={2}
                />
              </div>
            </div>

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
