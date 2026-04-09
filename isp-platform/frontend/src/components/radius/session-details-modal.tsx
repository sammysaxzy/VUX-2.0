import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetricsCard } from "@/components/radius/metrics-card";
import { TrafficChart } from "@/components/radius/traffic-chart";
import { useSessionMetrics } from "@/hooks/api/use-session-metrics";
import { formatBytes, formatRelativeDate } from "@/lib/utils";

type Props = {
  open: boolean;
  username?: string;
  onOpenChange: (open: boolean) => void;
};

export function SessionDetailsModal({ open, username, onOpenChange }: Props) {
  const { detailsQuery, trafficQuery, isLoading, isFetching } = useSessionMetrics({
    username,
    minutes: 10,
    enabled: open && Boolean(username),
  });

  const details = detailsQuery.data;
  const traffic = trafficQuery.data ?? [];
  const uploadBytes = details?.uploadBytes ?? 0;
  const downloadBytes = details?.downloadBytes ?? 0;
  const totalBytes = uploadBytes + downloadBytes;
  const offline = details?.status === "offline";

  return (
    <Dialog
      open={open}
      title={details?.username ? `Session Details: ${details.username}` : "Session Details"}
      description="Live session metrics, usage, and recent traffic trend."
      onOpenChange={onOpenChange}
      className="max-w-5xl"
    >
      {isLoading || !details ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1 text-sm">
              <p><span className="text-muted-foreground">Username:</span> {details.username}</p>
              <p><span className="text-muted-foreground">Customer ID:</span> {details.customerId ?? "-"}</p>
              <p><span className="text-muted-foreground">IP Address:</span> {details.ipAddress}</p>
              <p><span className="text-muted-foreground">NAS / Router:</span> {details.nas}</p>
              <p><span className="text-muted-foreground">Start Time:</span> {formatRelativeDate(details.startTime)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={offline ? "outline" : "success"}>{details.status}</Badge>
              {isFetching ? <Badge variant="outline">Refreshing</Badge> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricsCard label="Download Usage" value={formatBytes(downloadBytes)} />
            <MetricsCard label="Upload Usage" value={formatBytes(uploadBytes)} />
            <MetricsCard label="Total Data Used" value={formatBytes(totalBytes)} />
            <MetricsCard label="Session Uptime" value={details.duration} helper={offline ? "Session ended" : "Live session"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Traffic Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrafficChart points={traffic} offline={offline} />
            </CardContent>
          </Card>
        </div>
      )}
    </Dialog>
  );
}
