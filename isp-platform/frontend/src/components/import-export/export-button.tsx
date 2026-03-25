"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  loadingLabel?: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger";
};

export function ExportButton({
  label,
  loadingLabel = "Exporting...",
  onClick,
  isLoading,
  disabled,
  variant = "outline",
}: Props) {
  return (
    <Button type="button" variant={variant} disabled={disabled || isLoading} onClick={onClick}>
      {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
      {isLoading ? loadingLabel : label}
    </Button>
  );
}

