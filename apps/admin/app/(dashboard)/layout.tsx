"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar, PageSpinner, ApiError, MenuIcon } from "@repo/ui";
import type { SidebarLinkItem } from "@repo/ui";
import { authApi } from "@/lib/api/auth";
import type { SanitizedUser } from "@repo/types";

const ALL_LINKS: SidebarLinkItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/loans", label: "All Loans" },
  { href: "/sales", label: "Sales Leads" },
  { href: "/sanction", label: "Sanction Queue" },
  { href: "/disbursement", label: "Disbursement Queue" },
  { href: "/collection", label: "Collection" },
];

/** Base paths each role may access (prefix-matched, so /sales/[id] etc. are covered). */
const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
  SALES: ["/dashboard", "/loans", "/sales"],
  SANCTION: ["/dashboard", "/loans", "/sanction"],
  DISBURSEMENT: ["/dashboard", "/loans", "/disbursement"],
  COLLECTION: ["/dashboard", "/loans", "/collection"],
};

function allowedPathsForRole(role: string): string[] {
  if (role === "ADMIN") return ALL_LINKS.map((l) => l.href);
  return ROLE_ALLOWED_PATHS[role] ?? ["/dashboard", "/loans"];
}

/** Build sidebar links based on user role. ADMIN sees all modules. */
function buildLinks(role: string): SidebarLinkItem[] {
  const allowed = allowedPathsForRole(role);
  return ALL_LINKS.filter((l) => allowed.includes(l.href));
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SanitizedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // Route-level RBAC: a role typing a module URL it doesn't own directly
  // (not just clicking a hidden sidebar link) gets redirected rather than
  // silently rendering a page whose data fetch will 403 — hiding the menu
  // item alone isn't real access control on the frontend.
  useEffect(() => {
    if (!user) return;
    const allowed = allowedPathsForRole(user.role);
    const isAllowed = allowed.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    if (!isAllowed) {
      router.replace("/dashboard");
    }
  }, [user, pathname, router]);

  if (loading) return <PageSpinner />;
  if (!user) return null;

  const allowedPaths = allowedPathsForRole(user.role);
  const isCurrentPathAllowed = allowedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (!isCurrentPathAllowed) return <PageSpinner />;

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
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        appName="CreditSea Ops"
        appSubtitle={user.role}
        links={links}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
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

      {/* Mobile top bar — hidden at lg+, where the sidebar is always visible */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/90 bg-white px-4 py-3 lg:hidden">
        <button
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm text-slate-900">CreditSea Ops</span>
      </div>

      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
