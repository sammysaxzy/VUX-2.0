import { Activity, Layers3, ShieldCheck, TowerControl } from "lucide-react";
import { useDashboardData } from "@/hooks/api/use-dashboard";
import { useFinanceSummary } from "@/hooks/api/use-finance";
import { useInventorySummary, useWorkOrders } from "@/hooks/api/use-inventory";
import { useFaults } from "@/hooks/api/use-faults";
import { useBusinessIntelligence, useEnterpriseSlaReports, useNocAlerts, useSystemHealth, useUsageAnalytics } from "@/hooks/api/use-operations";
import { getRoleLabel } from "@/lib/isp";
import { formatCurrency, titleCase } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActivityTimeline } from "@/components/field/activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  const financeSummary = useFinanceSummary();
  const inventorySummary = useInventorySummary();
  const workOrders = useWorkOrders();
  const faults = useFaults();
  const slaReports = useEnterpriseSlaReports();
  const nocAlerts = useNocAlerts();
  const usageAnalytics = useUsageAnalytics();
  const systemHealth = useSystemHealth();
  const businessIntelligence = useBusinessIntelligence();
  const branding = useAppStore((state) => state.branding);
  const currentUser = useAppStore((state) => state.user);
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
  const pendingWorkOrders = (workOrders.data ?? []).filter((entry) => entry.status !== "completed").slice(0, 4);
  const activeFaults = (faults.data ?? []).filter((fault) => fault.status !== "resolved");
  const breachedSla = (slaReports.data ?? []).filter((report) => report.breachStatus === "breached").length;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Commercial ISP Control Center</h1>
          <p className="text-sm text-muted-foreground">
            Operational overview for {branding?.ispName ?? "your network"} across CRM, billing, inventory, support, and field operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <TowerControl className="h-3.5 w-3.5" />
            Tenant: {branding?.tenantId}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Role: {getRoleLabel(currentUser?.role)}
          </Badge>
        </div>
      </div>

      <KpiCards kpis={kpis} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Commercial Readiness Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <DashboardFact label="Total Income" value={formatCurrency(financeSummary.data?.total_income ?? 0)} />
            <DashboardFact label="Total Expenses" value={formatCurrency(financeSummary.data?.total_expenses ?? 0)} />
            <DashboardFact label="Cash Flow" value={formatCurrency(financeSummary.data?.cash_flow ?? 0)} />
            <DashboardFact label="Inventory Value" value={formatCurrency(inventorySummary.data?.inventory_value ?? 0)} />
            <DashboardFact label="Low Stock Items" value={`${inventorySummary.data?.low_stock_items ?? 0}`} />
            <DashboardFact label="Pending Usage Approvals" value={`${inventorySummary.data?.pending_approvals ?? 0}`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network Risk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="rounded-2xl border border-border/70 p-3">
              Open faults: <span className="font-semibold">{activeFaults.length}</span>
            </p>
            <p className="rounded-2xl border border-border/70 p-3">
              Realtime alerts: <span className="font-semibold">{alerts.length + (nocAlerts.data?.length ?? 0)}</span>
            </p>
            <p className="rounded-2xl border border-border/70 p-3">
              Customer risk posture:
              <span className="ml-1 font-semibold">{activeFaults.length > 0 ? "Needs intervention" : "Stable"}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Field Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingWorkOrders.map((workOrder) => (
              <div key={workOrder.id} className="rounded-2xl border border-border/70 p-3">
                <p className="font-medium">{workOrder.title}</p>
                <p className="text-xs text-muted-foreground">{workOrder.work_order_code}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={workOrder.status === "in_progress" ? "warning" : "outline"}>{titleCase(workOrder.status)}</Badge>
                  <Badge variant={workOrder.priority === "critical" ? "danger" : "outline"}>
                    {titleCase(workOrder.priority ?? "medium")}
                  </Badge>
                </div>
              </div>
            ))}
            {!pendingWorkOrders.length ? <p className="text-sm text-muted-foreground">No open field jobs.</p> : null}
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

      <div className="grid gap-4 xl:grid-cols-4">
        <DashboardFactCard
          title="SLA Breaches"
          value={`${breachedSla}`}
          note="Enterprise and dedicated customers outside target uptime."
        />
        <DashboardFactCard
          title="Peak Usage"
          value={`${usageAnalytics.data?.peakUsageMbps ?? 0} Mbps`}
          note={`Peak window ${usageAnalytics.data?.peakHourWindow ?? "pending analytics"}`}
        />
        <DashboardFactCard
          title="Critical NOC Alerts"
          value={`${(nocAlerts.data ?? []).filter((item) => item.severity === "critical").length}`}
          note="Weak optical power, latency, packet loss, and device events."
        />
        <DashboardFactCard
          title="System Health"
          value={titleCase(systemHealth.data?.serverStatus ?? "unknown")}
          note={`Failed jobs: ${systemHealth.data?.failedJobs ?? 0} | Queue: ${systemHealth.data?.queueStatus ?? "unknown"}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <DashboardFactCard title="MRR" value={formatCurrency(businessIntelligence.data?.mrr ?? 0)} note="Monthly recurring revenue" />
        <DashboardFactCard title="ARR" value={formatCurrency(businessIntelligence.data?.arr ?? 0)} note="Annual recurring revenue" />
        <DashboardFactCard title="ARPU" value={formatCurrency(businessIntelligence.data?.arpu ?? 0)} note="Average revenue per user" />
        <DashboardFactCard title="Churn Rate" value={`${businessIntelligence.data?.churnRate ?? 0}%`} note="Current churn exposure" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-primary" />
            Selling Points for Demo Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <p className="rounded-2xl border border-border/70 p-4">CRM records combine service, billing, optical, and field ownership in one profile.</p>
          <p className="rounded-2xl border border-border/70 p-4">Technician work orders, inventory deductions, and finance records now support a cleaner commercial operations story.</p>
          <p className="rounded-2xl border border-border/70 p-4">Paystack, WhatsApp, and backend automations remain API-ready with placeholders instead of fake live integrations.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardFactCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function DashboardFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
