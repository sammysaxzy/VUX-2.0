"use client";

import { Button } from "@/components/ui/button";
import type { RadiusTab } from "@/types";

const tabs: { key: RadiusTab; label: string }[] = [
  { key: "sessions", label: "Sessions" },
  { key: "users", label: "Users" },
  { key: "plans", label: "Plans" },
  { key: "settings", label: "Settings" },
];

type RadiusTabsProps = {
  value: RadiusTab;
  onChange: (tab: RadiusTab) => void;
};

export function RadiusTabs({ value, onChange }: RadiusTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.key}
          variant={value === tab.key ? "secondary" : "ghost"}
          size="sm"
          type="button"
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
