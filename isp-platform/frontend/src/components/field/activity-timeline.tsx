import { Construction, Router, Wrench } from "lucide-react";
import type { EngineerActivity } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils";

function iconForType(type: EngineerActivity["type"]) {
  if (type === "splicing") return Router;
  if (type === "fault_repair") return Wrench;
  return Construction;
}

export function ActivityTimeline({ activities }: { activities: EngineerActivity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Engineer Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = iconForType(activity.type);
            return (
              <div key={activity.id} className="flex gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="mt-0.5 rounded-lg bg-primary/15 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-sm font-medium">{activity.engineerName}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeDate(activity.timestamp)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{activity.note}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    GPS: {activity.location.lat.toFixed(5)}, {activity.location.lng.toFixed(5)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
