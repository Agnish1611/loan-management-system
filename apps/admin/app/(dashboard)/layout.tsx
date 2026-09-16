"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, PageSpinner, ApiError } from "@repo/ui";
import type { SidebarLinkItem } from "@repo/ui";
import { authApi } from "@/lib/api/auth";
import type { SanitizedUser } from "@repo/types";

/** Build sidebar links based on user role. ADMIN sees all modules. */
function buildLinks(role: string): SidebarLinkItem[] {
  const all: SidebarLinkItem[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/sales", label: "Sales Leads" },
    { href: "/sanction", label: "Sanction Queue" },
    { href: "/disbursement", label: "Disbursement Queue" },
    { href: "/collection", label: "Collection" },
  ];

  if (role === "ADMIN") return all;

  const roleMap: Record<string, string[]> = {
    SALES: ["/dashboard", "/sales"],
    SANCTION: ["/dashboard", "/sanction"],
    DISBURSEMENT: ["/dashboard", "/disbursement"],
    COLLECTION: ["/dashboard", "/collection"],
  };

  const allowed = roleMap[role] ?? ["/dashboard"];
  return all.filter((l) => allowed.includes(l.href));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SanitizedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.user.role === "BORROWER") {
          router.replace("/login");
          return;
        }
        setUser(res.user);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        } else {
          setLoading(false);
        }
      });
  }, [router]);

  if (loading) return <PageSpinner />;
  if (!user) return null;

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    router.replace("/login");
  }

  const links = buildLinks(user.role);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        appName="CreditSea Ops"
        appSubtitle={user.role}
        links={links}
        footer={
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user.fullName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user.email}
              </p>
            </div>
            <button
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer shrink-0"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        }
      />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 sm:px-10 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
