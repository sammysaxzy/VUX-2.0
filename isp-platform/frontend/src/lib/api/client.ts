import axios from "axios";
import type {
  AlertItem,
  AuthResponse,
  ClosureBox,
  Customer,
  EngineerActivity,
  Fault,
  FibreCable,
  KpiSnapshot,
  NasEntry,
  NetworkNode,
  NotificationSettings,
  PermissionRole,
  RadiusBulkImportResult,
  RadiusSession,
  RadiusUser,
  ServicePlan,
  SettingsLog,
  TenantBranding,
  User,
  Zone,
} from "@/types";
import {
  addMockNasEntry,
  addMockPrivilegeAccount,
  addMockFault,
  addMockRadiusUser,
  addMockServicePlan,
  addMockZone,
  activateMockRadiusUser,
  assignMockCoreToCable,
  assignMockClientToMstPort,
  bulkImportMockRadiusUsers,
  buildKpis,
  createMockMstConnection,
  deleteMockCable,
  deleteMockCustomer,
  deleteMockClosure,
  deleteMockNasEntries,
  deleteMockNode,
  deleteMockPrivilegeAccount,
  deleteMockPrivilegeAccounts,
  deleteMockPermissionRoles,
  deleteMockRadiusUsers,
  deleteMockServicePlans,
  deleteMockSettingsLogs,
  deleteMockZones,
  disconnectMockRadiusSession,
  extendMockRadiusUser,
  getMockNotificationSettings,
  mockActivities,
  mockAlerts,
  mockBranding,
  mockCables,
  mockClosures,
  mockCustomers,
  mockFaults,
  mockNasEntries,
  mockNodes,
  mockPermissionRoles,
  mockRadiusUsers,
  mockServicePlans,
  mockSettingsLogs,
  mockSessions,
  mockUser,
  mockZones,
  reconnectMockRadiusSession,
  removeMockClientFromMstPort,
  removeMockClosureSplice,
  setMockCableCoreState,
  syncMockRadiusUser,
  updateMockPrivilegeAccount,
  updateMockPermissionRole,
  updateMockNasEntry,
  updateMockNotificationSettings,
  updateMockMstSplitterType,
  upsertMockClosureSplice,
  upsertCustomer,
} from "@/lib/api/mock-data";
import { randomId } from "@/lib/utils";
import {
  CUSTOMER_EXPORT_SCHEMA,
  RADIUS_SESSION_EXPORT_SCHEMA,
  RADIUS_USER_IMPORT_EXPORT_SCHEMA,
  type RadiusBulkImportPayload,
} from "@/features/import-export/schema";
import {
  createCsvContent,
  mapCustomersToExportRows,
  mapRadiusUsersToExportRows,
  mapSessionsToExportRows,
} from "@/features/import-export/utils";

const resolvedBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8001"
).replace(/\/+$/, "");

const wsScheme = resolvedBaseUrl.startsWith("https") ? "wss" : "ws";
export const radiusWsUrl = (
  import.meta.env.VITE_RADIUS_WS_URL ??
  `${wsScheme}://${resolvedBaseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/ws/radius`
).replace(/\/+$/, "");

const api = axios.create({
  baseURL: resolvedBaseUrl,
  headers: { "Content-Type": "application/json" },
});

export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") === "true";

function tenantHeaders(tenantId?: string) {
  if (!tenantId) return {};
  return { "x-tenant-id": tenantId };
}

function authHeaders(token?: string) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

const sleep = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

type DashboardPayload = {
  kpis: KpiSnapshot;
  alerts: AlertItem[];
  activities: EngineerActivity[];
};

