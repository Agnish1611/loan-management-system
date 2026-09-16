import { type LabelHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, required, className, ...rest }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5",
        className,
      )}
      {...rest}
    >
      {children}
      {required && (
        <span className="text-rose-500 ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
