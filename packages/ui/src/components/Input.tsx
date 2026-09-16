import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, hint, className, ...rest }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs transition-colors",
            "placeholder:text-slate-400 focus:outline-hidden focus:ring-2",
            error
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-500/20",
            "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            className,
          )}
          {...rest}
        />
        {error && (
          <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
        )}
        {!error && hint && (
          <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
