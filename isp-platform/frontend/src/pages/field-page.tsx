import { useSplicingActivities } from "@/hooks/api/use-network";
import { ActivityTimeline } from "@/components/field/activity-timeline";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export function FieldPage() {
  const { data, isLoading } = useSplicingActivities();

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold">Field Engineer Module</h1>
        <p className="text-sm text-muted-foreground">Installations, splicing work, and repair timelines with GPS markers.</p>
      </div>
      <ActivityTimeline activities={data} />
    </div>
  );
}
