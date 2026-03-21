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
  NetworkNode,
  RadiusPlan,
  RadiusSettings,
  RadiusSession,
  RadiusUser,
  TenantBranding,
  User,
} from "@/types";
import {
  addMockFault,
  addMockRadiusUser,
  activateMockRadiusUser,
  assignMockCoreToCable,
  assignMockClientToMstPort,
  buildKpis,
  createMockMstConnection,
  deleteMockCable,
  mockActivities,
  mockAlerts,
  mockBranding,
  mockCables,
  mockClosures,
  mockCustomers,
  mockFaults,
  mockNodes,
  mockRadiusPlans,
  mockRadiusSettings,
  mockRadiusUsers,
  mockSessions,
  mockUser,
  removeMockClientFromMstPort,
  removeMockClosureSplice,
  setMockCableCoreState,
  updateMockMstSplitterType,
  updateMockRadiusSettings,
  upsertMockClosureSplice,
  upsertCustomer,
} from "@/lib/api/mock-data";
import { randomId } from "@/lib/utils";

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

const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS ?? "true") === "true";

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
      onuSerial: string;
      olt: string;
      ponPort: string;
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

  async getRadiusPlans(tenantId: string, token?: string): Promise<RadiusPlan[]> {
    if (USE_MOCKS) {
      await sleep(200);
      return mockRadiusPlans;
    }
    const { data } = await api.get<RadiusPlan[]>("/radius/plans", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getRadiusSettings(tenantId: string, token?: string): Promise<RadiusSettings> {
    if (USE_MOCKS) {
      await sleep(150);
      return mockRadiusSettings;
    }
    const { data } = await api.get<RadiusSettings>("/radius/settings", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async saveRadiusSettings(payload: RadiusSettings, tenantId: string, token?: string): Promise<RadiusSettings> {
    if (USE_MOCKS) {
      await sleep(160);
      return updateMockRadiusSettings(payload);
    }
    const { data } = await api.post<RadiusSettings>("/radius/settings", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async disconnectRadiusSession(username: string, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(140);
      const found = mockSessions.find((entry) => entry.username === username);
      if (found) found.status = "offline";
      return found;
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