export const apiClient = {
  async login(email: string, password: string, tenantId: string): Promise<AuthResponse> {
    if (USE_MOCKS) {
      await sleep();
      return {
        token: `mock-token-${password.length}`,
        user: { ...mockUser, email, tenantId },
        branding: { ...mockBranding, tenantId },
      };
    }
    const { data } = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
      tenant_id: tenantId,
    });
    return data;
  },

  async register(payload: {
    fullName: string;
    email: string;
    password: string;
    tenantId: string;
    ispName: string;
  }): Promise<AuthResponse> {
    if (USE_MOCKS) {
      await sleep();
      const user: User = {
        id: randomId("u"),
        email: payload.email,
        fullName: payload.fullName,
        role: "tenant_admin",
        tenantId: payload.tenantId,
        permissionProfileId: "role-1",
        delete_customer: true,
        permissions: {
          radius_access: true,
          disconnect_user: true,
          create_pppoe: true,
          view_customers: true,
          delete_customer: true,
          billing_access: true,
          settings_access: true,
        },
      };
      const branding: TenantBranding = {
        tenantId: payload.tenantId,
        ispName: payload.ispName,
      };
      return { token: `mock-token-${Date.now()}`, user, branding };
    }
    const { data } = await api.post<AuthResponse>("/auth/register", {
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
      tenant_id: payload.tenantId,
      isp_name: payload.ispName,
    });
    return data;
  },

  async getDashboard(tenantId: string, token?: string): Promise<DashboardPayload> {
    if (USE_MOCKS) {
      await sleep(300);
      return {
        kpis: buildKpis(),
        alerts: mockAlerts,
        activities: mockActivities,
      };
    }
    const [customersRes, nodesRes, sessionsRes, faultsRes, activityRes] = await Promise.all([
      api.get<Customer[]>("/customers", { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } }),
      api.get<NetworkNode[]>("/network/nodes", { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } }),
      api.get<RadiusSession[]>("/radius/sessions", { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } }),
      api.get<Fault[]>("/faults", { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } }),
      api.get<EngineerActivity[]>("/splicing", { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } }),
    ]);

    const customers = customersRes.data;
    const nodes = nodesRes.data;
    const sessions = sessionsRes.data;
    const faults = faultsRes.data;
    const kpis: KpiSnapshot = {
      activeCustomers: customers.filter((c) => c.accountStatus === "active").length,
      offlineCustomers: customers.filter((c) => !c.online).length,
      totalOlts: nodes.filter((n) => n.type === "olt").length,
      activeRadiusSessions: sessions.filter((s) => s.status === "online").length,
    };
    return {
      kpis,
      alerts: faults.slice(0, 8).map((fault) => ({
        id: fault.id,
        title: fault.title,
        description: fault.description,
        severity: fault.severity,
        createdAt: fault.createdAt,
        acknowledged: false,
      })),
      activities: activityRes.data,
    };
  },

  async getCustomers(tenantId: string, token?: string): Promise<Customer[]> {
    if (USE_MOCKS) {
      await sleep(280);
      return mockCustomers;
    }
    const { data } = await api.get<Customer[]>("/customers", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getCustomerById(id: string, tenantId: string, token?: string): Promise<Customer> {
    if (USE_MOCKS) {
      await sleep(230);
      const found = mockCustomers.find((customer) => customer.id === id);
      if (!found) throw new Error("Customer not found");
      return found;
    }
    const { data } = await api.get<Customer>(`/customers/${id}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async upsertCustomer(customer: Customer, tenantId: string, token?: string): Promise<Customer> {
    if (USE_MOCKS) {
      await sleep(260);
      upsertCustomer(customer);
      return customer;
    }
    const method = customer.id ? "put" : "post";
    const endpoint = customer.id ? `/customers/${customer.id}` : "/customers";
    const { data } = await api.request<Customer>({
      method,
      url: endpoint,
      data: customer,
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteCustomer(customerId: string, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(220);
      deleteMockCustomer(customerId);
      return;
    }
    await api.delete(`/customers/${customerId}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
  },

  async getNodes(tenantId: string, token?: string): Promise<NetworkNode[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return mockNodes;
    }
    const { data } = await api.get<Array<NetworkNode & { clients?: NetworkNode["clients"] }>>("/network/nodes", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data.map((node) => ({
      ...node,
      clients: node.clients ?? [],
      splitterPorts: node.splitterPorts ?? [],
    }));
  },

  async getFibre(tenantId: string, token?: string): Promise<FibreCable[]> {
    if (USE_MOCKS) {
      await sleep(260);
      return mockCables;
    }
    const { data } = await api.get<Array<FibreCable & { core_count?: number }>>("/network/fibre", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data.map((cable) => ({
      ...cable,
      coreCount: cable.coreCount ?? (cable.core_count as 2 | 4 | 8 | 12 | 24) ?? (cable.cores.length as 2 | 4 | 8 | 12 | 24),
    }));
  },

  async createMstConnection(
    payload: {
      startMstId: string;
      endMstId: string;
      geometry: { lat: number; lng: number }[];
      coreCount: 2 | 4 | 8 | 12 | 24;
    },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(220);
      return createMockMstConnection(payload);
    }
    const { data } = await api.post<FibreCable>(
      "/network/fibre",
      {
        start_mst_id: payload.startMstId,
        end_mst_id: payload.endMstId,
        geometry: payload.geometry,
        core_count: payload.coreCount,
      },
      {
        headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      },
    );
    return data;
  },

  async assignCableCore(payload: { cableId: string; coreId: string }, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(180);
      return assignMockCoreToCable(payload);
    }
    const { data } = await api.post(
      `/network/fibre/${payload.cableId}/assign-core`,
      { core_id: payload.coreId },
      { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } },
    );
    return data;
  },

  async setCableCoreState(
    payload: {
      cableId: string;
      coreId: string;
      status: "free" | "used";
      fromMstId?: string;
      toMstId?: string;
      usagePath?: string;
      assignedToCustomerId?: string;
    },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(180);
      return setMockCableCoreState(payload);
    }
    const { data } = await api.patch(
      `/network/fibre/${payload.cableId}/core/${payload.coreId}`,
      {
        status: payload.status,
        from_mst_id: payload.fromMstId,
        to_mst_id: payload.toMstId,
        usage_path: payload.usagePath,
        assigned_to_customer_id: payload.assignedToCustomerId,
      },
      { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } },
    );
    return data;
  },

  async deleteFibreCable(payload: { cableId: string }, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(180);
      return deleteMockCable(payload);
    }
    const { data } = await api.delete(`/network/fibre/${payload.cableId}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteNetworkNode(payload: { nodeId: string }, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(180);
      return deleteMockNode(payload);
    }
    const { data } = await api.delete(`/network/nodes/${payload.nodeId}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteClosure(payload: { closureId: string }, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(180);
      return deleteMockClosure(payload);
    }
    const { data } = await api.delete(`/network/closures/${payload.closureId}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getClosures(tenantId: string, token?: string): Promise<ClosureBox[]> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockClosures;
    }
    const { data } = await api.get<ClosureBox[]>("/network/closures", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async upsertClosureSplice(
    payload: {
      closureId: string;
      splice: {
        id?: string;
        fromCableId: string;
        fromCoreColor: string;
        toCableId: string;
        toCoreColor: string;
        notes?: string;
      };
    },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(180);
      return upsertMockClosureSplice(payload);
    }
    const { data } = await api.post(`/splicing`, payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteClosureSplice(payload: { closureId: string; spliceId: string }, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(180);
      return removeMockClosureSplice(payload);
    }
    const { data } = await api.delete(`/splicing/${payload.spliceId}`, {
      data: { closure_id: payload.closureId },
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async assignClientToMstPort(
    payload: {
      mstId: string;
      portNumber: number;
      clientId: string;
      clientName: string;
      fiberCore: string;
    },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(180);
      return assignMockClientToMstPort(payload);
    }
    const { data } = await api.post(
      `/network/mst/${payload.mstId}/assign-client`,
      {
        port_number: payload.portNumber,
        client_id: payload.clientId,
        client_name: payload.clientName,
        fiber_core: payload.fiberCore,
      },
      {
        headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      },
    );
    return data;
  },

  async removeClientFromMstPort(payload: { mstId: string; portNumber: number }, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(180);
      return removeMockClientFromMstPort(payload);
    }
    const { data } = await api.delete(`/network/mst/${payload.mstId}/ports/${payload.portNumber}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async updateMstSplitterType(
    payload: { mstId: string; splitterType: "1/2" | "1/4" | "1/8" | "1/16" },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(180);
      return updateMockMstSplitterType(payload);
    }
    const { data } = await api.patch(
      `/network/mst/${payload.mstId}/splitter`,
      { splitter_type: payload.splitterType },
      { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } },
    );
    return data;
  },

  async getSplicing(tenantId: string, token?: string): Promise<EngineerActivity[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return mockActivities;
    }
    const { data } = await api.get<EngineerActivity[]>("/splicing", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getRadiusSessions(tenantId: string, token?: string): Promise<RadiusSession[]> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockSessions;
    }
    const { data } = await api.get<RadiusSession[]>("/radius/sessions", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getRadiusUsers(tenantId: string, token?: string): Promise<RadiusUser[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return mockRadiusUsers;
    }
    const { data } = await api.get<RadiusUser[]>("/radius/users", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createRadiusUser(
    payload: {
      username: string;
      password: string;
      plan: string;
      zoneId: string;
      customerType: "individual" | "corporate";
      expirationDate: string;
      staticIp?: string;
      priority?: "high" | "medium" | "low";
      slaProfile?: string;
    },
    tenantId: string,
    token?: string,
  ): Promise<RadiusUser> {
    if (USE_MOCKS) {
      await sleep(200);
      return addMockRadiusUser(payload);
    }
    const { data } = await api.post<RadiusUser>("/radius/users", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async bulkImportRadiusUsers(payload: RadiusBulkImportPayload[], tenantId: string, token?: string): Promise<RadiusBulkImportResult> {
    if (USE_MOCKS) {
      await sleep(350);
      return bulkImportMockRadiusUsers(payload);
    }
    const { data } = await api.post<RadiusBulkImportResult>("/api/radius/bulk-import", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async activateRadiusUser(username: string, tenantId: string, token?: string): Promise<RadiusUser> {
    if (USE_MOCKS) {
      await sleep(150);
      return activateMockRadiusUser(username);
    }
    const { data } = await api.patch<RadiusUser>(`/radius/users/${encodeURIComponent(username)}/activate`, undefined, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async syncRadiusUser(username: string, tenantId: string, token?: string): Promise<RadiusUser> {
    if (USE_MOCKS) {
      await sleep(170);
      return syncMockRadiusUser(username);
    }
    const { data } = await api.post<RadiusUser>(`/radius/users/${encodeURIComponent(username)}/sync`, undefined, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async extendRadiusUser(username: string, expirationDate: string, tenantId: string, token?: string): Promise<RadiusUser> {
    if (USE_MOCKS) {
      await sleep(170);
      return extendMockRadiusUser(username, expirationDate);
    }
    const { data } = await api.patch<RadiusUser>(
      `/radius/users/${encodeURIComponent(username)}/expiration`,
      { expiration_date: expirationDate },
      { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } },
    );
    return data;
  },

  async deleteRadiusUsers(usernames: string[], tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(170);
      return { deleted: deleteMockRadiusUsers(usernames) };
    }
    const { data } = await api.delete("/radius/users", {
      data: { usernames },
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async reconnectRadiusSession(username: string, tenantId: string, token?: string): Promise<RadiusSession> {
    if (USE_MOCKS) {
      await sleep(150);
      return reconnectMockRadiusSession(username);
    }
    const { data } = await api.post<RadiusSession>(`/radius/sessions/${encodeURIComponent(username)}/reconnect`, undefined, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async exportRadiusUsers(tenantId: string, token?: string): Promise<Blob> {
    if (USE_MOCKS) {
      await sleep(220);
      return new Blob([createCsvContent(RADIUS_USER_IMPORT_EXPORT_SCHEMA, mapRadiusUsersToExportRows(mockRadiusUsers))], {
        type: "text/csv;charset=utf-8;",
      });
    }
    const { data } = await api.get<Blob>("/api/radius/export-users", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      responseType: "blob",
    });
    return data;
  },

  async exportRadiusSessions(tenantId: string, token?: string): Promise<Blob> {
    if (USE_MOCKS) {
      await sleep(220);
      return new Blob([createCsvContent(RADIUS_SESSION_EXPORT_SCHEMA, mapSessionsToExportRows(mockSessions))], {
        type: "text/csv;charset=utf-8;",
      });
    }
    const { data } = await api.get<Blob>("/api/radius/export-sessions", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      responseType: "blob",
    });
    return data;
  },

  async exportCustomers(tenantId: string, token?: string): Promise<Blob> {
    if (USE_MOCKS) {
      await sleep(220);
      return new Blob([createCsvContent(CUSTOMER_EXPORT_SCHEMA, mapCustomersToExportRows(mockCustomers))], {
        type: "text/csv;charset=utf-8;",
      });
    }
    const { data } = await api.get<Blob>("/api/customers/export", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      responseType: "blob",
    });
    return data;
  },

  async getServicePlans(tenantId: string, token?: string): Promise<ServicePlan[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return mockServicePlans;
    }
    const { data } = await api.get<ServicePlan[]>("/settings/services", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createServicePlan(payload: ServicePlan, tenantId: string, token?: string): Promise<ServicePlan> {
    if (USE_MOCKS) {
      await sleep(170);
      return addMockServicePlan(payload);
    }
    const { data } = await api.post<ServicePlan>("/settings/services", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteServicePlans(names: string[], tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(170);
      return { deleted: deleteMockServicePlans(names) };
    }
    const { data } = await api.delete("/settings/services", {
      data: { names },
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getNasEntries(tenantId: string, token?: string): Promise<NasEntry[]> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockNasEntries;
    }
    const { data } = await api.get<NasEntry[]>("/settings/nas", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createNasEntry(payload: Omit<NasEntry, "id">, tenantId: string, token?: string): Promise<NasEntry> {
    if (USE_MOCKS) {
      await sleep(170);
      return addMockNasEntry(payload);
    }
    const { data } = await api.post<NasEntry>("/settings/nas", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async updateNasEntry(id: string, payload: Omit<NasEntry, "id">, tenantId: string, token?: string): Promise<NasEntry> {
    if (USE_MOCKS) {
      await sleep(170);
      return updateMockNasEntry(id, payload) as NasEntry;
    }
    const { data } = await api.put<NasEntry>(`/settings/nas/${encodeURIComponent(id)}`, payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteNasEntries(ids: string[], tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(170);
      return { deleted: deleteMockNasEntries(ids) };
    }
    const { data } = await api.delete("/settings/nas", {
      data: { ids },
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getZones(tenantId: string, token?: string): Promise<Zone[]> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockZones;
    }
    const { data } = await api.get<Zone[]>("/settings/zones", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createZone(payload: Omit<Zone, "id" | "usersCount" | "nasName"> & { usersCount?: number }, tenantId: string, token?: string): Promise<Zone> {
    if (USE_MOCKS) {
      await sleep(170);
      return addMockZone(payload);
    }
    const { data } = await api.post<Zone>("/settings/zones", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteZones(ids: string[], tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(170);
      return { deleted: deleteMockZones(ids) };
    }
    const { data } = await api.delete("/settings/zones", {
      data: { ids },
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getPermissionRoles(tenantId: string, token?: string): Promise<PermissionRole[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return mockPermissionRoles;
    }
    const { data } = await api.get<PermissionRole[]>("/settings/permissions", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deletePermissionRoles(ids: string[], tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(160);
      return { deleted: deleteMockPermissionRoles(ids) };
    }
    const { data } = await api.delete("/settings/permissions", {
      data: { ids },
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async updatePermissionRole(
    id: string,
    payload: {
      privilegeModel?: "Role Based" | "Approval Based" | "Hybrid";
      description?: string;
      permissions?: Partial<PermissionRole["permissions"]>;
    },
    tenantId: string,
    token?: string,
  ): Promise<PermissionRole> {
    if (USE_MOCKS) {
      await sleep(160);
      return updateMockPermissionRole(id, payload);
    }
    const { data } = await api.patch<PermissionRole>(`/settings/permissions/${encodeURIComponent(id)}`, payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createPrivilegeAccount(
    payload: { fullName: string; email: string; role: "admin" | "support" | "noc"; permissionProfileId: string },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(160);
      return addMockPrivilegeAccount(payload);
    }
    const { data } = await api.post("/settings/permissions/accounts", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async updatePrivilegeAccount(
    id: string,
    payload: { permissionProfileId: string },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(160);
      return updateMockPrivilegeAccount(id, payload);
    }
    const { data } = await api.patch(`/settings/permissions/accounts/${encodeURIComponent(id)}`, payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deletePrivilegeAccount(id: string, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(160);
      return deleteMockPrivilegeAccount(id);
    }
    const { data } = await api.delete(`/settings/permissions/accounts/${encodeURIComponent(id)}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deletePrivilegeAccounts(ids: string[], tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(160);
      return { deleted: deleteMockPrivilegeAccounts(ids) };
    }
    const { data } = await api.delete("/settings/permissions/accounts", {
      data: { ids },
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getSettingsLogs(tenantId: string, token?: string): Promise<SettingsLog[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return mockSettingsLogs;
    }
    const { data } = await api.get<SettingsLog[]>("/settings/logs", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getNotificationSettings(tenantId: string, token?: string): Promise<NotificationSettings> {
    if (USE_MOCKS) {
      await sleep(120);
      return getMockNotificationSettings();
    }
    const { data } = await api.get<NotificationSettings>("/settings/notifications", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async updateNotificationSettings(payload: NotificationSettings, tenantId: string, token?: string): Promise<NotificationSettings> {
    if (USE_MOCKS) {
      await sleep(120);
      return updateMockNotificationSettings(payload);
    }
    const { data } = await api.put<NotificationSettings>("/settings/notifications", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteSettingsLogs(ids: string[], tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(160);
      return { deleted: deleteMockSettingsLogs(ids) };
    }
    const { data } = await api.delete("/settings/logs", {
      data: { ids },
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async disconnectRadiusSession(username: string, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(140);
      return disconnectMockRadiusSession(username);
    }
    return api.post(
      "/radius/disconnect",
      { username },
      {
        headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      },
    );
  },

  async suspendCustomer(customerId: string, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(140);
      const found = mockCustomers.find((entry) => entry.id === customerId);
      if (found) found.accountStatus = "suspended";
      return found;
    }
    return api.post(`/customers/${customerId}/suspend`, undefined, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
  },

  async getFaults(tenantId: string, token?: string): Promise<Fault[]> {
    if (USE_MOCKS) {
      await sleep(220);
      return mockFaults;
    }
    const { data } = await api.get<Fault[]>("/faults", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async reportFault(
    payload: Omit<Fault, "id" | "tenantId" | "createdAt">,
    tenantId: string,
    token?: string,
  ): Promise<Fault> {
    if (USE_MOCKS) {
      await sleep(220);
      return addMockFault(payload);
    }
    const { data } = await api.post<Fault>("/faults", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },
};


