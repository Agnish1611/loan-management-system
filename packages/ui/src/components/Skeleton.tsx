import { cn } from "../lib/utils";

export interface SkeletonProps {
  className?: string;
}

/** Base building block — a pulsing placeholder block. Size via className (h-4 w-32, etc). */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      aria-hidden="true"
    />
  );
}

/** Matches PageHeader's eyebrow + title + subtitle rhythm. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-8 border-b border-slate-200/80">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-32 shrink-0" />
    </div>
  );
}

/** Matches the recurring "grid of stat cards" (dashboards, loan details). */
export function StatGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4",
        count >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-2",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-white rounded-2xl border border-slate-200/90 space-y-2.5"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Matches the Table component's header + row rhythm. */
export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
      <div className="flex gap-4 border-b border-slate-200 px-4 py-3.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-3.5 flex-1", c === 0 && "max-w-28")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generic bordered content card with a few placeholder lines — KYC blocks, detail sections. */
export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-3 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Page header + filter bar + table — the shape of every ops/loan list page. */
export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      <PageHeaderSkeleton />
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Skeleton className="h-10 w-full sm:w-80" />
        <Skeleton className="h-10 w-full sm:w-48" />
      </div>
      <TableSkeleton rows={rows} />
    </div>
  );
}

/** Page header + stat grid + a feed/list card — dashboard-shaped pages. */
export function DashboardSkeleton({ statCount = 3 }: { statCount?: number }) {
  return (
    <div>
      <PageHeaderSkeleton />
      <StatGridSkeleton count={statCount} className="mb-8" />
      <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <Skeleton className="h-4 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Page header + stat grid + content cards, two-column — loan/lead detail pages. */
export function DetailPageSkeleton() {
  return (
    <div>
      <PageHeaderSkeleton />
      <StatGridSkeleton count={4} className="mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={3} />
        </div>
        <div className="space-y-6">
          <CardSkeleton lines={4} />
        </div>
      </div>
    </div>
  );
}

/** Page header + a column of label/input pairs — application/profile forms. */
export function FormPageSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div>
      <PageHeaderSkeleton />
      <div className="max-w-xl p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/** App shell — sidebar-shaped bar + blank content area, shown while the initial auth check resolves, before the real sidebar/nav links are known. */
export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-slate-200/90 bg-white p-6 lg:flex">
        <div className="flex items-center gap-2.5 pb-6 mb-6 border-b border-slate-100">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  );
}
