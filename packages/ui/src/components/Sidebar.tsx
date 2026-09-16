"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";

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
}

export function Sidebar({ appName, appSubtitle, links, footer }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      className="w-64 shrink-0 min-h-screen bg-white border-r border-slate-200/90 flex flex-col justify-between select-none"
      aria-label="Main navigation"
    >
      <div>
        {/* Brand */}
        <div className="px-6 py-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-mark.jpg"
              alt=""
              className="w-8 h-8 rounded-lg object-cover shadow-sm shadow-indigo-500/30"
            />
            <div>
              <p className="font-bold text-base text-slate-900 tracking-tight leading-snug">
                {appName}
              </p>
              {appSubtitle && (
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  {appSubtitle}
                </p>
              )}
            </div>
          </div>
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
  );
}
