// ── Components
export { Button } from "./components/Button";
export type { ButtonProps } from "./components/Button";

export { Label } from "./components/Label";
export type { LabelProps } from "./components/Label";

export { Input } from "./components/Input";
export type { InputProps } from "./components/Input";

export { Select } from "./components/Select";
export type { SelectProps } from "./components/Select";

export { Textarea } from "./components/Textarea";
export type { TextareaProps } from "./components/Textarea";

export { Badge, StatusBadge } from "./components/Badge";
export type { BadgeProps } from "./components/Badge";

export {
  Skeleton,
  PageHeaderSkeleton,
  StatGridSkeleton,
  TableSkeleton,
  CardSkeleton,
  ListPageSkeleton,
  DashboardSkeleton,
  DetailPageSkeleton,
  FormPageSkeleton,
  AppShellSkeleton,
} from "./components/Skeleton";

export { EmptyState } from "./components/EmptyState";
export type { EmptyStateProps } from "./components/EmptyState";

export { PageHeader } from "./components/PageHeader";
export type { PageHeaderProps } from "./components/PageHeader";

export { Table, Thead, Tbody, Tr, Th, Td } from "./components/Table";

export { Modal } from "./components/Modal";
export type { ModalProps } from "./components/Modal";

export { Sidebar } from "./components/Sidebar";
export type { SidebarProps, SidebarLinkItem } from "./components/Sidebar";

export { LoanTimeline } from "./components/LoanTimeline";
export type { LoanTimelineProps } from "./components/LoanTimeline";

export { BorrowerProfileModal } from "./components/BorrowerProfileModal";
export type { BorrowerProfileModalProps } from "./components/BorrowerProfileModal";

export { LeadProfileModal } from "./components/LeadProfileModal";
export type { LeadProfileModalProps } from "./components/LeadProfileModal";

export * from "./components/Icons";

// ── Hooks
export { useLocalStorage } from "./hooks/useLocalStorage";
export { useDebounce } from "./hooks/useDebounce";

// ── Lib
export {
  apiClient,
  ApiError,
  buildQuery,
  configureApiClient,
  getApiBase,
  openAuthenticatedFile,
} from "./lib/api";
export { setSessionHint, clearSessionHint } from "./lib/session-hint";
export { cn } from "./lib/utils";

export {
  formatRupee,
  formatRupeeFromRupees,
  formatDate,
  formatDateTime,
  formatNumber,
  paiseToRupees,
  rupeesToPaise,
  formatLoanStatus,
  formatEmploymentMode,
  formatLeadStage,
} from "./lib/format";
