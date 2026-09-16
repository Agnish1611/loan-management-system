"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import { XMarkIcon } from "./Icons";

export interface SidebarLinkItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SidebarProps {
  appName: string;
  appSubtitle?: string;
  links: SidebarLinkItem[];
  footer?: React.ReactNode;
  /** Off-canvas drawer state, below the lg breakpoint. Ignored at lg+, where the sidebar is always visible. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  appName,
  appSubtitle,
  links,
  footer,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop — mobile only, only while the drawer is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200/90 bg-white transition-transform duration-200 ease-out sm:w-64",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div>
          {/* Brand */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo-mark.jpg"
                alt=""
                className="w-8 h-8 rounded-lg object-cover shadow-sm shadow-indigo-500/30 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-base text-slate-900 tracking-tight leading-snug truncate">
                  {appName}
                </p>
                {appSubtitle && (
                  <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase truncate">
                    {appSubtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer lg:hidden"
              onClick={onMobileClose}
              aria-label="Close menu"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <ul className="px-3 py-4 space-y-1" role="list">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-indigo-50 text-indigo-700 font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {link.icon && (
                      <span
                        className={cn(
                          "text-base shrink-0",
                          active ? "text-indigo-600" : "text-slate-400",
                        )}
                        aria-hidden="true"
                      >
                        {link.icon}
                      </span>
                    )}
                    <span>{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer slot */}
        {footer && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            {footer}
          </div>
        )}
      </nav>
    </>
  );
}
