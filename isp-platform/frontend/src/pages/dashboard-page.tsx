import { Activity, TowerControl } from "lucide-react";
import { useDashboardData } from "@/hooks/api/use-dashboard";
import { useAppStore } from "@/store/app-store";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActivityTimeline } from "@/components/field/activity-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Badge } from "@/components/ui/badge";

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardData();
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
