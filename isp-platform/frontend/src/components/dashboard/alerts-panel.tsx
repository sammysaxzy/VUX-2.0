import { AlertTriangle, Clock3, Siren, TriangleAlert } from "lucide-react";
import type { AlertItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils";

function severityBadge(severity: AlertItem["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "major") return "warning";
  return "info";
}

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-danger" />
          Network Alerts
        </CardTitle>
        <Badge variant="outline">{alerts.length} active</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No active alerts.
          </div>
        ) : null}
        {alerts.slice(0, 6).map((alert) => (
          <div key={alert.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {alert.severity === "critical" ? (
                  <AlertTriangle className="h-4 w-4 text-danger" />
                ) : (
                  <TriangleAlert className="h-4 w-4 text-warning" />
                )}
                {alert.title}
              </div>
              <Badge variant={severityBadge(alert.severity)}>{alert.severity}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {formatRelativeDate(alert.createdAt)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
