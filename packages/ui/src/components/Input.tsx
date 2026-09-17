"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";
import { EyeIcon, EyeSlashIcon } from "./Icons";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, hint, className, type, ...rest }, ref) => {
    const [revealed, setRevealed] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && revealed ? "text" : type;

    return (
      <div className="w-full">
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-xs transition-colors",
              "placeholder:text-slate-400 focus:outline-hidden focus:ring-2",
              error
                ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-slate-300 hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-500/20",
              "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
              isPassword && "pr-10",
              className,
            )}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={revealed ? "Hide password" : "Show password"}
            >
              {revealed ? (
                <EyeSlashIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
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
