import { Activity, Cable, Coins, ReceiptText, ServerCrash, ShieldAlert, TriangleAlert, Users, Wallet, Wrench } from "lucide-react";
import type { KpiSnapshot } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, numberWithCommas } from "@/lib/utils";

type Props = {
  kpis: KpiSnapshot;
};

const items = [
  { key: "totalCustomers", title: "Total Customers", icon: Users, description: "All subscriber records in this tenant" },
  { key: "activeCustomers", title: "Active Customers", icon: Users, description: "Customers with active subscriptions" },
  { key: "suspendedCustomers", title: "Suspended", icon: ShieldAlert, description: "Accounts held for billing or service reasons" },
  { key: "offlineCustomers", title: "Offline Customers", icon: ServerCrash, description: "Currently unreachable endpoints" },
  { key: "totalOlts", title: "Total OLTs", icon: Cable, description: "Optical line terminals in tenant network" },
  { key: "revenue", title: "Revenue", icon: ReceiptText, description: "Recognized subscription and install income" },
  { key: "overdueInvoices", title: "Overdue Invoices", icon: Wallet, description: "Customers waiting on renewal payment" },
  { key: "openTickets", title: "Open Tickets", icon: Activity, description: "Customer complaints and service issues" },
  { key: "networkFaults", title: "Network Faults", icon: ShieldAlert, description: "Open or investigating outage events" },
  { key: "technicianJobs", title: "Technician Jobs", icon: Wrench, description: "Pending field tasks and maintenance" },
  { key: "inventoryValue", title: "Inventory Value", icon: Coins, description: "Current stock value at cost price" },
  { key: "activeRadiusSessions", title: "Active Sessions", icon: Activity, description: "Live authenticated PPPoE sessions" },
  { key: "netProfit", title: "Net Profit", icon: Wallet, description: "Income minus expenses for the current ledger" },
  { key: "lowStockItems", title: "Low Stock", icon: TriangleAlert, description: "Items that need immediate replenishment" },
] as const;

export function KpiCards({ kpis }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
      {items.map((item) => {
        const Icon = item.icon;
        const value = kpis[item.key];
        const formattedValue =
          item.key === "revenue" || item.key === "inventoryValue" || item.key === "netProfit"
            ? formatCurrency(Number(value ?? 0))
            : numberWithCommas(Number(value ?? 0));
        return (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <div className="rounded-lg bg-primary/15 p-2 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{formattedValue}</div>
              <CardDescription className="mt-1">{item.description}</CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
