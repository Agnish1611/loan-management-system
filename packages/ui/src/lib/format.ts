/**
 * format.ts — Shared formatting utilities for currency, dates, and numbers.
 * All monetary values are stored as integer paise (1 rupee = 100 paise).
 */

/**
 * Converts integer paise to a formatted INR rupee string.
 * Example: 12345678 → "₹1,23,456.78"
 */
export function formatRupee(paise: number): string {
  if (!Number.isFinite(paise)) return "₹0.00";
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Converts rupees (float) to a formatted INR string.
 */
export function formatRupeeFromRupees(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Formats an ISO date string to "DD MMM YYYY".
 * Example: "2024-03-15T10:30:00Z" → "15 Mar 2024"
 */
export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

/**
 * Formats an ISO date string to "DD MMM YYYY, HH:MM".
 * Example: "2024-03-15T10:30:00Z" → "15 Mar 2024, 16:00"
 */
export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * Formats a number with Indian numbering system commas.
 * Example: 1234567 → "12,34,567"
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

/**
 * Converts paise to rupees (float).
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Converts rupees to paise (integer, round half-up).
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Returns a human-readable label for a loan status.
 */
export function formatLoanStatus(status: string): string {
  const labels: Record<string, string> = {
    APPLIED: "Applied",
    SANCTIONED: "Sanctioned",
    REJECTED: "Rejected",
    DISBURSED: "Disbursed",
    CLOSED: "Closed",
  };
  return labels[status] ?? status;
}

/**
 * Returns a human-readable label for an employment mode.
 */
export function formatEmploymentMode(mode: string): string {
  const labels: Record<string, string> = {
    SALARIED: "Salaried",
    SELF_EMPLOYED: "Self-Employed",
    UNEMPLOYED: "Unemployed",
  };
  return labels[mode] ?? mode;
}

/**
 * Returns a human-readable label for a lead stage.
 */
export function formatLeadStage(stage: string): string {
  const labels: Record<string, string> = {
    REGISTERED_ONLY: "Registered",
    PROFILE_DONE: "Profile Done",
    BRE_REJECTED: "BRE Rejected",
  };
  return labels[stage] ?? stage;
}
