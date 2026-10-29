import { Activity, ArrowRight, Layers3, ShieldCheck, Siren, Sparkles, TowerControl, Wallet, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/api/use-dashboard";
import { useFinanceSummary } from "@/hooks/api/use-finance";
import { useInventorySummary, useWorkOrders } from "@/hooks/api/use-inventory";
import { useFaults } from "@/hooks/api/use-faults";
import { useBusinessIntelligence, useEnterpriseSlaReports, useNocAlerts, useSystemHealth, useUsageAnalytics } from "@/hooks/api/use-operations";
import { getRoleLabel } from "@/lib/isp";
import { cn, formatCurrency, titleCase } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActivityTimeline } from "@/components/field/activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function DashboardPage() {
  const navigate = useNavigate();
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
  const criticalNocAlerts = (nocAlerts.data ?? []).filter((item) => item.severity === "critical").length;
  const combinedAlertCount = alerts.length + (nocAlerts.data?.length ?? 0);
  const todaysOutlook =
    activeFaults.length > 0
      ? "Service risk needs attention across field and support queues."
      : "Network posture is stable and the commercial desk is clear for collections.";

  const getCardProps = (href: string) => ({
    role: "button" as const,
    tabIndex: 0,
    onClick: () => navigate(href),
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate(href);
      }
    },
    className: cn(
      "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
    ),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden rounded-[28px] border border-border/70 bg-card/92 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.4)]">
          <CardContent className="relative p-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_38%),radial-gradient(circle_at_88%_16%,rgba(14,165,233,0.14),transparent_30%)]" />
            <div className="relative grid gap-8 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1 border-primary/20 bg-background/65">
                    <TowerControl className="h-3.5 w-3.5" />
                    {branding?.tenantId ?? "tenant"}
                  </Badge>
                  <Badge variant="outline" className="gap-1 border-primary/20 bg-background/65">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {getRoleLabel(currentUser?.role)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/85">Control Center</p>
                  <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                    A clearer command view for {branding?.ispName ?? "your ISP"}.
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Focus on the few signals that matter first: customer health, cash position, service risk, and field momentum.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <ExecutiveStat
                    label="Recurring Revenue"
                    value={formatCurrency(businessIntelligence.data?.mrr ?? 0)}
                    note="Monthly run-rate"
                  />
                  <ExecutiveStat
                    label="Cash Flow"
                    value={formatCurrency(financeSummary.data?.cash_flow ?? 0)}
                    note="Collections less expenses"
                  />
                  <ExecutiveStat
                    label="Network Alerts"
                    value={`${combinedAlertCount}`}
                    note={activeFaults.length > 0 ? "Requires review" : "Under control"}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-[26px] border border-border/60 bg-background/72 p-5 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Today&apos;s outlook
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{todaysOutlook}</p>
                <div className="space-y-2">
                  <PriorityRow label="Open faults" value={`${activeFaults.length}`} />
                  <PriorityRow label="Pending field jobs" value={`${pendingWorkOrders.length}`} />
                  <PriorityRow label="Overdue invoices" value={`${kpis.overdueInvoices ?? 0}`} />
                  <PriorityRow label="SLA breaches" value={`${breachedSla}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card {...getCardProps("/finance")} className="rounded-[28px] border border-border/70 bg-card/90">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span>Revenue Pulse</span>
              <ArrowRight className="h-4 w-4 text-primary" />
            </CardTitle>
            <CardDescription>Commercial performance at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FeatureMetric
              label="Total income"
              value={formatCurrency(financeSummary.data?.total_income ?? 0)}
              tone="primary"
            />
            <FeatureMetric
              label="Net profit"
              value={formatCurrency(kpis.netProfit ?? 0)}
            />
            <FeatureMetric
              label="Inventory value"
              value={formatCurrency(inventorySummary.data?.inventory_value ?? 0)}
            />
          </CardContent>
        </Card>
      </section>

      <KpiCards kpis={kpis} />

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <DashboardSurface
          title="Service Risk"
          description="Customer-facing risk and issue volume."
          href="/network-intelligence"
          icon={<Siren className="h-4 w-4 text-danger" />}
          lines={[
            { label: "Open faults", value: `${activeFaults.length}` },
            { label: "Critical NOC alerts", value: `${criticalNocAlerts}` },
            { label: "Offline customers", value: `${kpis.offlineCustomers ?? 0}` },
          ]}
        />
        <DashboardSurface
          title="Field Readiness"
          description="Jobs and team execution status."
          href="/field"
          icon={<Wrench className="h-4 w-4 text-primary" />}
          lines={[
            { label: "Pending jobs", value: `${pendingWorkOrders.length}` },
            { label: "Technician jobs", value: `${kpis.technicianJobs ?? 0}` },
            { label: "Low stock items", value: `${inventorySummary.data?.low_stock_items ?? 0}` },
          ]}
        />
        <DashboardSurface
          title="Commercial Health"
          description="Collections, debt, and customer value."
          href="/enterprise-readiness"
          icon={<Wallet className="h-4 w-4 text-primary" />}
          lines={[
            { label: "ARR", value: formatCurrency(businessIntelligence.data?.arr ?? 0) },
            { label: "ARPU", value: formatCurrency(businessIntelligence.data?.arpu ?? 0) },
            { label: "Churn rate", value: `${businessIntelligence.data?.churnRate ?? 0}%` },
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div {...getCardProps("/faults")}>
          <AlertsPanel alerts={alerts} />
        </div>
        <Card {...getCardProps("/field")} className="rounded-[28px] border border-border/70 bg-card/88">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Engineer Timeline
            </CardTitle>
            <CardDescription>Recent operational activity across the team.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={activity.slice(0, 5)} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[28px] border border-border/70 bg-card/88">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              Strategic Watchlist
            </CardTitle>
            <CardDescription>The next things leadership should care about.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <WatchlistItem
              title="Enterprise SLA"
              body={`${breachedSla} breached account${breachedSla === 1 ? "" : "s"} need attention before renewal conversations.`}
            />
            <WatchlistItem
              title="Usage Pressure"
              body={`Peak usage is ${usageAnalytics.data?.peakUsageMbps ?? 0} Mbps during ${usageAnalytics.data?.peakHourWindow ?? "the latest observed window"}.`}
            />
            <WatchlistItem
              title="Platform Health"
              body={`Server is ${titleCase(systemHealth.data?.serverStatus ?? "unknown")} with ${systemHealth.data?.failedJobs ?? 0} failed background jobs.`}
            />
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border/70 bg-card/88">
          <CardHeader>
            <CardTitle>Quick Route</CardTitle>
            <CardDescription>Move straight into the module that needs attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickRoute label="Finance and invoices" href="/finance" />
            <QuickRoute label="Faults and support" href="/faults" />
            <QuickRoute label="Field operations" href="/field" />
            <QuickRoute label="Customer accounts" href="/customers" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ExecutiveStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[22px] border border-border/60 bg-background/72 p-4 backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function PriorityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/70 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function FeatureMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className={cn("rounded-[22px] border border-border/70 p-4", tone === "primary" && "bg-primary/[0.08]")}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function DashboardSurface({
  title,
  description,
  href,
  icon,
  lines,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  lines: Array<{ label: string; value: string }>;
}) {
  const navigate = useNavigate();

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(href);
        }
      }}
      className="rounded-[28px] border border-border/70 bg-card/88 transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <ArrowRight className="h-4 w-4 text-primary" />
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lines.map((line) => (
          <div key={line.label} className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
            <span className="text-sm text-muted-foreground">{line.label}</span>
            <span className="text-sm font-semibold text-foreground">{line.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function WatchlistItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background/55 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function QuickRoute({ label, href }: { label: string; href: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-background/55 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <ArrowRight className="h-4 w-4 text-primary" />
    </button>
  );
}
