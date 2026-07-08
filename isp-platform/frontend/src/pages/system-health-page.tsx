import type { ReactNode } from "react";
import { ActivitySquare, Database, Link2, ShieldCheck, Server } from "lucide-react";
import { useBackupStatus, useIntegrations, useSystemHealth } from "@/hooks/api/use-operations";
import { titleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function SystemHealthPage() {
  const systemHealth = useSystemHealth();
  const backupStatus = useBackupStatus();
  const integrations = useIntegrations();

  if (systemHealth.isLoading || backupStatus.isLoading || integrations.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="overflow-hidden rounded-[28px] border border-emerald-200/60 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(135deg,#052e2b,#164e63)] px-6 py-7 text-white shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-100/80">Reliability Console</p>
            <h1 className="mt-2 text-3xl font-semibold">System Health & Integration Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-emerald-50/85">
              Monitor server health, database posture, queue jobs, backups, restore readiness, and external service integrations.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Last Check</p>
            <p className="mt-1 text-sm font-medium">{systemHealth.data?.lastCheckedAt ?? "-"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <HealthCard icon={<Server className="h-4 w-4 text-primary" />} title="Server" value={systemHealth.data?.serverStatus ?? "unknown"} />
        <HealthCard icon={<Database className="h-4 w-4 text-primary" />} title="Database" value={systemHealth.data?.databaseStatus ?? "unknown"} />
        <HealthCard icon={<ActivitySquare className="h-4 w-4 text-primary" />} title="Queue" value={systemHealth.data?.queueStatus ?? "unknown"} />
        <HealthCard icon={<Link2 className="h-4 w-4 text-primary" />} title="API" value={systemHealth.data?.apiStatus ?? "unknown"} />
        <HealthCard icon={<ShieldCheck className="h-4 w-4 text-primary" />} title="Restore Ready" value={backupStatus.data?.restoreReady ? "yes" : "no"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Backup & Data Protection</CardTitle>
            <CardDescription>Database backup status, last backup timestamp, restore placeholder, and security notes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Last backup</p>
              <p className="mt-1 text-muted-foreground">{backupStatus.data?.lastBackupAt}</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium">Retention policy</p>
              <p className="mt-1 text-muted-foreground">{backupStatus.data?.retentionPolicy}</p>
            </div>
            {(backupStatus.data?.securityNotes ?? []).map((note) => (
              <div key={note} className="rounded-2xl border border-border/70 p-4 text-muted-foreground">
                {note}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API / Integration Center</CardTitle>
            <CardDescription>SmartOLT, Paystack, WhatsApp, email, SMS, maps, AI, and other provider connections using environment variables.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(integrations.data ?? []).map((service) => (
              <div key={service.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{service.name}</p>
                  <Badge variant={service.status === "configured" ? "success" : service.status === "attention" ? "danger" : "warning"}>
                    {service.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{titleCase(service.category)}</p>
                <p className="mt-3 text-sm">{service.notes}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {service.envKeys.map((key) => (
                    <Badge key={key} variant="outline">
                      {key}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Background Tasks</CardTitle>
          <CardDescription>High-level placeholder for failed jobs, workers, and scheduler visibility.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
          <div className="rounded-2xl border border-border/70 p-4">Failed jobs: <span className="font-semibold">{systemHealth.data?.failedJobs ?? 0}</span></div>
          <div className="rounded-2xl border border-border/70 p-4">Background tasks: <span className="font-semibold">{systemHealth.data?.backgroundTasks ?? 0}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">{icon}{title}</CardDescription>
        <CardTitle className="text-2xl">{titleCase(value)}</CardTitle>
      </CardHeader>
    </Card>
  );
}
