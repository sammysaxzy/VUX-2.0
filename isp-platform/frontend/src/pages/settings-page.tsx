import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  DemoModeSettings,
  MapAccessRole,
  NasEntry,
  NotificationRule,
  SecurityControlSettings,
  ServiceArea,
  ServicePlan,
  SettingsTab,
  TenantProfile,
} from "@/types";
import {
  useCreateNasEntry,
  useCreatePrivilegeAccount,
  useCreateServicePlan,
  useCreateZone,
  useNasEntries,
  usePermissionRoles,
  useServicePlans,
  useSettingsLogs,
  useUpdateNasEntry,
  useUpdatePermissionRole,
  useZones,
} from "@/hooks/api/use-settings";
import {
  useCreateServiceArea,
  useNotificationRules,
  useSaveNotificationRule,
  useSaveTenantProfile,
  useServiceAreas,
  useTenantProfile,
} from "@/hooks/api/use-business";
import {
  useApprovalRequests,
  useCommunicationTemplates,
  useDemoModeSettings,
  useDiscountPromos,
  useSaveDemoModeSettings,
  useSaveSecurityControls,
  useSecurityControls,
} from "@/hooks/api/use-operations";
import { EMPTY_PERMISSIONS, canManagePermissions, flattenPermissionMembers, hasPermission } from "@/lib/permissions";
import { resolveMapAccess } from "@/lib/map-permissions";
import { formatRelativeDate, randomId, titleCase } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAdminStore } from "@/store/admin-store";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const blankNasForm = { name: "", ipAddress: "", sharedSecret: "" };
const blankZoneForm = { name: "", nasId: "", description: "" };
const blankServiceForm: ServicePlan = {
  id: "",
  name: "",
  category: "business",
  speed: "",
  price: "",
  rateLimit: "",
  description: "",
  billingCycle: "monthly",
  status: "active",
};
const blankPermissionForm: { fullName: string; email: string; mapRole: MapAccessRole; canDelete: boolean } = {
  fullName: "",
  email: "",
  mapRole: "viewer",
  canDelete: false,
};
const blankCompanyForm: TenantProfile = {
  tenantId: "",
  companyName: "",
  supportEmail: "",
  supportPhone: "",
  address: "",
  timezone: "Africa/Lagos",
  currency: "NGN",
  defaultBillingCycle: "monthly",
  paymentGateway: "paystack",
  mapProvider: "mapbox",
  whatsappEnabled: true,
};
const blankAreaForm: ServiceArea = {
  id: "",
  tenantId: "",
  name: "",
  type: "estate",
  status: "active",
};
const blankNotificationForm: NotificationRule = {
  id: "",
  tenantId: "",
  name: "",
  channels: ["email"],
  trigger: "payment_reminder",
  enabled: true,
  audience: "customer",
};

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const currentUser = useAppStore((state) => state.user);
  const tenantId = useAppStore((state) => state.branding?.tenantId ?? state.user?.tenantId ?? "");
  const [nasModalOpen, setNasModalOpen] = useState(false);
  const [editingNas, setEditingNas] = useState<NasEntry | null>(null);
  const [nasForm, setNasForm] = useState(blankNasForm);
  const [zoneForm, setZoneForm] = useState(blankZoneForm);
  const [serviceForm, setServiceForm] = useState<ServicePlan>(blankServiceForm);
  const [permissionForm, setPermissionForm] = useState(blankPermissionForm);
  const [notificationForm, setNotificationForm] = useState<NotificationRule>({ ...blankNotificationForm, tenantId });
  const [areaForm, setAreaForm] = useState<ServiceArea>({ ...blankAreaForm, tenantId });

  const companyQuery = useTenantProfile();
  const saveCompanyMutation = useSaveTenantProfile();
  const nasQuery = useNasEntries();
  const createNasMutation = useCreateNasEntry();
  const updateNasMutation = useUpdateNasEntry();
  const zonesQuery = useZones();
  const createZoneMutation = useCreateZone();
  const permissionsQuery = usePermissionRoles();
  const updatePermissionRoleMutation = useUpdatePermissionRole();
  const createPrivilegeAccountMutation = useCreatePrivilegeAccount();
  const servicesQuery = useServicePlans();
  const createServiceMutation = useCreateServicePlan();
  const notificationsQuery = useNotificationRules();
  const saveNotificationMutation = useSaveNotificationRule();
  const serviceAreasQuery = useServiceAreas();
  const createServiceAreaMutation = useCreateServiceArea();
  const communicationTemplatesQuery = useCommunicationTemplates();
  const approvalRequestsQuery = useApprovalRequests();
  const discountPromosQuery = useDiscountPromos();
  const demoModeQuery = useDemoModeSettings();
  const securityControlsQuery = useSecurityControls();
  const saveDemoModeMutation = useSaveDemoModeSettings();
  const saveSecurityControlsMutation = useSaveSecurityControls();
  const logsQuery = useSettingsLogs();
  const setMembers = useAdminStore((state) => state.setMembers);
  const addMember = useAdminStore((state) => state.addMember);

  const [companyForm, setCompanyForm] = useState<TenantProfile>({ ...blankCompanyForm, tenantId });
  const [demoModeForm, setDemoModeForm] = useState<DemoModeSettings>({
    enabled: true,
    hideSensitiveSettings: true,
    preventDestructiveActions: true,
    sampleDatasetName: "",
  });
  const [securityForm, setSecurityForm] = useState<SecurityControlSettings>({
    passwordResetFlow: "email_link",
    twoFactorPlaceholder: true,
    sessionTimeoutMinutes: 30,
    sensitiveActionConfirmation: true,
    auditTrailEnabled: true,
  });
  const [roleModels, setRoleModels] = useState<Record<string, "Role Based" | "Approval Based" | "Hybrid">>({});
  const [profilePermissions, setProfilePermissions] = useState<Record<string, typeof EMPTY_PERMISSIONS>>({});
  const permissionAccess = useMemo(
    () => resolveMapAccess(currentUser, permissionsQuery.data ?? []),
    [currentUser, permissionsQuery.data],
  );
  const canAccessSettings = hasPermission(currentUser, "settings_access");
  const canEditPermissions = canManagePermissions(currentUser);

  useEffect(() => {
    if (companyQuery.data) {
      setCompanyForm(companyQuery.data);
    }
  }, [companyQuery.data]);

  useEffect(() => {
    if (demoModeQuery.data) {
      setDemoModeForm(demoModeQuery.data);
    }
  }, [demoModeQuery.data]);

  useEffect(() => {
    if (securityControlsQuery.data) {
      setSecurityForm(securityControlsQuery.data);
    }
  }, [securityControlsQuery.data]);

  useEffect(() => {
    setNotificationForm((current) => ({ ...current, tenantId }));
    setAreaForm((current) => ({ ...current, tenantId }));
  }, [tenantId]);

  useEffect(() => {
    const roles = permissionsQuery.data ?? [];
    if (roles.length === 0) return;
    setMembers(flattenPermissionMembers(roles));
    setRoleModels(
      Object.fromEntries(
        roles.map((role) => [role.id, (role.privilegeModel ?? "Role Based") as "Role Based" | "Approval Based" | "Hybrid"]),
      ),
    );
    setProfilePermissions(
      Object.fromEntries(roles.map((role) => [role.id, role.permissionFlags ?? EMPTY_PERMISSIONS])),
    );
  }, [permissionsQuery.data, setMembers]);

  const activeTab = useMemo<SettingsTab>(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "company" ||
      requestedTab === "nas" ||
      requestedTab === "zones" ||
      requestedTab === "permissions" ||
      requestedTab === "services" ||
      requestedTab === "notifications" ||
      requestedTab === "coverage" ||
      requestedTab === "logs"
    ) {
      return requestedTab;
    }
    return "company";
  }, [searchParams]);

  const activeSummary = useMemo(() => {
    if (activeTab === "company") return companyQuery.data?.companyName ?? "Tenant profile";
    if (activeTab === "nas") return `${nasQuery.data?.length ?? 0} NAS devices`;
    if (activeTab === "zones") return `${zonesQuery.data?.length ?? 0} service zones`;
    if (activeTab === "permissions") return `${permissionsQuery.data?.length ?? 0} permission profiles`;
    if (activeTab === "services") return `${servicesQuery.data?.length ?? 0} ISP plans`;
    if (activeTab === "notifications") return `${notificationsQuery.data?.length ?? 0} notification rules`;
    if (activeTab === "coverage") return `${serviceAreasQuery.data?.length ?? 0} coverage areas`;
    return `${logsQuery.data?.length ?? 0} audit events`;
  }, [activeTab, companyQuery.data?.companyName, logsQuery.data?.length, nasQuery.data?.length, notificationsQuery.data?.length, permissionsQuery.data?.length, serviceAreasQuery.data?.length, servicesQuery.data?.length, zonesQuery.data?.length]);

  if (!canAccessSettings) {
    return (
      <SettingsLayout activeTab={activeTab} summary="Restricted">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Your permission profile does not allow access to Settings.
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  const saveNas = () => {
    if (!nasForm.name.trim() || !nasForm.ipAddress.trim() || !nasForm.sharedSecret.trim()) return;
    if (editingNas) {
      updateNasMutation.mutate({ id: editingNas.id, payload: nasForm }, { onSuccess: () => setNasModalOpen(false) });
      return;
    }
    createNasMutation.mutate(nasForm, { onSuccess: () => setNasModalOpen(false) });
  };

  return (
    <SettingsLayout
      activeTab={activeTab}
      summary={activeSummary}
      description="Manage company profile, multi-tenant identity, plans, alerts, coverage, access control, payment settings, and operational audit visibility."
    >
      {activeTab === "company" && (
        companyQuery.isLoading || !companyQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>Each ISP tenant manages its own brand, support contacts, billing defaults, and map provider settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Company Name"><Input value={companyForm.companyName} onChange={(e) => setCompanyForm((p) => ({ ...p, companyName: e.target.value }))} /></Field>
                  <Field label="Legal Name"><Input value={companyForm.legalName ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, legalName: e.target.value }))} /></Field>
                  <Field label="Support Email"><Input type="email" value={companyForm.supportEmail} onChange={(e) => setCompanyForm((p) => ({ ...p, supportEmail: e.target.value }))} /></Field>
                  <Field label="Support Phone"><Input value={companyForm.supportPhone} onChange={(e) => setCompanyForm((p) => ({ ...p, supportPhone: e.target.value }))} /></Field>
                  <Field label="Billing Email"><Input type="email" value={companyForm.billingEmail ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, billingEmail: e.target.value }))} /></Field>
                  <Field label="Website"><Input value={companyForm.website ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, website: e.target.value }))} /></Field>
                </div>
                <Field label="Address"><Textarea value={companyForm.address} onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))} /></Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Default Billing Cycle">
                    <Select value={companyForm.defaultBillingCycle} onChange={(e) => setCompanyForm((p) => ({ ...p, defaultBillingCycle: e.target.value as TenantProfile["defaultBillingCycle"] }))}>
                      <option value="monthly">monthly</option>
                      <option value="quarterly">quarterly</option>
                      <option value="annually">annually</option>
                    </Select>
                  </Field>
                  <Field label="Payment Gateway">
                    <Select value={companyForm.paymentGateway} onChange={(e) => setCompanyForm((p) => ({ ...p, paymentGateway: e.target.value as TenantProfile["paymentGateway"] }))}>
                      <option value="paystack">paystack</option>
                      <option value="flutterwave">flutterwave</option>
                      <option value="manual">manual</option>
                    </Select>
                  </Field>
                  <Field label="Map Provider">
                    <Select value={companyForm.mapProvider} onChange={(e) => setCompanyForm((p) => ({ ...p, mapProvider: e.target.value as TenantProfile["mapProvider"] }))}>
                      <option value="mapbox">mapbox</option>
                      <option value="google_maps">google_maps</option>
                      <option value="openstreetmap">openstreetmap</option>
                    </Select>
                  </Field>
                  <Field label="Primary Color"><Input value={companyForm.primaryColor ?? ""} onChange={(e) => setCompanyForm((p) => ({ ...p, primaryColor: e.target.value }))} placeholder="#0B7285" /></Field>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
                  <div>
                    <p className="font-medium">WhatsApp Enabled</p>
                    <p className="text-sm text-muted-foreground">This tenant can use WhatsApp-ready notification workflows and support automation.</p>
                  </div>
                  <Switch checked={companyForm.whatsappEnabled} onCheckedChange={(checked) => setCompanyForm((p) => ({ ...p, whatsappEnabled: checked }))} />
                </div>
                <Button onClick={() => saveCompanyMutation.mutate(companyForm)} disabled={saveCompanyMutation.isPending}>
                  {saveCompanyMutation.isPending ? "Saving..." : "Save Company Settings"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tenant Isolation</CardTitle>
                <CardDescription>Demo-ready multi-tenant framing for separate ISP operations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoBlock title="Tenant ID" body={companyForm.tenantId} />
                <InfoBlock title="Data Scope" body="Customers, plans, billing, tickets, inventory, coverage, and settings are resolved per tenant ID." />
                <InfoBlock title="Presentation Note" body="Log in with a different tenant ID to demo another ISP brand and administrative context." />
                <InfoBlock title="White-label Branding" body={`Set branded portal identity, invoice appearance, support contact details, and logo for ${companyForm.companyName}.`} />
                <InfoBlock title="Demo Mode" body={demoModeQuery.data?.enabled ? `${demoModeQuery.data.sampleDatasetName} is active and destructive actions are blocked.` : "Demo mode disabled."} />
                <InfoBlock title="Security Controls" body={`Session timeout ${securityControlsQuery.data?.sessionTimeoutMinutes ?? 0} minutes, password reset ${securityControlsQuery.data?.passwordResetFlow?.replace(/_/g, " ") ?? "pending"}, audit trail ${securityControlsQuery.data?.auditTrailEnabled ? "enabled" : "disabled"}.`} />
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Commercial Readiness Controls</CardTitle>
                <CardDescription>Safe demo mode, 2FA placeholder, session handling, sensitive action confirmation, and white-label readiness.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoBlock title="Demo Protection" body={demoModeForm.preventDestructiveActions ? "Destructive actions blocked in demo mode." : "Live mode allows standard actions."} />
                  <InfoBlock title="Hide Sensitive Settings" body={demoModeForm.hideSensitiveSettings ? "Sensitive controls are hidden during presentations." : "Sensitive controls visible to admins."} />
                  <InfoBlock title="2FA Placeholder" body={securityForm.twoFactorPlaceholder ? "Prepared for future rollout." : "Not enabled"} />
                  <InfoBlock title="Sensitive Actions" body={securityForm.sensitiveActionConfirmation ? "Refunds, deletions, write-offs, and changes require confirmation." : "Confirmation disabled"} />
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-border/70 p-4">
                    <Field label="Demo Dataset"><Input value={demoModeForm.sampleDatasetName} onChange={(e) => setDemoModeForm((p) => ({ ...p, sampleDatasetName: e.target.value }))} /></Field>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                      <div><p className="text-sm font-medium">Enable Demo Mode</p></div>
                      <Switch checked={demoModeForm.enabled} onCheckedChange={(checked) => setDemoModeForm((p) => ({ ...p, enabled: checked }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                      <div><p className="text-sm font-medium">Hide Sensitive Settings</p></div>
                      <Switch checked={demoModeForm.hideSensitiveSettings} onCheckedChange={(checked) => setDemoModeForm((p) => ({ ...p, hideSensitiveSettings: checked }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                      <div><p className="text-sm font-medium">Block Destructive Actions</p></div>
                      <Switch checked={demoModeForm.preventDestructiveActions} onCheckedChange={(checked) => setDemoModeForm((p) => ({ ...p, preventDestructiveActions: checked }))} />
                    </div>
                    <Button onClick={() => saveDemoModeMutation.mutate(demoModeForm)} disabled={saveDemoModeMutation.isPending}>
                      {saveDemoModeMutation.isPending ? "Saving..." : "Save Demo Controls"}
                    </Button>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-border/70 p-4">
                    <Field label="Password Reset Flow">
                      <Select value={securityForm.passwordResetFlow} onChange={(e) => setSecurityForm((p) => ({ ...p, passwordResetFlow: e.target.value as typeof securityForm.passwordResetFlow }))}>
                        <option value="email_link">email_link</option>
                        <option value="admin_only">admin_only</option>
                        <option value="disabled">disabled</option>
                      </Select>
                    </Field>
                    <Field label="Session Timeout (minutes)">
                      <Input type="number" value={securityForm.sessionTimeoutMinutes} onChange={(e) => setSecurityForm((p) => ({ ...p, sessionTimeoutMinutes: Number(e.target.value) || 0 }))} />
                    </Field>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                      <div><p className="text-sm font-medium">Sensitive Action Confirmation</p></div>
                      <Switch checked={securityForm.sensitiveActionConfirmation} onCheckedChange={(checked) => setSecurityForm((p) => ({ ...p, sensitiveActionConfirmation: checked }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                      <div><p className="text-sm font-medium">Audit Trail Enabled</p></div>
                      <Switch checked={securityForm.auditTrailEnabled} onCheckedChange={(checked) => setSecurityForm((p) => ({ ...p, auditTrailEnabled: checked }))} />
                    </div>
                    <Button onClick={() => saveSecurityControlsMutation.mutate(securityForm)} disabled={saveSecurityControlsMutation.isPending}>
                      {saveSecurityControlsMutation.isPending ? "Saving..." : "Save Security Controls"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {activeTab === "services" && (
        servicesQuery.isLoading || !servicesQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>ISP Plans & Packages</CardTitle>
                <CardDescription>Create residential, business, dedicated, and custom plans with billing cycles and commercial status.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Billing Cycle</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicesQuery.data.map((plan) => (
                      <TableRow key={plan.id ?? plan.name}>
                        <TableCell>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">{plan.description}</p>
                        </TableCell>
                        <TableCell>{plan.category ?? "business"}</TableCell>
                        <TableCell>{plan.speed}</TableCell>
                        <TableCell>{plan.billingCycle ?? "monthly"}</TableCell>
                        <TableCell>{plan.price}</TableCell>
                        <TableCell><Badge variant={plan.status === "active" ? "success" : "outline"}>{plan.status ?? "active"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Create ISP Plan</CardTitle>
                <CardDescription>Add 20 Mbps, 25 Mbps, 50 Mbps, 100 Mbps, dedicated, business, and custom packages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Plan Name"><Input value={serviceForm.name} onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))} placeholder="Business 50 Mbps" /></Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Category">
                    <Select value={serviceForm.category ?? "business"} onChange={(e) => setServiceForm((p) => ({ ...p, category: e.target.value as ServicePlan["category"] }))}>
                      <option value="residential">residential</option>
                      <option value="business">business</option>
                      <option value="dedicated">dedicated</option>
                      <option value="custom">custom</option>
                    </Select>
                  </Field>
                  <Field label="Billing Cycle">
                    <Select value={serviceForm.billingCycle ?? "monthly"} onChange={(e) => setServiceForm((p) => ({ ...p, billingCycle: e.target.value as ServicePlan["billingCycle"] }))}>
                      <option value="monthly">monthly</option>
                      <option value="quarterly">quarterly</option>
                      <option value="annually">annually</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Speed"><Input value={serviceForm.speed} onChange={(e) => setServiceForm((p) => ({ ...p, speed: e.target.value }))} placeholder="50 Mbps" /></Field>
                  <Field label="Price"><Input value={serviceForm.price} onChange={(e) => setServiceForm((p) => ({ ...p, price: e.target.value }))} placeholder="NGN 18,900" /></Field>
                </div>
                <Field label="Rate Limit"><Input value={serviceForm.rateLimit} onChange={(e) => setServiceForm((p) => ({ ...p, rateLimit: e.target.value }))} placeholder="50M/50M" /></Field>
                <Field label="Description"><Textarea value={serviceForm.description ?? ""} onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))} /></Field>
                <Button onClick={() => createServiceMutation.mutate({ ...serviceForm, id: serviceForm.id || randomId("plan"), tenantId })} disabled={createServiceMutation.isPending}>
                  {createServiceMutation.isPending ? "Saving..." : "Create Plan"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {activeTab === "notifications" && (
        notificationsQuery.isLoading || !notificationsQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Notification Structure</CardTitle>
                <CardDescription>Email, SMS, WhatsApp, and in-app notifications for renewals, outages, tickets, installations, and low stock.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {notificationsQuery.data.map((rule) => (
                  <div key={rule.id} className="rounded-xl border border-border/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">{titleCase(rule.trigger.replace(/_/g, " "))}</p>
                      </div>
                      <Switch checked={rule.enabled} onCheckedChange={(checked) => saveNotificationMutation.mutate({ ...rule, enabled: checked })} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rule.channels.map((channel) => <Badge key={channel} variant="outline">{channel}</Badge>)}
                      <Badge variant="outline">{rule.audience}</Badge>
                    </div>
                    {rule.templateNote ? <p className="mt-2 text-sm text-muted-foreground">{rule.templateNote}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add Notification Rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Rule Name"><Input value={notificationForm.name} onChange={(e) => setNotificationForm((p) => ({ ...p, name: e.target.value, tenantId }))} /></Field>
                <Field label="Trigger">
                  <Select value={notificationForm.trigger} onChange={(e) => setNotificationForm((p) => ({ ...p, trigger: e.target.value as NotificationRule["trigger"] }))}>
                    <option value="payment_reminder">payment_reminder</option>
                    <option value="payment_success">payment_success</option>
                    <option value="outage_alert">outage_alert</option>
                    <option value="ticket_update">ticket_update</option>
                    <option value="installation_update">installation_update</option>
                    <option value="low_stock_alert">low_stock_alert</option>
                  </Select>
                </Field>
                <Field label="Audience">
                  <Select value={notificationForm.audience} onChange={(e) => setNotificationForm((p) => ({ ...p, audience: e.target.value as NotificationRule["audience"] }))}>
                    <option value="customer">customer</option>
                    <option value="operations">operations</option>
                    <option value="management">management</option>
                  </Select>
                </Field>
                <Field label="Primary Channel">
                  <Select value={notificationForm.channels[0]} onChange={(e) => setNotificationForm((p) => ({ ...p, channels: [e.target.value as NotificationRule["channels"][number], "in_app"] }))}>
                    <option value="email">email</option>
                    <option value="sms">sms</option>
                    <option value="whatsapp">whatsapp</option>
                    <option value="in_app">in_app</option>
                  </Select>
                </Field>
                <Field label="Template Note"><Textarea value={notificationForm.templateNote ?? ""} onChange={(e) => setNotificationForm((p) => ({ ...p, templateNote: e.target.value }))} /></Field>
                <Button onClick={() => saveNotificationMutation.mutate({ ...notificationForm, id: notificationForm.id || randomId("notify"), tenantId })} disabled={saveNotificationMutation.isPending}>
                  {saveNotificationMutation.isPending ? "Saving..." : "Save Rule"}
                </Button>
              </CardContent>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Templates, Promos & Approvals</CardTitle>
                <CardDescription>Customer communication templates, discount governance, and approval workflow for sensitive commercial actions.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-3">
                <div className="space-y-3">
                  {(communicationTemplatesQuery.data ?? []).slice(0, 3).map((template) => (
                    <div key={template.id} className="rounded-xl border border-border/70 p-3 text-sm">
                      <p className="font-medium">{template.name.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-muted-foreground">{template.channel}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {(discountPromosQuery.data ?? []).slice(0, 3).map((promo) => (
                    <div key={promo.id} className="rounded-xl border border-border/70 p-3 text-sm">
                      <p className="font-medium">{promo.code}</p>
                      <p className="mt-1 text-muted-foreground">{promo.type} | {promo.amount}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {(approvalRequestsQuery.data ?? []).slice(0, 3).map((request) => (
                    <div key={request.id} className="rounded-xl border border-border/70 p-3 text-sm">
                      <p className="font-medium">{request.type.replace(/_/g, " ")}</p>
                      <p className="mt-1 text-muted-foreground">{request.requester}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {activeTab === "coverage" && (
        serviceAreasQuery.isLoading || !serviceAreasQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Coverage Areas</CardTitle>
                <CardDescription>Manage estates, streets, towns, POPs, and service zones linked to leads and customer rollout planning.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Households</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceAreasQuery.data.map((area) => (
                      <TableRow key={area.id}>
                        <TableCell>{area.name}</TableCell>
                        <TableCell>{area.type}</TableCell>
                        <TableCell>{area.parentName ?? "-"}</TableCell>
                        <TableCell><Badge variant={area.status === "active" ? "success" : "warning"}>{area.status}</Badge></TableCell>
                        <TableCell>{area.households ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add Coverage Area</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Name"><Input value={areaForm.name} onChange={(e) => setAreaForm((p) => ({ ...p, name: e.target.value, tenantId, id: p.id || randomId("area") }))} /></Field>
                <Field label="Type">
                  <Select value={areaForm.type} onChange={(e) => setAreaForm((p) => ({ ...p, type: e.target.value as ServiceArea["type"] }))}>
                    <option value="estate">estate</option>
                    <option value="street">street</option>
                    <option value="town">town</option>
                    <option value="pop">pop</option>
                    <option value="service_zone">service_zone</option>
                  </Select>
                </Field>
                <Field label="Parent Name"><Input value={areaForm.parentName ?? ""} onChange={(e) => setAreaForm((p) => ({ ...p, parentName: e.target.value }))} /></Field>
                <Field label="Status">
                  <Select value={areaForm.status} onChange={(e) => setAreaForm((p) => ({ ...p, status: e.target.value as ServiceArea["status"] }))}>
                    <option value="active">active</option>
                    <option value="planned">planned</option>
                    <option value="maintenance">maintenance</option>
                  </Select>
                </Field>
                <Button onClick={() => createServiceAreaMutation.mutate({ ...areaForm, id: areaForm.id || randomId("area"), tenantId })} disabled={createServiceAreaMutation.isPending}>
                  {createServiceAreaMutation.isPending ? "Saving..." : "Add Coverage Area"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {activeTab === "nas" && (
        nasQuery.isLoading || !nasQuery.data ? (
          <PageSkeleton />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>NAS Management</CardTitle>
                <CardDescription>Store NAS IP and shared secret centrally for PPPoE access infrastructure.</CardDescription>
              </div>
              <Button onClick={() => { setEditingNas(null); setNasForm(blankNasForm); setNasModalOpen(true); }}>Add NAS</Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>IP Address</TableHead><TableHead>Shared Secret</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {nasQuery.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{entry.ipAddress}</TableCell>
                      <TableCell>{entry.sharedSecret}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setEditingNas(entry); setNasForm({ name: entry.name, ipAddress: entry.ipAddress, sharedSecret: entry.sharedSecret }); setNasModalOpen(true); }}>Edit</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}

      {activeTab === "zones" && (
        zonesQuery.isLoading || !zonesQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader><CardTitle>Zone Management</CardTitle><CardDescription>Bind PPPoE zones to the correct access infrastructure.</CardDescription></CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Zone</TableHead><TableHead>NAS</TableHead><TableHead>Description</TableHead><TableHead>Users</TableHead></TableRow></TableHeader>
                  <TableBody>{zonesQuery.data.map((zone) => <TableRow key={zone.id}><TableCell>{zone.name}</TableCell><TableCell>{zone.nasName}</TableCell><TableCell>{zone.description}</TableCell><TableCell>{zone.usersCount}</TableCell></TableRow>)}</TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Create Zone</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="Zone Name"><Input value={zoneForm.name} onChange={(e) => setZoneForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                <Field label="NAS">
                  <Select value={zoneForm.nasId} onChange={(e) => setZoneForm((p) => ({ ...p, nasId: e.target.value }))}>
                    <option value="">Select NAS</option>
                    {(nasQuery.data ?? []).map((nas) => <option key={nas.id} value={nas.id}>{nas.name}</option>)}
                  </Select>
                </Field>
                <Field label="Description"><Input value={zoneForm.description} onChange={(e) => setZoneForm((p) => ({ ...p, description: e.target.value }))} /></Field>
                <Button onClick={() => createZoneMutation.mutate(zoneForm, { onSuccess: () => setZoneForm(blankZoneForm) })} disabled={createZoneMutation.isPending}>
                  {createZoneMutation.isPending ? "Saving..." : "Create Zone"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {activeTab === "permissions" && (
        permissionsQuery.isLoading || !permissionsQuery.data ? (
          <PageSkeleton />
        ) : (
          <div className="grid gap-4">
            <Card>
              <CardHeader><CardTitle>Role & Permission Profiles</CardTitle><CardDescription>Admin, NOC, finance, customer care, engineer, and manager access can be controlled per tenant.</CardDescription></CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-border px-3 py-1">Current access: {permissionAccess.mapRole.toUpperCase()}</span>
                <span className="rounded-full border border-border px-3 py-1">{permissionAccess.canManagePermissions ? "Can manage permissions" : "Read-only permission view"}</span>
              </CardContent>
            </Card>
            {permissionsQuery.data.map((role) => (
              <Card key={role.id}>
                <CardHeader><CardTitle>{role.name}</CardTitle><CardDescription>{role.description}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="text-sm text-muted-foreground">Scope: {role.scope} | Members: {role.memberCount}</div>
                    <div className="flex w-full flex-col gap-2 lg:w-64">
                      <Select value={roleModels[role.id] ?? "Role Based"} disabled={!canEditPermissions} onChange={(e) => setRoleModels((c) => ({ ...c, [role.id]: e.target.value as "Role Based" | "Approval Based" | "Hybrid" }))}>
                        <option value="Role Based">Role Based</option>
                        <option value="Approval Based">Approval Based</option>
                        <option value="Hybrid">Hybrid</option>
                      </Select>
                      <Button variant="outline" disabled={!canEditPermissions || updatePermissionRoleMutation.isPending} onClick={() => updatePermissionRoleMutation.mutate({ id: role.id, payload: { privilegeModel: roleModels[role.id] ?? "Role Based", permissionFlags: profilePermissions[role.id] ?? EMPTY_PERMISSIONS } })}>Save Profile</Button>
                    </div>
                  </div>
                  {(role.members ?? []).map((member) => <div key={member.id} className="rounded-xl border border-border/70 p-3 text-sm">{member.fullName} <span className="text-muted-foreground">({member.email})</span></div>)}
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardHeader><CardTitle>Create Member</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Full Name"><Input value={permissionForm.fullName} onChange={(e) => setPermissionForm((p) => ({ ...p, fullName: e.target.value }))} /></Field>
                  <Field label="Email"><Input type="email" value={permissionForm.email} onChange={(e) => setPermissionForm((p) => ({ ...p, email: e.target.value }))} /></Field>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Map Role">
                    <Select value={permissionForm.mapRole} onChange={(e) => setPermissionForm((p) => ({ ...p, mapRole: e.target.value as MapAccessRole }))}>
                      <option value="admin">admin</option><option value="engineer">engineer</option><option value="viewer">viewer</option>
                    </Select>
                  </Field>
                  <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                    <div><p className="text-sm font-medium">Allow delete actions</p></div>
                    <Switch checked={permissionForm.canDelete} onCheckedChange={(checked) => setPermissionForm((p) => ({ ...p, canDelete: checked }))} />
                  </div>
                </div>
                <Button
                  disabled={!canEditPermissions || createPrivilegeAccountMutation.isPending}
                  onClick={() =>
                    createPrivilegeAccountMutation.mutate(
                      {
                        fullName: permissionForm.fullName,
                        email: permissionForm.email,
                        role: permissionForm.mapRole === "viewer" ? "support" : "admin",
                        permissionProfileId: permissionsQuery.data?.[0]?.id ?? "",
                      },
                      { onSuccess: (member) => addMember(member) },
                    )
                  }
                >
                  {createPrivilegeAccountMutation.isPending ? "Creating..." : "Create Member"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {activeTab === "logs" && (
        logsQuery.isLoading || !logsQuery.data ? (
          <PageSkeleton />
        ) : (
          <Card>
            <CardHeader><CardTitle>Audit Logs</CardTitle><CardDescription>Track who created, edited, assigned, billed, notified, or changed important records.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Module</TableHead><TableHead>Actor</TableHead><TableHead>Description</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logsQuery.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.type}</TableCell>
                      <TableCell>{log.module ?? "system"}</TableCell>
                      <TableCell>{log.actor}</TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>{formatRelativeDate(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}

      <Dialog open={nasModalOpen} title={editingNas ? "Edit NAS" : "Add NAS"} description="Maintain NAS IP and shared secret from tenant settings." onOpenChange={setNasModalOpen}>
        <div className="space-y-4">
          <Field label="Name"><Input value={nasForm.name} onChange={(e) => setNasForm((p) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="IP Address"><Input value={nasForm.ipAddress} onChange={(e) => setNasForm((p) => ({ ...p, ipAddress: e.target.value }))} /></Field>
          <Field label="Shared Secret"><Input value={nasForm.sharedSecret} onChange={(e) => setNasForm((p) => ({ ...p, sharedSecret: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNasModalOpen(false)}>Cancel</Button>
            <Button onClick={saveNas} disabled={createNasMutation.isPending || updateNasMutation.isPending}>{createNasMutation.isPending || updateNasMutation.isPending ? "Saving..." : "Save NAS"}</Button>
          </div>
        </div>
      </Dialog>
    </SettingsLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border/70 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  );
}
