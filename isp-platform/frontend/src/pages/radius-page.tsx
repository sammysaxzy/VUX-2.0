import { useDisconnectSession, useRadiusSessions, useSuspendAccount } from "@/hooks/api/use-radius";
import { RadiusSessionTable } from "@/components/radius/radius-session-table";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function RadiusPage() {
  const { data, isLoading } = useRadiusSessions();
  const disconnectMutation = useDisconnectSession();
  const suspendMutation = useSuspendAccount();

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">RADIUS Session Control</h1>
        <p className="text-sm text-muted-foreground">Disconnect PPPoE sessions and suspend accounts in real-time.</p>
      </div>
      <RadiusSessionTable
        sessions={data}
        busyId={disconnectMutation.variables ?? suspendMutation.variables}
        onDisconnect={(sessionId) => disconnectMutation.mutate(sessionId)}
        onSuspend={(customerId) => suspendMutation.mutate(customerId)}
      />
    </div>
  );
}
