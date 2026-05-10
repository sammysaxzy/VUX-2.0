import { Activity, Cable, Coins, ServerCrash, TriangleAlert, Users, Wallet } from "lucide-react";
import type { KpiSnapshot } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { numberWithCommas } from "@/lib/utils";

type Props = {
  kpis: KpiSnapshot;
};

const items = [
  { key: "activeCustomers", title: "Active Customers", icon: Users, description: "Customers with active subscriptions" },
  { key: "offlineCustomers", title: "Offline Customers", icon: ServerCrash, description: "Currently unreachable endpoints" },
  { key: "totalOlts", title: "Total OLTs", icon: Cable, description: "Optical line terminals in tenant network" },
  { key: "activeRadiusSessions", title: "Active Sessions", icon: Activity, description: "Live authenticated PPPoE sessions" },
  { key: "inventoryValue", title: "Inventory Value", icon: Coins, description: "Current stock value at cost price" },
  { key: "netProfit", title: "Net Profit", icon: Wallet, description: "Income minus expenses for the current ledger" },
  { key: "lowStockItems", title: "Low Stock", icon: TriangleAlert, description: "Items that need immediate replenishment" },
] as const;

export function KpiCards({ kpis }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
      {items.map((item) => {
        const Icon = item.icon;
        const value = kpis[item.key];
        return (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <div className="rounded-lg bg-primary/15 p-2 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{numberWithCommas(value)}</div>
              <CardDescription className="mt-1">{item.description}</CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
