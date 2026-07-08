import axios from "axios";
import type {
  AlertItem,
  AuthResponse,
  ClosureBox,
  Customer,
  CustomerNotification,
  CustomerPayment,
  CustomerPlan,
  CustomerPortalProfile,
  CustomerTicket,
  CustomerTicketCategory,
  OnuTelemetryPayload,
  EngineerActivity,
  FinanceSummary,
  Fault,
  FinancialTransaction,
  FibreCable,
  InventoryItem,
  InventoryMovement,
  InventorySummary,
  InventoryPurchase,
  KpiSnapshot,
  NasEntry,
  NetworkNode,
  PermissionFlags,
  PermissionRole,
  RadiusBulkImportResult,
  RadiusSession,
  RadiusUser,
  ServicePlan,
  StockLocationType,
  StockMovementType,
  SettingsLog,
  Supplier,
  TenantBranding,
  User,
  Zone,
  UsageSnapshot,
  WorkOrder,
} from "@/types";
import {
  addMockNasEntry,
  addMockFault,
  addMockRadiusUser,
  addMockServicePlan,
  addMockZone,
  activateMockRadiusUser,
  assignMockCoreToCable,
  assignMockClientToMstPort,
  bulkImportMockRadiusUsers,
  addPortalTicket,
  activateMockCustomer,
  bulkImportCustomers,
  buildKpis,
  createMockMstConnection,
  createMockPrivilegeAccount,
  createPortalPayment,
  deleteMockCable,
  disconnectMockRadiusSession,
  extendMockRadiusUser,
  deleteMockCustomer,
  deleteMockRadiusUsers,
  deleteMockClosure,
  deleteMockNode,
  getPortalNotifications,
  getPortalPayments,
  getPortalPlans,
  getPortalProfile,
  getPortalTickets,
  getPortalUsage,
  updatePortalTicketStatus,
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
  ingestOnuTelemetry,
  portalLogin,
  setMockCableCoreState,
  upsertMockPermissionMemberAccess,
  syncMockRadiusUser,
  updateMockNasEntry,
  updateMockFault,
  updateMockPermissionRole,
  updateMockMstSplitterType,
  upgradePortalPlan,
  upsertMockClosureSplice,
  upsertCustomer,
  deleteMockFault,
} from "@/lib/api/mock-data";
import { hydrateCableRoute } from "@/lib/fibre-routing";
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

