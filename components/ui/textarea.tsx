"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "peer flex min-h-[92px] w-full rounded-2xl border px-4 py-4 text-sm outline-none transition-all",
          "border-[color:var(--line)] bg-[rgba(var(--surface-rgb),0.55)] text-[color:var(--foreground)]",
          "placeholder:text-transparent",
          "focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[rgba(var(--accent-rgb),0.16)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
