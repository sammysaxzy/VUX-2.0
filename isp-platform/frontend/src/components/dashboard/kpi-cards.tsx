import { Activity, ArrowRight, ReceiptText, ServerCrash, Users, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { KpiSnapshot } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, numberWithCommas } from "@/lib/utils";

type Props = {
  kpis: KpiSnapshot;
};

const items = [
  { key: "activeCustomers", title: "Active Customers", icon: Users, description: "Customers with active subscriptions", href: "/customers" },
  { key: "offlineCustomers", title: "Offline Customers", icon: ServerCrash, description: "Currently unreachable endpoints", href: "/network-intelligence" },
  { key: "revenue", title: "Revenue", icon: ReceiptText, description: "Recognized subscription and install income", href: "/finance" },
  { key: "overdueInvoices", title: "Overdue Invoices", icon: Wallet, description: "Customers waiting on renewal payment", href: "/finance" },
  { key: "openTickets", title: "Open Tickets", icon: Activity, description: "Customer complaints and service issues", href: "/faults" },
  { key: "activeRadiusSessions", title: "Active Sessions", icon: Activity, description: "Live authenticated PPPoE sessions", href: "/radius" },
  { key: "netProfit", title: "Net Profit", icon: Wallet, description: "Income minus expenses for the current ledger", href: "/finance" },
] as const;

export function KpiCards({ kpis }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const value = kpis[item.key];
        const formattedValue =
          item.key === "revenue" || item.key === "netProfit"
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
              "group cursor-pointer rounded-3xl border border-border/70 bg-card/85 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium text-foreground/90">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
              <div className="rounded-2xl bg-primary/12 p-3 text-primary transition group-hover:bg-primary/16">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-3">
              <div className="text-3xl font-semibold tracking-tight text-foreground">{formattedValue}</div>
              <div className="flex items-center text-[11px] font-medium uppercase tracking-[0.18em] text-primary/85">
                View
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
