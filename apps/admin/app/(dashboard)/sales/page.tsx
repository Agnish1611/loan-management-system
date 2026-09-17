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
  StatusBadge,
  Input,
  Badge,
  formatDate,
  formatRupee,
  useDebounce,
  formatLeadStage,
  cn,
  ArrowRightIcon,
} from "@repo/ui";
import { salesApi } from "@/lib/api/ops";
import type { SalesLeadDto } from "@repo/types";

const STAGES = [
  "ALL",
  "REGISTERED_ONLY",
  "PROFILE_DONE",
  "BRE_REJECTED",
] as const;
type Stage = (typeof STAGES)[number];

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<SalesLeadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage>("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setLoading(true);
    salesApi
      .getLeads({ stage, search: debouncedSearch || undefined })
      .then((res) => setLeads(res.leads))
      .finally(() => setLoading(false));
  }, [stage, debouncedSearch]);

  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        eyebrow="Sales Module"
        title="Leads"
        subtitle="Inspect registered borrower profiles, review underwriting eligibility, and execute proactive outreach"
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap p-1 rounded-xl bg-slate-200/70 border border-slate-200">
          {STAGES.map((s) => (
            <button
              key={s}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                stage === s
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900",
              )}
              onClick={() => setStage(s)}
            >
              {s === "ALL" ? "All Leads" : formatLeadStage(s)}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by name, email, PAN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads found"
          description="No borrowers match the current stage and search criteria."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Borrower</Th>
              <Th>Stage</Th>
              <Th>Declared Income</Th>
              <Th>Registered On</Th>
              <Th>BRE Verdict</Th>
              <Th className="text-right">Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => {
              const pan = lead.profile?.panNumber;
              return (
                <Tr key={lead.userId}>
                  <Td>
                    <div className="font-semibold text-slate-900">
                      <Link
                        href={`/sales/${lead.userId}`}
                        className="hover:text-indigo-600 hover:underline"
                      >
                        {lead.fullName}
                      </Link>
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-55">
                      {lead.email}
                    </div>
                    {pan && (
                      <span className="inline-block mt-0.5 font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {pan}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge
                      status={lead.stage}
                      label={formatLeadStage(lead.stage)}
                    />
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-800">
                      {lead.profile
                        ? formatRupee(lead.profile.monthlySalaryPaise)
                        : "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {lead.profile
                        ? lead.profile.employmentMode.replace("_", " ")
                        : "No profile"}
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {formatDate(lead.registeredAt)}
                  </Td>
                  <Td>
                    {lead.bre ? (
                      <Badge variant={lead.bre.passed ? "success" : "danger"}>
                        {lead.bre.passed ? "Pass" : "Fail"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">Pending</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/sales/${lead.userId}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      View Lead
                      <ArrowRightIcon className="w-3.5 h-3.5 text-slate-400" />
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
