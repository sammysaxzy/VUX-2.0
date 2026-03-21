"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  side?: "right" | "left";
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Drawer({
  open,
  title,
  description,
  side = "right",
  onOpenChange,
  children,
}: DrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm dark:bg-black/50">
      <button className="absolute inset-0 h-full w-full cursor-default" onClick={() => onOpenChange(false)} />
      <div
        className={cn(
          "absolute top-0 h-full w-full max-w-md border-gray-200 bg-white p-5 shadow-soft dark:border-border dark:bg-card",
          side === "right" ? "right-0 border-l" : "left-0 border-r",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-4rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
