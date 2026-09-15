export type Role =
  "ADMIN" | "SALES" | "SANCTION" | "DISBURSEMENT" | "COLLECTION" | "BORROWER";

export type LoanStatus =
  "APPLIED" | "SANCTIONED" | "REJECTED" | "DISBURSED" | "CLOSED";

export type EmploymentMode = "SALARIED" | "SELF_EMPLOYED" | "UNEMPLOYED";

export type DocumentType = "SALARY_SLIP";

export interface HealthCheckResponse {
  status: "ok";
  uptime: number;
  timestamp: string;
  service: string;
}
