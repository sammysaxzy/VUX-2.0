import { Activity, TowerControl } from "lucide-react";
import { useDashboardData } from "@/hooks/api/use-dashboard";
import { useFinanceSummary } from "@/hooks/api/use-finance";
import { useInventorySummary } from "@/hooks/api/use-inventory";
import { useAppStore } from "@/store/app-store";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActivityTimeline } from "@/components/field/activity-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Badge } from "@/components/ui/badge";

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  const financeSummary = useFinanceSummary();
  const inventorySummary = useInventorySummary();
  const branding = useAppStore((state) => state.branding);
  const realtimeKpis = useAppStore((state) => state.realtimeKpis);
  const realtimeAlerts = useAppStore((state) => state.realtimeAlerts);
  const realtimeActivity = useAppStore((state) => state.recentActivity);

  if (isLoading) return <PageSkeleton />;

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-danger">Unable to load dashboard.</p>
          <button className="mt-3 text-sm text-primary underline" onClick={() => refetch()}>
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const kpis = { ...data.kpis, ...realtimeKpis };
  const alerts = [...realtimeAlerts, ...data.alerts];
  const activity = [...realtimeActivity, ...data.activities];

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">NOC Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live tenant view for {branding?.ispName ?? "your network"}.</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <TowerControl className="h-3.5 w-3.5" />
          tenant: {branding?.tenantId}
        </Badge>
      </div>

      <KpiCards kpis={kpis} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Expense Windows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Today: <span className="font-medium">NGN {(financeSummary.data?.expenses_today ?? 0).toLocaleString()}</span></p>
            <p>This Week: <span className="font-medium">NGN {(financeSummary.data?.expenses_this_week ?? 0).toLocaleString()}</span></p>
            <p>This Month: <span className="font-medium">NGN {(financeSummary.data?.expenses_this_month ?? 0).toLocaleString()}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Most Used Materials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(inventorySummary.data?.most_used_items ?? []).slice(0, 4).map((item) => (
              <p key={item.item_id}>
                {item.name}: <span className="font-medium">{item.quantity_used}</span>
              </p>
            ))}
            {!(inventorySummary.data?.most_used_items?.length ?? 0) ? <p className="text-muted-foreground">No material usage yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Low Stock Items: <span className="font-medium">{inventorySummary.data?.low_stock_items ?? 0}</span></p>
            <p>Pending Usage Approvals: <span className="font-medium">{inventorySummary.data?.pending_approvals ?? 0}</span></p>
            <p>Recent Inventory Movements: <span className="font-medium">{inventorySummary.data?.recent_movements.length ?? 0}</span></p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <AlertsPanel alerts={alerts} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Engineer Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={activity.slice(0, 6)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