let mockInventorySuppliers: Supplier[] = [
  { id: 1, name: "Main FTTH Supplier", contact_person: "Procurement Desk", phone: "08000000000", email: "supply@westlink.ng" },
  { id: 2, name: "Metro Fiber Depot", contact_person: "Ade Martins", phone: "08031234567", email: "procurement@metrofiber.ng" },
];
let mockInventoryItems: InventoryItem[] = [
  {
    id: 1,
    sku: "ONU-ZTE-F660",
    name: "ZTE F660 ONU",
    category: "device",
    description: "Residential ONU for FTTH activations",
    unit_of_measure: "unit",
    quantity_in_stock: 24,
    unit_cost: 28500,
    selling_price: 38000,
    minimum_stock_level: 10,
    supplier_id: 1,
    is_active: true,
  },
  {
    id: 2,
    sku: "RTR-HUA-AX3",
    name: "Huawei AX3 Router",
    category: "device",
    description: "Dual-band customer premises router",
    unit_of_measure: "unit",
    quantity_in_stock: 9,
    unit_cost: 22000,
    selling_price: 30000,
    minimum_stock_level: 12,
    supplier_id: 1,
    is_active: true,
  },
  {
    id: 3,
    sku: "CAB-1CORE-DROP",
    name: "1 Core Drop Cable",
    category: "cable",
    description: "Last-mile drop cable for residential installs",
    unit_of_measure: "meter",
    quantity_in_stock: 1850,
    unit_cost: 320,
    selling_price: 500,
    minimum_stock_level: 500,
    supplier_id: 2,
    core_type: 1,
    length_meters: 1850,
    is_active: true,
  },
  {
    id: 4,
    sku: "MST-1X8-BOX",
    name: "8 Port MST Closure",
    category: "infrastructure",
    description: "Outdoor MST for distribution zones",
    unit_of_measure: "unit",
    quantity_in_stock: 3,
    unit_cost: 98000,
    selling_price: 130000,
    minimum_stock_level: 4,
    supplier_id: 2,
    is_active: true,
  },
  {
    id: 5,
    sku: "SPL-1X8-PLC",
    name: "1x8 PLC Splitter",
    category: "accessory",
    description: "Balanced splitter for GPON branch distribution",
    unit_of_measure: "unit",
    quantity_in_stock: 18,
    unit_cost: 12500,
    selling_price: 18000,
    minimum_stock_level: 8,
    supplier_id: 2,
    is_active: true,
  },
];
let mockInventoryMovements: InventoryMovement[] = [
  {
    id: 1,
    item_id: 3,
    movement_type: "usage",
    quantity: 80,
    unit_cost: 320,
    total_cost: 25600,
    reference_type: "customer_installation",
    reference_id: "cust-1003",
    job_reference: "WO-240731",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
  {
    id: 2,
    item_id: 1,
    movement_type: "purchase",
    quantity: 10,
    unit_cost: 28500,
    total_cost: 285000,
    reference_type: "inventory_purchase",
    reference_id: "PUR-240720",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
  },
];
let mockFinanceTransactions: FinancialTransaction[] = [
  {
    id: 1,
    transaction_code: "TXN-240701",
    entry_type: "income",
    category: "subscription",
    amount: 12000,
    description: "Adebayo Tech Hub monthly broadband renewal",
    reference_type: "subscription",
    reference_id: "inv-cust-1001",
    client_id: 1,
    payment_id: 1,
    transaction_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 2,
    transaction_code: "TXN-240702",
    entry_type: "income",
    category: "installation",
    amount: 35000,
    description: "New installation fee for Demo Customer",
    reference_type: "customer_installation",
    reference_id: "cust-demo",
    transaction_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 3,
    transaction_code: "TXN-240703",
    entry_type: "expense",
    category: "inventory_purchase",
    amount: 285000,
    description: "ONU replenishment purchase batch",
    reference_type: "inventory_purchase",
    reference_id: "PUR-240720",
    transaction_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: 4,
    transaction_code: "TXN-240704",
    entry_type: "expense",
    category: "logistics",
    amount: 28000,
    description: "Field dispatch fuel and transport",
    reference_type: "logistics",
    reference_id: "OPS-TRIP-09",
    transaction_date: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
];
let mockWorkOrders: WorkOrder[] = [
  {
    id: 1,
    work_order_code: "WO-240731",
    work_type: "installation",
    status: "scheduled",
    inventory_deduction_mode: "automatic",
    approval_status: "not_required",
    title: "Install and activate Korede Residential",
    description: "Final drop deployment, ONU install, and Wi-Fi setup",
    customer_name: "Korede Residential",
    service_address: "Block C24, Ikate Elegushi",
    client_id: 1003,
    assigned_engineer_user_id: 21,
    onu_serial: "NOK001ABB12",
    router_mac: "80:6D:97:23:11:AA",
    installation_fee: 35000,
    priority: "high",
    scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 16).toISOString(),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
    notes: "Customer requested evening installation window.",
    photos: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    materials: [
      {
        id: 1,
        item_id: 1,
        quantity_planned: 1,
        quantity_used: 1,
        unit_cost: 28500,
        total_cost: 28500,
        serial_number: "NOK001ABB12",
      },
      {
        id: 2,
        item_id: 3,
        quantity_planned: 80,
        quantity_used: 80,
        unit_cost: 320,
        total_cost: 25600,
        cable_length_used: 80,
      },
    ],
  },
  {
    id: 2,
    work_order_code: "WO-240732",
    work_type: "repair",
    status: "in_progress",
    inventory_deduction_mode: "manual_approval",
    approval_status: "pending",
    title: "Restore Marina View Offices outage",
    description: "Investigate high loss on cab-2 and replace damaged drop if needed",
    customer_name: "Marina View Offices",
    service_address: "11 Prince Yesufu Abiodun, Oniru",
    client_id: 1002,
    assigned_engineer_user_id: 22,
    installation_fee: 0,
    priority: "critical",
    scheduled_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    escalation_reason: "VIP business customer currently offline.",
    notes: "Escalated from customer care to NOC and field team.",
    photos: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    materials: [
      {
        id: 3,
        item_id: 3,
        quantity_planned: 40,
        quantity_used: 25,
        unit_cost: 320,
        total_cost: 8000,
        cable_length_used: 25,
      },
    ],
  },
  {
    id: 3,
    work_order_code: "WO-240733",
    work_type: "maintenance",
    status: "completed",
    inventory_deduction_mode: "automatic",
    approval_status: "approved",
    title: "Quarterly inspection of MST Lekki Phase 1",
    customer_name: "Network Segment",
    service_address: "Lekki Phase 1",
    installation_fee: 0,
    priority: "medium",
    completed_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    completion_notes: "All ports audited and enclosure cleaned.",
    notes: "Preventive maintenance completed.",
    photos: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    materials: [],
  },
];
let mockInventoryPurchases: InventoryPurchase[] = [
  {
    id: 1,
    purchase_code: "PUR-240720",
    supplier_id: 1,
    purchase_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    total_cost: 285000,
    notes: "Restock ONUs for August installations",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    lines: [
      {
        id: 1,
        item_id: 1,
        quantity: 10,
        unit_cost: 28500,
        total_cost: 285000,
      },
    ],
  },
];

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
      const revenue = mockFinanceTransactions
        .filter((entry) => entry.entry_type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0);
      const expenses = mockFinanceTransactions
        .filter((entry) => entry.entry_type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0);
      return {
        kpis: {
          ...buildKpis(),
          totalCustomers: mockCustomers.length,
          activeCustomers: mockCustomers.filter((customer) => customer.accountStatus === "active").length,
          suspendedCustomers: mockCustomers.filter((customer) => customer.accountStatus === "suspended").length,
          offlineCustomers: mockCustomers.filter((customer) => !customer.online).length,
          revenue,
          overdueInvoices: mockCustomers.filter((customer) => customer.paymentStatus === "overdue").length,
          openTickets: mockCustomers.reduce(
            (sum, customer) =>
              sum +
              (customer.history?.filter((entry) => entry.type === "support" && entry.status !== "closed").length ?? 0),
            0,
          ),
          networkFaults: mockFaults.filter((fault) => fault.status !== "resolved").length,
          technicianJobs: mockWorkOrders.filter((workOrder) => workOrder.status !== "completed").length,
          inventoryValue: mockInventoryItems.reduce((sum, item) => sum + item.quantity_in_stock * item.unit_cost, 0),
          totalIncome: revenue,
          totalExpenses: expenses,
          netProfit: revenue - expenses,
          lowStockItems: mockInventoryItems.filter((item) => item.quantity_in_stock <= item.minimum_stock_level).length,
        },
        alerts: mockAlerts,
        activities: mockActivities,
      };
    }
    const [statsRes, alertsRes] = await Promise.all([
      api.get("/api/dashboard/stats", { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } }),
      api.get("/api/dashboard/alerts", { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } }),
    ]);

    const stats = statsRes.data;
    return {
      kpis: {
        activeCustomers: stats.active_clients ?? 0,
        offlineCustomers: stats.suspended_clients ?? 0,
        totalOlts: stats.total_mst_boxes ?? 0,
        activeRadiusSessions: stats.active_users ?? 0,
        inventoryValue: Number(stats.inventory_value ?? 0),
        totalIncome: Number(stats.total_income ?? 0),
        totalExpenses: Number(stats.total_expenses ?? 0),
        netProfit: Number(stats.net_profit ?? 0),
        lowStockItems: stats.low_stock_items ?? 0,
      },
      alerts: (alertsRes.data.alerts ?? []).map((alert: Record<string, unknown>, index: number) => ({
        id: String(alert.client_id ?? alert.mst_id ?? alert.core_id ?? index),
        title: String(alert.type ?? "alert"),
        description: String(alert.message ?? ""),
        severity:
          alert.severity === "error" ? "critical" : alert.severity === "warning" ? "major" : ("minor" as AlertItem["severity"]),
        createdAt: new Date().toISOString(),
        acknowledged: false,
      })),
      activities: (stats.recent_activities ?? []).map((activity: Record<string, unknown>) => ({
        id: String(activity.id),
        type: "installation",
        engineerName: `User ${activity.user_id ?? "system"}`,
        timestamp: String(activity.created_at ?? new Date().toISOString()),
        location: {
          lat: Number(activity.latitude ?? 0),
          lng: Number(activity.longitude ?? 0),
        },
        note: String(activity.action_description ?? ""),
      })),
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
      await sleep(200);
      return deleteMockCustomer(customerId);
    }
    const { data } = await api.delete(`/customers/${customerId}`, {
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
      return mockCables.map((cable) => hydrateCableRoute(cable));
    }
    const { data } = await api.get<Array<FibreCable & { core_count?: number }>>("/network/fibre", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data.map((cable) => ({
      ...hydrateCableRoute(cable),
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
      return hydrateCableRoute(createMockMstConnection(payload));
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
    return hydrateCableRoute(data);
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
      coreId: string;
      coreLabel: string;
      cableId: string;
      clientLocation: { lat: number; lng: number };
      geometry: Array<{ lat: number; lng: number }>;
      routeMode: "road" | "straight";
      routeSource: "mapbox-directions" | "seeded" | "straight-line-fallback";
      routeFallbackReason?: string;
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
        core_id: payload.coreId,
        core_label: payload.coreLabel,
        cable_id: payload.cableId,
        client_location: payload.clientLocation,
        geometry: payload.geometry,
        route_mode: payload.routeMode,
        route_source: payload.routeSource,
        route_fallback_reason: payload.routeFallbackReason,
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

  async deleteRadiusUsers(usernames: string[], tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(180);
      return deleteMockRadiusUsers(usernames);
    }
    const { data } = await api.request({
      method: "delete",
      url: "/radius/users",
      data: { usernames },
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

  async updatePermissionRole(
    payload: { id: string; payload: { privilegeModel: string; permissionFlags: PermissionFlags } },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(150);
      return updateMockPermissionRole({
        id: payload.id,
        privilegeModel: payload.payload.privilegeModel,
        permissionFlags: payload.payload.permissionFlags,
      });
    }
    const { data } = await api.patch<PermissionRole>(
      `/settings/permissions/${payload.id}`,
      payload.payload,
      { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } },
    );
    return data;
  },

  async createPrivilegeAccount(
    payload: { fullName: string; email: string; role: "admin" | "support" | "noc"; permissionProfileId: string },
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(150);
      return createMockPrivilegeAccount(payload);
    }
    const { data } = await api.post(`/settings/permissions/members`, payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async savePermissionMemberAccess(
    payload: {
      member: {
        id?: string;
        userId?: string;
        fullName: string;
        email: string;
        mapRole: "admin" | "engineer" | "viewer";
        canDelete: boolean;
      };
    },
    tenantId: string,
    token?: string,
  ): Promise<PermissionRole[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return upsertMockPermissionMemberAccess(payload);
    }
    const { data } = await api.put<PermissionRole[]>("/settings/permissions", payload, {
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

  async activateCustomer(customerId: string, tenantId: string, token?: string) {
    if (USE_MOCKS) {
      await sleep(140);
      return activateMockCustomer(customerId);
    }
    return api.post(`/customers/${customerId}/activate`, undefined, {
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

  async updateFault(
    payload: { faultId: string; update: Omit<Fault, "id" | "tenantId" | "createdAt"> },
    tenantId: string,
    token?: string,
  ): Promise<Fault> {
    if (USE_MOCKS) {
      await sleep(220);
      return updateMockFault(payload);
    }
    const { data } = await api.patch<Fault>(`/faults/${payload.faultId}`, payload.update, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async deleteFault(payload: { faultId: string }, tenantId: string, token?: string): Promise<{ id: string }> {
    if (USE_MOCKS) {
      await sleep(180);
      return deleteMockFault(payload);
    }
    const { data } = await api.delete<{ id: string }>(`/faults/${payload.faultId}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async customerPortalLogin(payload: { username: string; password: string }) {
    if (USE_MOCKS) {
      await sleep(200);
      return portalLogin(payload.username, payload.password);
    }
    const { data } = await api.post<{ token: string; customer_id: string }>("/customer-portal/login", payload);
    return { token: data.token, customerId: data.customer_id };
  },

  async getCustomerPortalProfile(customerId: string, token?: string): Promise<CustomerPortalProfile> {
    if (USE_MOCKS) {
      await sleep(180);
      return getPortalProfile(customerId);
    }
    const { data } = await api.get<CustomerPortalProfile>(`/customer-portal/${customerId}/profile`, {
      headers: authHeaders(token),
    });
    return data;
  },

  async getCustomerPortalPlans(): Promise<CustomerPlan[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return getPortalPlans();
    }
    const { data } = await api.get<CustomerPlan[]>("/customer-portal/plans");
    return data;
  },

  async getCustomerPortalTickets(customerId: string, token?: string): Promise<CustomerTicket[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return getPortalTickets(customerId);
    }
    const { data } = await api.get<CustomerTicket[]>(`/customer-portal/${customerId}/tickets`, {
      headers: authHeaders(token),
    });
    return data;
  },

  async createCustomerPortalTicket(
    customerId: string,
    payload: { subject: string; description: string; category: CustomerTicketCategory },
    token?: string,
  ): Promise<CustomerTicket> {
    if (USE_MOCKS) {
      await sleep(180);
      return addPortalTicket(customerId, payload);
    }
    const { data } = await api.post<CustomerTicket>(`/customer-portal/${customerId}/tickets`, payload, {
      headers: authHeaders(token),
    });
    return data;
  },

  async updateCustomerPortalTicket(
    customerId: string,
    payload: { ticketId: string; status: CustomerTicket["status"]; note?: string },
    token?: string,
  ): Promise<CustomerTicket> {
    if (USE_MOCKS) {
      await sleep(160);
      const updated = updatePortalTicketStatus(customerId, payload);
      if (!updated) throw new Error("Ticket not found.");
      return updated;
    }
    const { data } = await api.patch<CustomerTicket>(
      `/customer-portal/${customerId}/tickets/${payload.ticketId}`,
      payload,
      { headers: authHeaders(token) },
    );
    return data;
  },

  async getCustomerPortalNotifications(customerId: string, token?: string): Promise<CustomerNotification[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return getPortalNotifications(customerId);
    }
    const { data } = await api.get<CustomerNotification[]>(`/customer-portal/${customerId}/notifications`, {
      headers: authHeaders(token),
    });
    return data;
  },

  async getCustomerPortalPayments(customerId: string, token?: string): Promise<CustomerPayment[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return getPortalPayments(customerId);
    }
    const { data } = await api.get<CustomerPayment[]>(`/customer-portal/${customerId}/payments`, {
      headers: authHeaders(token),
    });
    return data;
  },

  async createCustomerPortalPayment(
    customerId: string,
    payload: { planId: string; method: CustomerPayment["method"] },
    token?: string,
  ): Promise<CustomerPayment> {
    if (USE_MOCKS) {
      await sleep(180);
      return createPortalPayment(customerId, payload);
    }
    const { data } = await api.post<CustomerPayment>(`/customer-portal/${customerId}/payments`, payload, {
      headers: authHeaders(token),
    });
    return data;
  },

  async upgradeCustomerPortalPlan(
    customerId: string,
    payload: { planId: string },
    token?: string,
  ): Promise<CustomerPortalProfile> {
    if (USE_MOCKS) {
      await sleep(180);
      return upgradePortalPlan(customerId, payload.planId);
    }
    const { data } = await api.post<CustomerPortalProfile>(`/customer-portal/${customerId}/upgrade`, payload, {
      headers: authHeaders(token),
    });
    return data;
  },

  async getCustomerPortalUsage(customerId: string, token?: string): Promise<UsageSnapshot[]> {
    if (USE_MOCKS) {
      await sleep(140);
      return getPortalUsage(customerId);
    }
    const { data } = await api.get<UsageSnapshot[]>(`/customer-portal/${customerId}/usage`, {
      headers: authHeaders(token),
    });
    return data;
  },

  async bulkImportCustomers(
    payload: Array<{ name: string; phone: string; pppoe_username: string; plan: string }>,
    tenantId: string,
    token?: string,
  ) {
    if (USE_MOCKS) {
      await sleep(240);
      return bulkImportCustomers(payload);
    }
    const { data } = await api.post(`/customers/import`, payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async ingestOnuTelemetry(payload: OnuTelemetryPayload, tenantId: string, token?: string): Promise<Customer> {
    if (USE_MOCKS) {
      await sleep(220);
      return ingestOnuTelemetry(payload);
    }
    const { data } = await api.post<Customer>("/network/onu-telemetry", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getInventorySummary(tenantId: string, token?: string): Promise<InventorySummary> {
    if (USE_MOCKS) {
      await sleep(180);
      const usageByItem = mockInventoryMovements
        .filter((movement) => movement.movement_type === "usage")
        .reduce<Record<number, number>>((acc, movement) => {
          acc[movement.item_id] = (acc[movement.item_id] ?? 0) + movement.quantity;
          return acc;
        }, {});
      return {
        total_items: mockInventoryItems.length,
        low_stock_items: mockInventoryItems.filter((item) => item.quantity_in_stock <= item.minimum_stock_level).length,
        total_stock_units: mockInventoryItems.reduce((sum, item) => sum + item.quantity_in_stock, 0),
        inventory_value: mockInventoryItems.reduce((sum, item) => sum + item.quantity_in_stock * item.unit_cost, 0),
        recent_movements: mockInventoryMovements.slice(0, 10),
        most_used_items: Object.entries(usageByItem)
          .map(([itemId, quantity]) => {
            const item = mockInventoryItems.find((entry) => entry.id === Number(itemId));
            return {
              item_id: Number(itemId),
              name: item?.name ?? `Item ${itemId}`,
              quantity_used: String(quantity),
            };
          })
          .slice(0, 5),
        pending_approvals: mockWorkOrders.filter((entry) => entry.approval_status === "pending").length,
      };
    }
    const { data } = await api.get<InventorySummary>("/api/inventory/summary", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getInventoryItems(tenantId: string, token?: string, search?: string, lowStockOnly?: boolean): Promise<InventoryItem[]> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockInventoryItems.filter((item) => {
        const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
        const matchesStock = !lowStockOnly || item.quantity_in_stock <= item.minimum_stock_level;
        return matchesSearch && matchesStock;
      });
    }
    const { data } = await api.get<InventoryItem[]>("/api/inventory/items", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      params: { search, low_stock_only: lowStockOnly || undefined },
    });
    return data;
  },

  async getInventoryMovements(tenantId: string, token?: string): Promise<InventoryMovement[]> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockInventoryMovements;
    }
    const { data } = await api.get<InventoryMovement[]>("/api/inventory/movements", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createInventoryItem(
    payload: Omit<InventoryItem, "id" | "is_active" | "created_at" | "updated_at">,
    tenantId: string,
    token?: string,
  ): Promise<InventoryItem> {
    if (USE_MOCKS) {
      await sleep(180);
      const item: InventoryItem = { ...payload, id: Date.now(), is_active: true };
      mockInventoryItems = [item, ...mockInventoryItems];
      return item;
    }
    const { data } = await api.post<InventoryItem>("/api/inventory/items", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createInventoryMovement(
    payload: {
      item_id: number;
      movement_type: StockMovementType;
      quantity: number;
      unit_cost: number;
      source_location?: StockLocationType;
      destination_location?: StockLocationType;
      notes?: string;
      reference_type: FinancialTransaction["reference_type"];
      reference_id?: string;
      job_reference?: string;
      client_id?: number;
      mst_id?: number;
      fibre_route_id?: number;
    },
    tenantId: string,
    token?: string,
  ): Promise<InventoryMovement> {
    if (USE_MOCKS) {
      await sleep(180);
      const item = mockInventoryItems.find((entry) => entry.id === payload.item_id);
      if (!item) throw new Error("Inventory item not found");
      if (payload.movement_type === "purchase" || payload.movement_type === "return" || payload.movement_type === "adjustment") {
        item.quantity_in_stock += payload.quantity;
      } else if (payload.movement_type === "usage" || payload.movement_type === "sale") {
        item.quantity_in_stock -= payload.quantity;
      }
      const movement: InventoryMovement = {
        id: Date.now(),
        created_at: new Date().toISOString(),
        total_cost: payload.quantity * payload.unit_cost,
        used_by_user_id: undefined,
        latitude: undefined,
        longitude: undefined,
        ...payload,
      };
      mockInventoryMovements = [movement, ...mockInventoryMovements];
      return movement;
    }
    const { data } = await api.post<InventoryMovement>("/api/inventory/movements", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getSuppliers(tenantId: string, token?: string): Promise<Supplier[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return mockInventorySuppliers;
    }
    const { data } = await api.get<Supplier[]>("/api/inventory/suppliers", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getInventoryPurchases(tenantId: string, token?: string): Promise<InventoryPurchase[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return mockInventoryPurchases;
    }
    const { data } = await api.get<InventoryPurchase[]>("/api/inventory/purchases", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createInventoryPurchase(
    payload: {
      supplier_id?: number;
      purchase_date?: string;
      notes?: string;
      reference_id?: string;
      lines: Array<{ item_id: number; quantity: number; unit_cost: number; notes?: string }>;
    },
    tenantId: string,
    token?: string,
  ): Promise<InventoryPurchase> {
    if (USE_MOCKS) {
      await sleep(180);
      const total_cost = payload.lines.reduce((sum, line) => sum + line.quantity * line.unit_cost, 0);
      const purchase: InventoryPurchase = {
        id: Date.now(),
        purchase_code: `PUR-${Date.now()}`,
        supplier_id: payload.supplier_id,
        purchase_date: payload.purchase_date ?? new Date().toISOString(),
        total_cost,
        notes: payload.notes,
        created_at: new Date().toISOString(),
        lines: payload.lines.map((line, index) => ({
          id: Date.now() + index,
          item_id: line.item_id,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          total_cost: line.quantity * line.unit_cost,
          notes: line.notes,
        })),
      };
      mockInventoryPurchases = [purchase, ...mockInventoryPurchases];
      payload.lines.forEach((line) => {
        const item = mockInventoryItems.find((entry) => entry.id === line.item_id);
        if (item) item.quantity_in_stock += line.quantity;
      });
      mockFinanceTransactions = [
        {
          id: Date.now(),
          transaction_code: `TXN-${Date.now()}`,
          entry_type: "expense",
          category: "inventory_purchase",
          amount: total_cost,
          description: `Purchase ${purchase.purchase_code}`,
          reference_type: "inventory_purchase",
          reference_id: purchase.purchase_code,
          transaction_date: purchase.purchase_date,
        },
        ...mockFinanceTransactions,
      ];
      return purchase;
    }
    const { data } = await api.post<InventoryPurchase>("/api/inventory/purchases", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getWorkOrders(tenantId: string, token?: string): Promise<WorkOrder[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return mockWorkOrders;
    }
    const { data } = await api.get<WorkOrder[]>("/api/inventory/work-orders", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createWorkOrder(
    payload: {
      work_type: WorkOrder["work_type"];
      inventory_deduction_mode: WorkOrder["inventory_deduction_mode"];
      title: string;
      description?: string;
      customer_name?: string;
      service_address?: string;
      client_id?: number;
      mst_id?: number;
      fibre_route_id?: number;
      assigned_engineer_user_id?: number;
      onu_serial?: string;
      onu_mac?: string;
      router_mac?: string;
      installation_fee?: number;
      latitude?: number;
      longitude?: number;
      map_reference?: string;
      notes?: string;
      photos?: string[];
      scheduled_at?: string;
      materials: Array<{
        item_id: number;
        quantity_planned: number;
        quantity_used?: number;
        unit_cost?: number;
        serial_number?: string;
        mac_address?: string;
        cable_length_used?: number;
        notes?: string;
      }>;
    },
    tenantId: string,
    token?: string,
  ): Promise<WorkOrder> {
    if (USE_MOCKS) {
      await sleep(180);
      const workOrder: WorkOrder = {
        id: Date.now(),
        work_order_code: `WO-${Date.now()}`,
        work_type: payload.work_type,
        status: payload.scheduled_at ? "scheduled" : "draft",
        inventory_deduction_mode: payload.inventory_deduction_mode,
        approval_status: payload.inventory_deduction_mode === "automatic" ? "not_required" : "pending",
        title: payload.title,
        description: payload.description,
        customer_name: payload.customer_name,
        service_address: payload.service_address,
        client_id: payload.client_id,
        mst_id: payload.mst_id,
        fibre_route_id: payload.fibre_route_id,
        assigned_engineer_user_id: payload.assigned_engineer_user_id,
        onu_serial: payload.onu_serial,
        onu_mac: payload.onu_mac,
        router_mac: payload.router_mac,
        installation_fee: payload.installation_fee ?? 0,
        priority: "medium",
        latitude: payload.latitude,
        longitude: payload.longitude,
        map_reference: payload.map_reference,
        notes: payload.notes,
        photos: payload.photos ?? [],
        scheduled_at: payload.scheduled_at,
        created_at: new Date().toISOString(),
        materials: payload.materials.map((material, index) => ({
          id: Date.now() + index,
          item_id: material.item_id,
          quantity_planned: material.quantity_planned,
          quantity_used: material.quantity_used ?? material.quantity_planned,
          unit_cost: material.unit_cost ?? 0,
          total_cost: (material.quantity_used ?? material.quantity_planned) * (material.unit_cost ?? 0),
          serial_number: material.serial_number,
          mac_address: material.mac_address,
          cable_length_used: material.cable_length_used,
          notes: material.notes,
        })),
      };
      mockWorkOrders = [workOrder, ...mockWorkOrders];
      return workOrder;
    }
    const { data } = await api.post<WorkOrder>("/api/inventory/work-orders", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async completeWorkOrder(
    workOrderId: number,
    payload: {
      notes?: string;
      photos?: string[];
      onu_serial?: string;
      onu_mac?: string;
      router_mac?: string;
      latitude?: number;
      longitude?: number;
      materials: Array<{
        item_id: number;
        quantity_planned: number;
        quantity_used?: number;
        unit_cost?: number;
        serial_number?: string;
        mac_address?: string;
        cable_length_used?: number;
        notes?: string;
      }>;
    },
    tenantId: string,
    token?: string,
  ): Promise<WorkOrder> {
    if (USE_MOCKS) {
      await sleep(180);
      throw new Error("Mock completion is not implemented yet.");
    }
    const { data } = await api.post<WorkOrder>(`/api/inventory/work-orders/${workOrderId}/complete`, payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async approveWorkOrderUsage(workOrderId: number, approval_notes: string | undefined, tenantId: string, token?: string): Promise<WorkOrder> {
    if (USE_MOCKS) {
      await sleep(180);
      const workOrder = mockWorkOrders.find((entry) => entry.id === workOrderId);
      if (!workOrder) throw new Error("Work order not found.");
      workOrder.approval_status = "approved";
      workOrder.notes = [workOrder.notes, approval_notes].filter(Boolean).join("\n");
      workOrder.materials.forEach((material) => {
        const item = mockInventoryItems.find((entry) => entry.id === material.item_id);
        if (item) item.quantity_in_stock = Math.max(0, item.quantity_in_stock - material.quantity_used);
      });
      return workOrder;
    }
    const { data } = await api.post<WorkOrder>(
      `/api/inventory/work-orders/${workOrderId}/approve-usage`,
      { approval_notes },
      { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } },
    );
    return data;
  },

  async getFinanceSummary(tenantId: string, token?: string): Promise<FinanceSummary> {
    if (USE_MOCKS) {
      await sleep(180);
      const total_income = mockFinanceTransactions
        .filter((entry) => entry.entry_type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0);
      const total_expenses = mockFinanceTransactions
        .filter((entry) => entry.entry_type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0);
      const now = Date.now();
      const oneDay = 1000 * 60 * 60 * 24;
      const oneWeek = oneDay * 7;
      const oneMonth = oneDay * 30;
      const expenseTotalWithin = (windowMs: number) =>
        mockFinanceTransactions
          .filter(
            (entry) =>
              entry.entry_type === "expense" &&
              now - new Date(entry.transaction_date).getTime() <= windowMs,
          )
          .reduce((sum, entry) => sum + entry.amount, 0);
      return {
        total_income,
        total_expenses,
        net_profit: total_income - total_expenses,
        cash_flow: total_income - total_expenses,
        inventory_value: mockInventoryItems.reduce((sum, item) => sum + item.quantity_in_stock * item.unit_cost, 0),
        transaction_count: mockFinanceTransactions.length,
        recent_transactions: mockFinanceTransactions.slice(0, 10),
        expenses_today: expenseTotalWithin(oneDay),
        expenses_this_week: expenseTotalWithin(oneWeek),
        expenses_this_month: expenseTotalWithin(oneMonth),
      };
    }
    const { data } = await api.get<FinanceSummary>("/api/finance/summary", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getFinancialTransactions(tenantId: string, token?: string): Promise<FinancialTransaction[]> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockFinanceTransactions;
    }
    const { data } = await api.get<FinancialTransaction[]>("/api/finance/transactions", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createFinancialTransaction(
    payload: Omit<FinancialTransaction, "id" | "transaction_code" | "created_by_user_id" | "created_at" | "updated_at">,
    tenantId: string,
    token?: string,
  ): Promise<FinancialTransaction> {
    if (USE_MOCKS) {
      await sleep(180);
      const transaction: FinancialTransaction = {
        ...payload,
        id: Date.now(),
        transaction_code: `TXN-${Date.now()}`,
      };
      mockFinanceTransactions = [transaction, ...mockFinanceTransactions];
      return transaction;
    }
    const { data } = await api.post<FinancialTransaction>("/api/finance/transactions", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async syncBillingIncome(tenantId: string, token?: string): Promise<{ created: number }> {
    if (USE_MOCKS) {
      await sleep(180);
      return { created: 0 };
    }
    const { data } = await api.post<{ created: number }>("/api/finance/sync/billing-payments", undefined, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },
};


