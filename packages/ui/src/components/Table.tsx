import {
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "../lib/utils";

export function Table({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-xs">
      <table
        className={cn("w-full text-left border-collapse text-sm", className)}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}

export function Thead({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider",
        className,
      )}
      {...rest}
    >
      {children}
    </thead>
  );
}

export function Tbody({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-slate-100", className)} {...rest}>
      {children}
    </tbody>
  );
}

export function Tr({
  children,
  className,
  onClick,
  ...rest
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-slate-50/80",
        onClick && "cursor-pointer active:bg-slate-100/80",
        className,
      )}
      onClick={onClick}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function Th({
  children,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-4 py-3.5 whitespace-nowrap", className)} {...rest}>
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 text-slate-700 whitespace-nowrap align-middle",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
