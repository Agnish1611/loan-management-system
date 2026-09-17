"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, AppShellSkeleton, ApiError, MenuIcon } from "@repo/ui";
import type { SidebarLinkItem } from "@repo/ui";
import { authApi } from "@/lib/api/auth";

const NAV_LINKS: SidebarLinkItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/loans", label: "My Loans" },
  { href: "/apply", label: "Apply Now" },
  { href: "/profile", label: "Profile" },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        setUserName(res.user.fullName);
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

  if (loading) return <AppShellSkeleton />;

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        appName="CreditSea"
        appSubtitle="Borrower Portal"
        links={NAV_LINKS}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        footer={
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {userName || "Borrower"}
              </p>
              <p className="text-[11px] text-slate-400">Authenticated</p>
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
        <span className="font-bold text-sm text-slate-900">CreditSea</span>
      </div>

      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
