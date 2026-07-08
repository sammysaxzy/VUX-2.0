import { useOnboardingChecklist } from "@/hooks/api/use-operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const importExportModules = [
  "Customers CSV/Excel import",
  "Leads import/export",
  "Inventory import/export",
  "Invoice export",
  "Payment export",
  "Network assets import/export",
];

export function OnboardingPage() {
  const checklist = useOnboardingChecklist();

  if (checklist.isLoading) return <PageSkeleton />;

  const completed = (checklist.data ?? []).filter((item) => item.completed).length;
  const total = checklist.data?.length ?? 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="overflow-hidden rounded-[28px] border border-sky-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,#082f49,#0f766e)] px-6 py-7 text-white shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-100/80">Launch Sequence</p>
            <h1 className="mt-2 text-3xl font-semibold">ISP Onboarding Wizard</h1>
            <p className="mt-2 max-w-3xl text-sm text-sky-50/85">
              Guided setup for new ISPs covering company profile, coverage, plans, users, payments, maps, and first customer import.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-right backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-100/80">Progress</p>
            <p className="mt-1 text-2xl font-semibold">{completed}/{total}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Coverage Ready" value="Zones loaded" note="Estates, streets, POPs, and service areas can be prepared before go-live." />
        <Metric title="Commercial Setup" value="Plans + billing" note="Packages, payment settings, and invoice defaults align before customer import." />
        <Metric title="Operational Readiness" value="Users + map" note="Roles, integrations, and map services can be validated in one launch flow." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Setup Steps</CardTitle>
            <CardDescription>Presentation-friendly checklist for first-time tenant activation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(checklist.data ?? []).map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-border/70 p-4">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant={item.completed ? "success" : "warning"}>{item.completed ? "Completed" : "Pending"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import / Export Center</CardTitle>
              <CardDescription>CSV and Excel-ready structure for commercial onboarding and ongoing operations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {importExportModules.map((item) => (
                <div key={item} className="rounded-2xl border border-border/70 p-3 text-sm">
                  {item}
                </div>
              ))}
              <Button className="w-full" variant="outline">Open import templates</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>First Week Guidance</CardTitle>
              <CardDescription>Recommended path for live tenant rollout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-border/70 p-4">1. Finish company and billing setup before inviting operational users.</div>
              <div className="rounded-2xl border border-border/70 p-4">2. Load coverage areas, plans, and service assets before customer import.</div>
              <div className="rounded-2xl border border-border/70 p-4">3. Connect payment, messaging, map, and AI services with backend environment variables.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card className="border-slate-200/80 bg-white/90">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
