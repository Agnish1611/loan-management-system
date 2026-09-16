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
  StatusBadge,
  Input,
  Badge,
  formatDate,
  formatRupee,
  useDebounce,
  formatLeadStage,
  cn,
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
    <div>
      <PageHeader
        eyebrow="Sales Module"
        title="Leads"
        subtitle="Borrowers registered on the platform who have not yet applied for a loan"
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 border border-slate-200">
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

        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name, email, PAN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads found"
          description="No borrowers match the current stage and search criteria."
        />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Borrower Name</Th>
              <Th>Email Address</Th>
              <Th>Stage</Th>
              <Th>Declared Salary</Th>
              <Th>Employment</Th>
              <Th>Registered On</Th>
              <Th>BRE Verdict</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => (
              <Tr key={lead.userId}>
                <Td className="font-medium text-slate-900">{lead.fullName}</Td>
                <Td className="text-slate-500">{lead.email}</Td>
                <Td>
                  <StatusBadge
                    status={lead.stage}
                    label={formatLeadStage(lead.stage)}
                  />
                </Td>
                <Td className="font-semibold text-slate-800">
                  {lead.profile
                    ? formatRupee(lead.profile.monthlySalaryPaise)
                    : "—"}
                </Td>
                <Td className="text-slate-600">
                  {lead.profile
                    ? lead.profile.employmentMode.replace("_", " ")
                    : "—"}
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
                    <span className="text-slate-400">—</span>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
