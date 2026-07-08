import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLead, useLeads, useServiceAreas } from "@/hooks/api/use-business";
import { useResellerAgents } from "@/hooks/api/use-operations";
import { randomId } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import type { Lead } from "@/types";

const blankLead: Lead = {
  id: "",
  tenantId: "",
  fullName: "",
  phone: "",
  email: "",
  source: "estate_campaign",
  status: "new",
  serviceAreaId: "",
  serviceAreaName: "",
  address: "",
  followUpDate: "",
  assignedMarketer: "",
  surveyStatus: "pending",
  interestedPlan: "",
  notes: "",
};

export function LeadsPage() {
  const tenantId = useAppStore((state) => state.branding?.tenantId ?? state.user?.tenantId ?? "");
  const leadsQuery = useLeads();
  const areasQuery = useServiceAreas();
  const createLeadMutation = useCreateLead();
  const resellerAgents = useResellerAgents();
  const [search, setSearch] = useState("");
  const [leadForm, setLeadForm] = useState<Lead>({ ...blankLead, tenantId });

  const filteredLeads = useMemo(() => {
    const leads = leadsQuery.data ?? [];
    if (!search.trim()) return leads;
    const term = search.toLowerCase();
    return leads.filter((lead) =>
      [lead.fullName, lead.phone, lead.email, lead.address, lead.serviceAreaName, lead.assignedMarketer]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    );
  }, [leadsQuery.data, search]);

  const summary = useMemo(() => {
    const leads = leadsQuery.data ?? [];
    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "new").length,
      converted: leads.filter((lead) => lead.status === "converted").length,
      surveys: leads.filter((lead) => lead.surveyStatus === "booked").length,
    };
  }, [leadsQuery.data]);

  const createLead = () => {
    if (!leadForm.fullName.trim() || !leadForm.phone.trim() || !leadForm.address.trim()) return;
    createLeadMutation.mutate(
      {
        ...leadForm,
        id: leadForm.id || randomId("lead"),
        tenantId,
        serviceAreaName: areasQuery.data?.find((area) => area.id === leadForm.serviceAreaId)?.name ?? leadForm.serviceAreaName,
      },
      {
        onSuccess: () => setLeadForm({ ...blankLead, tenantId }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Leads" value={String(summary.total)} detail="Sales pipeline across estates, referrals, and campaigns." />
        <SummaryCard title="New Prospects" value={String(summary.new)} detail="Fresh opportunities waiting for first contact." />
        <SummaryCard title="Converted" value={String(summary.converted)} detail="Leads already turned into paying customers." />
        <SummaryCard title="Surveys Booked" value={String(summary.surveys)} detail="Field visits already scheduled for feasibility checks." />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Sales & Leads Management</CardTitle>
              <CardDescription>Track prospects, site surveys, follow-up dates, coverage fit, and conversion progress.</CardDescription>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leads, phone, area, marketer..."
              className="md:max-w-sm"
            />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {leadsQuery.isLoading ? (
              <PageSkeleton />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prospect</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Survey</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Follow Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <p className="font-medium">{lead.fullName}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone} {lead.email ? `| ${lead.email}` : ""}</p>
                      </TableCell>
                      <TableCell>{lead.source.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <p>{lead.serviceAreaName ?? "Unassigned"}</p>
                        <p className="text-xs text-muted-foreground">{lead.address}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.surveyStatus === "completed" ? "success" : "outline"}>{lead.surveyStatus ?? "pending"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.status === "converted" ? "success" : lead.status === "lost" ? "danger" : "warning"}>
                          {lead.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.followUpDate || "Not set"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Lead</CardTitle>
            <CardDescription>Capture estate leads, referrals, web enquiries, and walk-ins with clean demo-ready data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Full Name">
              <Input value={leadForm.fullName} onChange={(event) => setLeadForm((current) => ({ ...current, fullName: event.target.value }))} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Phone">
                <Input value={leadForm.phone} onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))} />
              </Field>
              <Field label="Email">
                <Input type="email" value={leadForm.email ?? ""} onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Lead Source">
                <Select value={leadForm.source} onChange={(event) => setLeadForm((current) => ({ ...current, source: event.target.value as Lead["source"] }))}>
                  <option value="estate_campaign">estate_campaign</option>
                  <option value="referral">referral</option>
                  <option value="walk_in">walk_in</option>
                  <option value="website">website</option>
                  <option value="social_media">social_media</option>
                </Select>
              </Field>
              <Field label="Conversion Status">
                <Select value={leadForm.status} onChange={(event) => setLeadForm((current) => ({ ...current, status: event.target.value as Lead["status"] }))}>
                  <option value="new">new</option>
                  <option value="survey_scheduled">survey_scheduled</option>
                  <option value="proposal_sent">proposal_sent</option>
                  <option value="negotiating">negotiating</option>
                  <option value="converted">converted</option>
                  <option value="lost">lost</option>
                </Select>
              </Field>
            </div>
            <Field label="Coverage Area">
              <Select value={leadForm.serviceAreaId ?? ""} onChange={(event) => setLeadForm((current) => ({ ...current, serviceAreaId: event.target.value }))}>
                <option value="">Select coverage area</option>
                {(areasQuery.data ?? []).map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Address">
              <Textarea value={leadForm.address} onChange={(event) => setLeadForm((current) => ({ ...current, address: event.target.value }))} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Assigned Marketer">
                <Input value={leadForm.assignedMarketer ?? ""} onChange={(event) => setLeadForm((current) => ({ ...current, assignedMarketer: event.target.value }))} />
              </Field>
              <Field label="Follow Up Date">
                <Input type="date" value={leadForm.followUpDate ?? ""} onChange={(event) => setLeadForm((current) => ({ ...current, followUpDate: event.target.value }))} />
              </Field>
            </div>
            <Field label="Interested Plan">
              <Input value={leadForm.interestedPlan ?? ""} onChange={(event) => setLeadForm((current) => ({ ...current, interestedPlan: event.target.value }))} placeholder="Business 50 Mbps" />
            </Field>
            <Field label="Notes">
              <Textarea value={leadForm.notes ?? ""} onChange={(event) => setLeadForm((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
            <Button onClick={createLead} disabled={createLeadMutation.isPending} className="w-full">
              {createLeadMutation.isPending ? "Saving..." : "Capture Lead"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reseller / Marketer / Agent Management</CardTitle>
          <CardDescription>Track referrals, assigned leads, converted customers, commissions, and payout status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(resellerAgents.data ?? []).map((agent) => (
            <div key={agent.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{agent.fullName}</p>
                <Badge variant={agent.payoutStatus === "paid" ? "success" : agent.payoutStatus === "processing" ? "warning" : "outline"}>
                  {agent.payoutStatus}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{agent.role}</p>
              <div className="mt-3 grid gap-1 text-sm">
                <p>Assigned leads: {agent.assignedLeads}</p>
                <p>Referrals: {agent.referrals}</p>
                <p>Converted customers: {agent.convertedCustomers}</p>
                <p>Commission earned: NGN {agent.commissionEarned.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
