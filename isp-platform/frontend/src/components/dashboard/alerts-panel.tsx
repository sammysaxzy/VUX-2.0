import { AlertTriangle, ArrowRight, Clock3, Siren, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AlertItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatRelativeDate } from "@/lib/utils";

function severityBadge(severity: AlertItem["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "major") return "warning";
  return "info";
}

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  const navigate = useNavigate();
  const visibleAlerts = alerts.slice(0, 4);

  return (
    <Card className="h-full rounded-3xl border border-border/70 bg-card/88">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Siren className="h-4 w-4 text-danger" />
          Live Alerts
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{alerts.length} active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No active alerts.
          </div>
        ) : null}
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate("/faults")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate("/faults");
              }
            }}
            className={cn(
              "rounded-2xl border border-border/70 bg-background/55 p-4",
              "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            )}
          >
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
        {alerts.length > visibleAlerts.length ? (
          <button
            type="button"
            onClick={() => navigate("/faults")}
            className="flex items-center text-sm font-medium text-primary transition hover:text-primary/80"
          >
            View all alerts
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
