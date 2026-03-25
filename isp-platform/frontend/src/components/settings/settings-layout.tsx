"use client";

import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { SettingsTab } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const tabs: { key: SettingsTab; label: string; href: string }[] = [
  { key: "nas", label: "NAS Management", href: "/settings?tab=nas" },
  { key: "zones", label: "Zone Management", href: "/settings?tab=zones" },
  { key: "permissions", label: "Permissions", href: "/settings?tab=permissions" },
  { key: "services", label: "Services", href: "/settings?tab=services" },
  { key: "logs", label: "Logs", href: "/settings?tab=logs" },
  { key: "configuration", label: "Configuration", href: "/settings/configuration" },
];

type Props = {
  activeTab: SettingsTab;
  summary: string;
  description?: string;
  children: ReactNode;
};

export function SettingsLayout({
  activeTab,
  summary,
  description = "Shared ISP configuration for NAS, zones, access control, bandwidth services, and operational logs.",
  children,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => {
            const isActive =
              tab.key === "configuration"
                ? location.pathname.startsWith("/settings/configuration")
                : activeTab === tab.key && !location.pathname.startsWith("/settings/configuration");

            return (
              <Button
                key={tab.key}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                type="button"
                onClick={() => navigate(tab.href)}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
        <Badge variant="outline">{summary}</Badge>
      </div>

      {children}
    </div>
  );
}

