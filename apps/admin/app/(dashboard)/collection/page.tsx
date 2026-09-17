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
  formatRupee,
  formatDate,
  ApiError,
  getApiBase,
  cn,
  ArrowRightIcon,
} from "@repo/ui";
import { collectionApi } from "@/lib/api/ops";
import type { OpsLoanDto, PaymentDto } from "@repo/types";

export default function CollectionPage() {
  const [loans, setLoans] = useState<OpsLoanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OpsLoanDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Payment form
  const [utrNumber, setUtrNumber] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [paidAt, setPaidAt] = useState<string>(
    () => new Date().toISOString().split("T")[0] ?? "",
  );
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    collectionApi
      .getLoans()
      .then((res) => setLoans(res.loans))
      .finally(() => setLoading(false));
  }, []);

  async function openModal(loan: OpsLoanDto) {
    setSelected(loan);
    setUtrNumber("");
    setAmountRupees("");
    setPaidAt(new Date().toISOString().split("T")[0] ?? "");
    setError(null);
    setPaymentsLoading(true);
    try {
      const res = await collectionApi.getPayments(loan.id);
      setPayments(res.payments);
    } finally {
      setPaymentsLoading(false);
    }
  }

  function closeModal() {
    setSelected(null);
    setPayments([]);
    setError(null);
  }

  async function handleRecordPayment() {
    if (!selected) return;
    setProcessing(true);
    setError(null);
    const amountPaise = Math.round(Number(amountRupees) * 100);
    try {
      const res = await collectionApi.recordPayment(selected.id, {
        utrNumber: utrNumber.toUpperCase(),
        amountPaise,
        paidAt: new Date(paidAt || Date.now()).toISOString(),
      });
      // Update loan in list
      const updatedLoan = res.loan;
      if (updatedLoan.status === "CLOSED") {
        setLoans((prev) => prev.filter((l) => l.id !== selected.id));
        closeModal();
      } else {
        setLoans((prev) =>
          prev.map((l) =>
            l.id === selected.id ? { ...l, ...updatedLoan } : l,
          ),
        );
        setSelected((prev) => (prev ? { ...prev, ...updatedLoan } : prev));
        setPayments((prev) => [res.payment, ...prev]);
        setUtrNumber("");
        setAmountRupees("");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to record payment. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Collection Module"
        title="Active Disbursed Loans"
        subtitle="Track repayments, inspect ledger balances, and record UTR transaction vouchers"
      />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : loans.length === 0 ? (
        <EmptyState
          title="No active loans"
          description="All disbursed loans have been fully repaid and closed."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Reference</Th>
              <Th>Borrower</Th>
              <Th>Principal</Th>
              <Th>Outstanding Balance</Th>
              <Th>Repayment Progress</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loans.map((loan) => {
              const percentPaid =
                loan.totalRepaymentPaise > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (loan.amountPaidPaise / loan.totalRepaymentPaise) * 100,
                      ),
                    )
                  : 0;

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
                  <Td className="font-medium text-slate-700">
                    {formatRupee(loan.principalPaise)}
                  </Td>
                  <Td className="font-black text-rose-600">
                    {formatRupee(loan.outstandingPaise)}
                  </Td>
                  <Td className="min-w-40">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">
                          {percentPaid}% Repaid
                        </span>
                        <span className="text-slate-400">
                          {formatRupee(loan.amountPaidPaise)} /{" "}
                          {formatRupee(loan.totalRepaymentPaise)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/loans/${loan.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      >
                        View Loan
                        <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openModal(loan)}
                      >
                        Record Payment
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      {/* Record Payment Voucher & Payment Ledger Modal */}
      <Modal
        open={!!selected}
        onClose={closeModal}
        size="lg"
        title={`Record Payment — ${selected?.loanReference}`}
        description={`Remaining balance: ${selected ? formatRupee(selected.outstandingPaise) : ""}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={processing}
              onClick={handleRecordPayment}
              disabled={!utrNumber || !amountRupees}
            >
              Post Payment
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Repayment Progress Summary Bar */}
            {(() => {
              const percentPaid =
                selected.totalRepaymentPaise > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (selected.amountPaidPaise /
                          selected.totalRepaymentPaise) *
                          100,
                      ),
                    )
                  : 0;

              return (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Borrower
                      </span>
                      <span className="font-bold text-slate-900">
                        {selected.borrower?.fullName ?? "—"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Outstanding Balance
                      </span>
                      <span className="font-black text-rose-600">
                        {formatRupee(selected.outstandingPaise)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>
                      Paid: {formatRupee(selected.amountPaidPaise)} (
                      {percentPaid}%)
                    </span>
                    <span>
                      Total Obligation:{" "}
                      {formatRupee(selected.totalRepaymentPaise)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-1">
              {/* Payment form */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  New Payment Voucher
                </h3>
                <div>
                  <Label htmlFor="utr" required>
                    Bank UTR / Transaction Reference
                  </Label>
                  <Input
                    id="utr"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC12345678"
                    maxLength={30}
                  />
                </div>
                <div>
                  <Label htmlFor="amount" required>
                    Payment Amount (₹)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    placeholder={`Max ${formatRupee(selected.outstandingPaise)}`}
                    min={0.01}
                    step={0.01}
                  />
                </div>
                <div>
                  <Label htmlFor="paidAt" required>
                    Voucher Date
                  </Label>
                  <Input
                    id="paidAt"
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                {error && (
                  <p className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {error}
                  </p>
                )}
              </div>

              {/* Payment history */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Repayment Vouchers Ledger
                </h3>
                {paymentsLoading ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Loading history…
                  </p>
                ) : payments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No repayments recorded yet.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200/90">
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>UTR</Th>
                          <Th>Amount</Th>
                          <Th>Balance</Th>
                          <Th>Date</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {payments.map((p) => (
                          <Tr key={p.id}>
                            <Td className="font-mono text-xs font-semibold">
                              {p.utrNumber}
                            </Td>
                            <Td className="font-semibold text-emerald-600">
                              {formatRupee(p.amountPaise)}
                            </Td>
                            <Td>{formatRupee(p.outstandingAfterPaise)}</Td>
                            <Td className="text-xs text-slate-400">
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
        )}
      </Modal>
    </div>
  );
}
