"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, PageSpinner } from "@repo/ui";
import { authApi } from "@/lib/api/auth";
import {
  sanctionApi,
  disbursementApi,
  collectionApi,
  salesApi,
} from "@/lib/api/ops";
import type { SanitizedUser } from "@repo/types";

export default function DashboardOverviewPage() {
  const [user, setUser] = useState<SanitizedUser | null>(null);
  const [sanctionCount, setSanctionCount] = useState<number | null>(null);
  const [disbursementCount, setDisbursementCount] = useState<number | null>(
    null,
  );
  const [collectionCount, setCollectionCount] = useState<number | null>(null);
  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        const u = res.user;
        setUser(u);

        const fetches: Promise<void>[] = [];

        if (u.role === "ADMIN" || u.role === "SALES") {
          fetches.push(
            salesApi
              .getLeads()
              .then((r) => setLeadsCount(r.leads.length))
              .catch(() => {}),
          );
        }
        if (u.role === "ADMIN" || u.role === "SANCTION") {
          fetches.push(
            sanctionApi
              .getLoans()
              .then((r) => setSanctionCount(r.loans.length))
              .catch(() => {}),
          );
        }
        if (u.role === "ADMIN" || u.role === "DISBURSEMENT") {
          fetches.push(
            disbursementApi
              .getLoans()
              .then((r) => setDisbursementCount(r.loans.length))
              .catch(() => {}),
          );
        }
        if (u.role === "ADMIN" || u.role === "COLLECTION") {
          fetches.push(
            collectionApi
              .getLoans()
              .then((r) => setCollectionCount(r.loans.length))
              .catch(() => {}),
          );
        }

        return Promise.all(fetches).finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const moduleCards = [
    leadsCount !== null && {
      href: "/sales",
      title: "Sales Leads",
      count: leadsCount,
      description: "Borrowers without an active loan application",
      badge: "Leads",
    },
    sanctionCount !== null && {
      href: "/sanction",
      title: "Sanction Queue",
      count: sanctionCount,
      description: "Pending loan applications awaiting underwriting review",
      badge: "Pending Review",
    },
    disbursementCount !== null && {
      href: "/disbursement",
      title: "Disbursement Queue",
      count: disbursementCount,
      description: "Sanctioned loans ready for immediate payout",
      badge: "Ready",
    },
    collectionCount !== null && {
      href: "/collection",
      title: "Collection Queue",
      count: collectionCount,
      description: "Active disbursed loans with outstanding balance",
      badge: "Active",
    },
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    count: number;
    description: string;
    badge: string;
  }>;

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title={`Welcome, ${user?.fullName ?? ""}`.trimEnd()}
        subtitle={`Signed in as ${user?.role}. Select a module to process pending queues.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {moduleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {card.badge}
                </span>
                <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </div>
              <p className="text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
                {card.count}
              </p>
              <p className="text-base font-bold text-slate-900 mt-2">
                {card.title}
              </p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {card.description}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>View Queue</span>
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
