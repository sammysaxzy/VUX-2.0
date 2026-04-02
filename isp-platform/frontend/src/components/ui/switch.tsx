"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
};

export function Switch({ checked, onCheckedChange, className, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 items-center rounded-full border border-border transition disabled:pointer-events-none disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}
