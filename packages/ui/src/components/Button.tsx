"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 shadow-sm shadow-indigo-500/20 focus-visible:outline-indigo-600 border border-transparent",
  ghost:
    "text-slate-700 hover:bg-slate-100 active:bg-slate-200 border border-transparent",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-sm shadow-rose-500/20 focus-visible:outline-rose-600 border border-transparent",
  outline:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100 shadow-sm",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-base rounded-lg gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && (
          <span
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </button>
    );
  },
);

Button.displayName = "Button";
