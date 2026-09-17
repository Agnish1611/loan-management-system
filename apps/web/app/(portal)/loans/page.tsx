"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  StatusBadge,
  EmptyState,
  TableSkeleton,
  Button,
  formatRupee,
  formatDate,
} from "@repo/ui";
import { loansApi } from "@/lib/api/loans";
import type { LoanDto } from "@repo/types";

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<LoanDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loansApi
      .listMine()
      .then((res) => setLoans(res.loans))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="My Loans"
        title="Loan Applications"
        subtitle="Your complete history of loan applications and active disbursements"
        action={
          <Link href="/apply">
            <Button size="sm">New Application →</Button>
          </Link>
        }
      />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : loans.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="You haven't applied for any loans. Start your first application now."
          action={
            <Link href="/apply">
              <Button size="sm">Apply now →</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Reference</Th>
              <Th>Principal</Th>
              <Th>Total Repayment</Th>
              <Th>Outstanding</Th>
              <Th>Tenure</Th>
              <Th>Status</Th>
              <Th>Applied On</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loans.map((loan) => (
              <Tr
                key={loan.id}
                onClick={() => router.push(`/loans/${loan.id}`)}
              >
                <Td>
                  <span className="font-mono text-xs font-semibold text-indigo-600 tracking-wider">
                    {loan.loanReference}
                  </span>
                </Td>
                <Td className="font-semibold text-slate-900">
                  {formatRupee(loan.principalPaise)}
                </Td>
                <Td>{formatRupee(loan.totalRepaymentPaise)}</Td>
                <Td className="font-semibold text-slate-700">
                  {formatRupee(loan.outstandingPaise)}
                </Td>
                <Td>{loan.tenureDays} days</Td>
                <Td>
                  <StatusBadge status={loan.status} />
                </Td>
                <Td className="text-xs text-slate-500">
                  {formatDate(loan.createdAt)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
