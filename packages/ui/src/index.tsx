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

export { Spinner, PageSpinner } from "./components/Spinner";
export type { SpinnerProps } from "./components/Spinner";

export { EmptyState } from "./components/EmptyState";
export type { EmptyStateProps } from "./components/EmptyState";

export { PageHeader } from "./components/PageHeader";
export type { PageHeaderProps } from "./components/PageHeader";

export { Table, Thead, Tbody, Tr, Th, Td } from "./components/Table";

export { Modal } from "./components/Modal";
export type { ModalProps } from "./components/Modal";

export { Sidebar } from "./components/Sidebar";
export type { SidebarProps, SidebarLinkItem } from "./components/Sidebar";

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
} from "./lib/api";
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
