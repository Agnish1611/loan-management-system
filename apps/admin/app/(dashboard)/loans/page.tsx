"use client";

import { useEffect, useState, useTransition } from "react";
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
  Input,
  StatusBadge,
  ArrowRightIcon,
  formatRupee,
  formatDate,
  cn,
} from "@repo/ui";
import { opsApi } from "@/lib/api/ops";
import type { OpsLoanDto } from "@repo/types";

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All Loans", value: "ALL" },
  { label: "Applied", value: "APPLIED" },
  { label: "Sanctioned", value: "SANCTIONED" },
  { label: "Disbursed", value: "DISBURSED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Closed", value: "CLOSED" },
];

export default function GlobalLoansLedgerPage() {
  const [loans, setLoans] = useState<OpsLoanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  // Fetch loans based on filters
  const fetchLoans = (status: string, search: string) => {
    setLoading(true);
    opsApi
      .getAllLoans({
        status: status === "ALL" ? undefined : status,
        search: search.trim() || undefined,
      })
      .then((res) => {
        setLoans(res.loans);
      })
      .catch((err) => {
        console.error("Failed to load loans:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLoans(activeStatus, searchQuery);
  }, [activeStatus]);

  // Debounced search handling
  function handleSearchChange(val: string) {
    setSearchQuery(val);
    startTransition(() => {
      fetchLoans(activeStatus, val);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portfolio Management"
        title="Global Loans Ledger"
        subtitle="Search and audit the entire credit portfolio across all workflow stages with complete decision trails"
      />

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80">
          {STATUS_FILTERS.map((tab) => {
            const active = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveStatus(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  active
                    ? "bg-white text-indigo-900 shadow-xs ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="w-full sm:w-72">
          <Input
            id="loans-search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search ref, name, email, PAN…"
            className="w-full text-xs"
          />
        </div>
      </div>

      {/* Main Ledger Table */}
      {loading ? (
        <TableSkeleton rows={6} />
      ) : loans.length === 0 ? (
        <EmptyState
          title="No loans found"
          description={
            searchQuery
              ? `No loan applications matched "${searchQuery}".`
              : `No loans found under the "${activeStatus}" filter.`
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Reference</Th>
              <Th>Borrower</Th>
              <Th>Principal</Th>
              <Th>Status</Th>
              <Th>Applicant Snapshot</Th>
              <Th>Created Date</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loans.map((loan) => {
              const pan = loan.borrower?.profile?.panNumber;
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
                    {pan && (
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        PAN: {pan}
                      </span>
                    )}
                  </Td>
                  <Td className="font-extrabold text-slate-900">
                    {formatRupee(loan.principalPaise)}
                  </Td>
                  <Td>
                    <StatusBadge status={loan.status} />
                  </Td>
                  <Td>
                    <div className="text-xs font-semibold text-slate-800">
                      {formatRupee(loan.applicantSnapshot.monthlySalaryPaise)}
                      /mo
                    </div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      {loan.applicantSnapshot.employmentMode
                        .toLowerCase()
                        .replace(/_/g, " ")}
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {formatDate(loan.createdAt)}
                  </Td>
                  <Td>
                    <Link
                      href={`/loans/${loan.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 py-1.5 px-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                    >
                      <span>View Details</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
