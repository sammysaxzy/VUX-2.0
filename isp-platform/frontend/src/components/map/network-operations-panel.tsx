import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, CircleHelp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore, useTenantId } from "@/store/app-store";

type Device = { id: number; name: string; device_id: string; device_type: string; management_ip: string; status: string; monitoring_method: string; last_checked_at?: string | null };
type Snapshot = { counts: Record<string, number>; latest_check?: string | null; last_successful_check?: string | null; telemetry_status: string; limitations: string[] };
const API = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8001").replace(/\/+$/, "");

export function NetworkOperationsPanel() {
  const tenantId = useTenantId();
  const token = useAppStore((state) => state.token);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const enabled = Boolean(tenantId && token && (import.meta.env.VITE_USE_MOCKS ?? "true") !== "true");
  const [form, setForm] = useState({ device_id: "", name: "", device_type: "router", management_ip: "", monitoring_method: "icmp" });
  const headers = { "x-tenant-id": tenantId ?? "", Authorization: `Bearer ${token ?? ""}` };
  const devices = useQuery({ queryKey: ["noc-devices", tenantId], enabled, queryFn: async () => (await fetch(`${API}/api/noc/devices`, { headers })).json() as Promise<{ items: Device[] }> , refetchInterval: 30000 });
  const dashboard = useQuery({ queryKey: ["noc-dashboard", tenantId], enabled, queryFn: async () => (await fetch(`${API}/api/noc/dashboard`, { headers })).json() as Promise<Snapshot>, refetchInterval: 30000 });
  const events = useQuery({ queryKey: ["noc-events", tenantId], enabled, queryFn: async () => (await fetch(`${API}/api/noc/events?limit=8`, { headers })).json() as Promise<{ items: Array<{ id: number; asset?: string; event_type: string; severity: string; confidence: string; created_at: string }> }>, refetchInterval: 30000 });
  const check = useMutation({ mutationFn: async () => {
    const response = await fetch(`${API}/api/noc/check`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" } });
    if (!response.ok) throw new Error((await response.json()).detail || "Monitoring check failed");
    return response.json();
  }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["noc-devices", tenantId] }); void queryClient.invalidateQueries({ queryKey: ["noc-dashboard", tenantId] }); void queryClient.invalidateQueries({ queryKey: ["noc-events", tenantId] }); toast.success("Configured checks completed."); }, onError: (error: Error) => toast.error(error.message), onSettled: () => setBusy(false) });
  const enroll = useMutation({ mutationFn: async () => {
    const response = await fetch(`${API}/api/noc/devices`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!response.ok) throw new Error((await response.json()).detail || "Device enrollment failed");
    return response.json();
  }, onSuccess: () => { setForm({ device_id: "", name: "", device_type: "router", management_ip: "", monitoring_method: "icmp" }); void queryClient.invalidateQueries({ queryKey: ["noc-devices", tenantId] }); void queryClient.invalidateQueries({ queryKey: ["noc-dashboard", tenantId] }); toast.success("Device enrolled."); }, onError: (error: Error) => toast.error(error.message) });

  const snapshot = dashboard.data;
  const metrics = [
    ["Healthy", snapshot?.counts.healthy_devices ?? 0], ["Unreachable", snapshot?.counts.unreachable_devices ?? 0],
    ["Open events", snapshot?.counts.open_events ?? 0], ["Active incidents", snapshot?.counts.active_incidents ?? 0],
    ["Impacted customers", snapshot?.counts.affected_customers ?? 0], ["Stale telemetry", snapshot?.counts.stale_devices ?? 0],
  ];
  const startCheck = () => { setBusy(true); check.mutate(); };

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Network operations</h2><p className="text-sm text-muted-foreground">Device status, evidence and incidents from configured monitoring sources.</p></div>
      <Button onClick={startCheck} disabled={!enabled || busy || !devices.data?.items?.length}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Check configured devices</Button>
    </div>
    {!enabled ? <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm"><div className="flex items-center gap-2 font-medium"><CircleHelp className="h-4 w-4" />Live monitoring is not connected</div><p className="mt-1 text-muted-foreground">Demo mode does not generate device status. Connect the API, enroll devices and configure approved monitoring adapters to show live telemetry.</p></div> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{metrics.map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{value}</CardContent></Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />Monitored devices</CardTitle></CardHeader><CardContent className="space-y-3">
        {enabled ? <form className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); enroll.mutate(); }}>
          <input required aria-label="Device ID" placeholder="Device ID" value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })} className="rounded-md border bg-background px-3 py-2 text-sm" />
          <input required aria-label="Device name" placeholder="Device name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border bg-background px-3 py-2 text-sm" />
          <input required aria-label="Device type" placeholder="Device type (router, OLT…)" value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })} className="rounded-md border bg-background px-3 py-2 text-sm" />
          <input required aria-label="Management IP" placeholder="Management IP" value={form.management_ip} onChange={(e) => setForm({ ...form, management_ip: e.target.value })} className="rounded-md border bg-background px-3 py-2 text-sm" />
          <select aria-label="Monitoring method" value={form.monitoring_method} onChange={(e) => setForm({ ...form, monitoring_method: e.target.value })} className="rounded-md border bg-background px-3 py-2 text-sm"><option value="icmp">ICMP reachability</option><option value="snmp">SNMP (adapter required)</option><option value="api">Device API (adapter required)</option><option value="webhook">Webhook (adapter required)</option><option value="manual">Manual</option></select>
          <Button type="submit" disabled={enroll.isPending}>Enroll device</Button>
        </form> : null}
        {(devices.data?.items ?? []).map((device) => <div key={device.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-medium">{device.name}</p><p className="text-muted-foreground">{device.device_type} · {device.management_ip} · {device.monitoring_method.toUpperCase()}</p></div><Badge variant={device.status === "online" ? "success" : device.status === "unreachable" ? "danger" : "outline"}>{device.status}</Badge></div>)}
        {enabled && !devices.data?.items?.length ? <p className="text-sm text-muted-foreground">No monitored devices enrolled for this ISP yet.</p> : null}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Recent events</CardTitle></CardHeader><CardContent className="space-y-2">
        {(events.data?.items ?? []).map((event) => <div key={event.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-medium">{event.event_type.replace(/_/g, " ")} · {event.asset ?? "Network asset"}</p><p className="text-muted-foreground">{event.created_at ? new Date(event.created_at).toLocaleString() : "Time unavailable"} · {event.confidence}</p></div><Badge variant={event.severity === "critical" || event.severity === "major" ? "danger" : "warning"}>{event.severity}</Badge></div>)}
        {enabled && !events.data?.items?.length ? <p className="text-sm text-muted-foreground">No active events. An empty feed is not evidence of network health unless monitoring data is current.</p> : null}
      </CardContent></Card>
    </div>
    {snapshot?.telemetry_status ? <p className="text-xs text-muted-foreground">Telemetry: {snapshot.telemetry_status}. Last successful check: {snapshot.last_successful_check ? new Date(snapshot.last_successful_check).toLocaleString() : "none recorded"}. Scheduled polling worker: not configured.</p> : null}
    {snapshot?.limitations?.length ? <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">{snapshot.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : null}
  </section>;
}
