"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener("cancel", handler);
    return () => el.removeEventListener("cancel", handler);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-0 m-auto z-50 p-4 bg-transparent border-none outline-hidden",
        "backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs",
        "w-full",
        sizeStyles[size],
        className,
      )}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-desc" : undefined}
    >
      <div
        className="w-full bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id="modal-desc" className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            className="text-slate-400 hover:text-slate-700 rounded-lg p-1.5 hover:bg-slate-100 transition-colors cursor-pointer text-base leading-none"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {children && (
          <div className="px-6 py-6 overflow-y-auto max-h-[70vh] text-sm text-slate-700">
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
