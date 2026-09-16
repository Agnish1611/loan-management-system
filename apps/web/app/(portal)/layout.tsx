"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, PageSpinner, ApiError } from "@repo/ui";
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

  if (loading) return <PageSpinner />;

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        appName="CreditSea"
        appSubtitle="Borrower Portal"
        links={NAV_LINKS}
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
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 sm:px-10 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
