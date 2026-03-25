"use client";

import { ConfigurationMenu } from "@/components/settings/configuration-menu";
import { SettingsLayout } from "@/components/settings/settings-layout";

export function ConfigurationMenuPage() {
  return (
    <SettingsLayout
      activeTab="configuration"
      summary="9 configuration modules"
      description="Manage global system behavior for portal experience, communications, automation, billing, and integrations."
    >
      <ConfigurationMenu />
    </SettingsLayout>
  );
}

