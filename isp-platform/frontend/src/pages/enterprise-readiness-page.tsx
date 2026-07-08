import {
  useBusinessIntelligence,
  useDeveloperPortal,
  useDisasterRecovery,
  useLaunchReadiness,
  useLicenseSubscription,
  useLocalizationSettings,
  usePluginCatalog,
} from "@/hooks/api/use-operations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { formatCurrency } from "@/lib/utils";

export function EnterpriseReadinessPage() {
  const bi = useBusinessIntelligence();
  const dr = useDisasterRecovery();
  const developerPortal = useDeveloperPortal();
  const plugins = usePluginCatalog();
  const localization = useLocalizationSettings();
  const license = useLicenseSubscription();
  const readiness = useLaunchReadiness();

  if (
    bi.isLoading ||
    dr.isLoading ||
    developerPortal.isLoading ||
    plugins.isLoading ||
    localization.isLoading ||
    license.isLoading ||
    readiness.isLoading
  ) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Enterprise Readiness</h1>
        <p className="text-sm text-muted-foreground">
          Executive BI, disaster recovery, developer portal, plugin architecture, localization, licensing, and final launch review for VUX.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <MetricCard title="MRR" value={formatCurrency(bi.data?.mrr ?? 0)} note="Monthly recurring revenue" />
        <MetricCard title="ARR" value={formatCurrency(bi.data?.arr ?? 0)} note="Annual recurring revenue" />
        <MetricCard title="ARPU" value={formatCurrency(bi.data?.arpu ?? 0)} note="Average revenue per user" />
        <MetricCard title="LTV" value={formatCurrency(bi.data?.ltv ?? 0)} note="Lifetime value projection" />
        <MetricCard title="Churn" value={`${bi.data?.churnRate ?? 0}%`} note="Current churn rate" />
        <MetricCard title="Growth" value={`${bi.data?.customerGrowthPercent ?? 0}%`} note="Customer growth" />
        <MetricCard title="Ticket Trend" value={`${bi.data?.ticketTrendPercent ?? 0}%`} note="Month-over-month movement" />
        <MetricCard title="Technician Score" value={`${bi.data?.technicianPerformancePercent ?? 0}%`} note="Job performance score" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Coverage Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(bi.data?.revenueByArea ?? []).map((entry) => (
              <div key={entry.area} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{entry.area}</p>
                  <p className="text-lg font-semibold">{formatCurrency(entry.revenue)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disaster Recovery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Backup health: <Badge variant={dr.data?.backupHealth === "critical" ? "danger" : dr.data?.backupHealth === "warning" ? "warning" : "success"}>{dr.data?.backupHealth}</Badge></p>
            <p>Failover readiness: <Badge variant={dr.data?.failoverReadiness === "not_ready" ? "danger" : dr.data?.failoverReadiness === "partial" ? "warning" : "success"}>{dr.data?.failoverReadiness?.replace(/_/g, " ")}</Badge></p>
            <p>Restore tested: {dr.data?.restoreTestedAt ? new Date(dr.data.restoreTestedAt).toLocaleDateString() : "Pending"}</p>
            <p>Recovery status: {dr.data?.recoveryStatus}</p>
            <div className="space-y-2">
              {(dr.data?.notes ?? []).map((note) => (
                <div key={note} className="rounded-xl border border-border/70 p-3 text-muted-foreground">
                  {note}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>API & Developer Portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{developerPortal.data?.apiBaseUrl}</p>
            <div className="flex flex-wrap gap-2">
              {(developerPortal.data?.authentication ?? []).map((item) => (
                <Badge key={item} variant="outline">{item.replace(/_/g, " ")}</Badge>
              ))}
            </div>
            <p>Documentation status: <span className="font-medium">{developerPortal.data?.docsStatus}</span></p>
            <div className="space-y-1 text-muted-foreground">
              {(developerPortal.data?.exampleCollections ?? []).map((entry) => (
                <p key={entry}>{entry}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Marketplace / Plugin System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(plugins.data ?? []).map((plugin) => (
              <div key={plugin.id} className="rounded-2xl border border-border/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{plugin.name}</p>
                  <Badge variant={plugin.status === "installed" ? "success" : plugin.status === "beta" ? "warning" : "outline"}>{plugin.status}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{plugin.category}</p>
                <p className="mt-2 text-muted-foreground">{plugin.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Localization & Regional Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Currencies: {(localization.data?.currencies ?? []).join(", ")}</p>
            <p>Time zones: {(localization.data?.timezones ?? []).join(", ")}</p>
            <p>Languages: {(localization.data?.languages ?? []).join(", ")}</p>
            <p>Tax mode: {localization.data?.taxMode}</p>
            <p>Formats: {(localization.data?.regionalFormats ?? []).join(", ")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>License & Subscription Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Tenant: <span className="font-medium">{license.data?.tenantName}</span></p>
            <p>Tier: <span className="font-medium">{license.data?.licenseTier}</span></p>
            <p>Billing cycle: <span className="font-medium">{license.data?.billingCycle}</span></p>
            <p>Active seats: <span className="font-medium">{license.data?.activeSeats} / {license.data?.seatLimit}</span></p>
            <p>Storage: <span className="font-medium">{license.data?.storageUsedGb} GB / {license.data?.storageLimitGb} GB</span></p>
            <div className="flex flex-wrap gap-2">
              {(license.data?.enabledModules ?? []).map((module) => (
                <Badge key={module} variant="outline">{module}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Enterprise Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Launch score</p>
              <p className="mt-1 text-3xl font-semibold">{readiness.data?.score ?? 0}/100</p>
            </div>
            <ReviewList title="Completed" items={readiness.data?.completed ?? []} />
            <ReviewList title="Remaining" items={readiness.data?.remaining ?? []} />
            <ReviewList title="Security Risks" items={readiness.data?.securityRisks ?? []} />
            <ReviewList title="Performance Notes" items={readiness.data?.performanceNotes ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, note }: { title: string; value: string; note: string }) {
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

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-border/70 p-3 text-muted-foreground">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
