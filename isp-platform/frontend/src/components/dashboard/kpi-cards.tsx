import { Activity, ArrowRight, Cable, Coins, ReceiptText, ServerCrash, ShieldAlert, TriangleAlert, Users, Wallet, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { KpiSnapshot } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, numberWithCommas } from "@/lib/utils";

type Props = {
  kpis: KpiSnapshot;
};

const items = [
  { key: "totalCustomers", title: "Total Customers", icon: Users, description: "All subscriber records in this tenant", href: "/customers" },
  { key: "activeCustomers", title: "Active Customers", icon: Users, description: "Customers with active subscriptions", href: "/customers" },
  { key: "suspendedCustomers", title: "Suspended", icon: ShieldAlert, description: "Accounts held for billing or service reasons", href: "/customers" },
  { key: "offlineCustomers", title: "Offline Customers", icon: ServerCrash, description: "Currently unreachable endpoints", href: "/network-intelligence" },
  { key: "totalOlts", title: "Total OLTs", icon: Cable, description: "Optical line terminals in tenant network", href: "/infrastructure" },
  { key: "revenue", title: "Revenue", icon: ReceiptText, description: "Recognized subscription and install income", href: "/finance" },
  { key: "overdueInvoices", title: "Overdue Invoices", icon: Wallet, description: "Customers waiting on renewal payment", href: "/finance" },
  { key: "openTickets", title: "Open Tickets", icon: Activity, description: "Customer complaints and service issues", href: "/faults" },
  { key: "networkFaults", title: "Network Faults", icon: ShieldAlert, description: "Open or investigating outage events", href: "/faults" },
  { key: "technicianJobs", title: "Technician Jobs", icon: Wrench, description: "Pending field tasks and maintenance", href: "/field" },
  { key: "inventoryValue", title: "Inventory Value", icon: Coins, description: "Current stock value at cost price", href: "/inventory" },
  { key: "activeRadiusSessions", title: "Active Sessions", icon: Activity, description: "Live authenticated PPPoE sessions", href: "/radius" },
  { key: "netProfit", title: "Net Profit", icon: Wallet, description: "Income minus expenses for the current ledger", href: "/finance" },
  { key: "lowStockItems", title: "Low Stock", icon: TriangleAlert, description: "Items that need immediate replenishment", href: "/inventory" },
] as const;

export function KpiCards({ kpis }: Props) {
  const navigate = useNavigate();

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
          <Card
            key={item.key}
            role="button"
            tabIndex={0}
            onClick={() => navigate(item.href)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(item.href);
              }
            }}
            className={cn(
              "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <div className="rounded-lg bg-primary/15 p-2 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-center justify-end text-[11px] font-medium text-primary">
                <span>Open module</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
              <div className="text-2xl font-semibold tracking-tight">{formattedValue}</div>
              <CardDescription className="mt-1">{item.description}</CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
