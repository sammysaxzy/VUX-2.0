"use client";

import { ConfigItemCard } from "@/components/settings/config-item-card";
import { configurationItems } from "@/components/settings/configuration-items";

export function ConfigurationMenu() {
  return (
    <div className="grid gap-4">
      {configurationItems.map((item) => (
        <ConfigItemCard
          key={item.slug}
          title={item.label}
          description={item.description}
          href={`/settings/configuration/${item.slug}`}
          icon={item.icon}
        />
      ))}
    </div>
  );
}

