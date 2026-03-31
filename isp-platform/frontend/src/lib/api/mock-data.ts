import { FIBRE_CORE_PALETTE } from "@/constants/fibre";
import type {
  AlertItem,
  ClosureBox,
  Customer,
  EngineerActivity,
  Fault,
  FibreCable,
  FibreCore,
  KpiSnapshot,
  NasEntry,
  NetworkNode,
  PermissionRole,
  PrivilegeAccount,
  PrivilegeModel,
  RadiusBulkImportResult,
  RadiusSession,
  RadiusUser,
  ServicePlan,
  SettingsLog,
  SplitterType,
  SplitterPort,
  TenantBranding,
  User,
  Zone,
} from "@/types";
import { randomId } from "@/lib/utils";

const now = Date.now();
const splitterPortCount: Record<SplitterType, number> = {
  "1/2": 2,
  "1/4": 4,
  "1/8": 8,
  "1/16": 16,
};

export function getSplitterPortCount(splitterType: SplitterType) {
  return splitterPortCount[splitterType];
}

export const mockBranding: TenantBranding = {
  tenantId: "tenant-west-001",
  ispName: "WestLink Fibre",
  logoUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=300&auto=format&fit=crop",
  primaryColor: "#0B7285",
};

export const mockUser: User = {
  id: "u-001",
  email: "noc@westlink.io",
  fullName: "NOC Supervisor",
  role: "noc_engineer",
  tenantId: mockBranding.tenantId,
};

const splitter8 = (usedPorts: number[]): SplitterPort[] =>
  Array.from({ length: 8 }, (_, idx) => ({
    port: idx + 1,
    status: usedPorts.includes(idx + 1) ? "used" : "free",
    customerId: usedPorts.includes(idx + 1) ? `cust-10${idx}` : undefined,
    customerName: usedPorts.includes(idx + 1) ? `Client ${idx + 1}` : undefined,
    assignedCoreColor: usedPorts.includes(idx + 1) ? FIBRE_CORE_PALETTE[idx % FIBRE_CORE_PALETTE.length].label.toLowerCase() : undefined,
  }));

export const mockNodes: NetworkNode[] = [
  {
    id: "olt-1",
    tenantId: mockBranding.tenantId,
    type: "olt",
    name: "OLT HQ Core",
    location: { lat: 6.514, lng: 3.379 },
    status: "healthy",
  },
  {
    id: "mst-1",
    tenantId: mockBranding.tenantId,
    type: "mst",
    name: "MST Lekki Phase 1",
    location: { lat: 6.449, lng: 3.469 },
    status: "healthy",
    splitterType: "1/8",
    splitterPorts: splitter8([1, 2, 4]),
    clients: [
      { id: "cust-1001", name: "Adebayo Tech Hub", splitterPort: 2, fiberCore: "blue" },
      { id: "cust-1003", name: "Korede Residential", splitterPort: 4, fiberCore: "green" },
    ],
  },
  {
    id: "mst-2",
    tenantId: mockBranding.tenantId,
    type: "mst",
    name: "MST Chevron Gate",
    location: { lat: 6.438, lng: 3.494 },
    status: "warning",
    splitterType: "1/16",
    splitterPorts: Array.from({ length: 16 }, (_, idx) => ({
      port: idx + 1,
      status: idx < 12 ? "used" : "free",
      customerId: idx < 12 ? `cust-2${idx}` : undefined,
      customerName: idx < 12 ? `Client ${idx + 1}` : undefined,
      assignedCoreColor: idx < 12 ? FIBRE_CORE_PALETTE[idx % FIBRE_CORE_PALETTE.length].label.toLowerCase() : undefined,
    })),
    clients: [{ id: "cust-1002", name: "Marina View Offices", splitterPort: 12, fiberCore: "orange" }],
  },
  {
    id: "pole-1",
    tenantId: mockBranding.tenantId,
    type: "pole",
    name: "Pole 14A",
    location: { lat: 6.463, lng: 3.448 },
    status: "healthy",
  },
  {
    id: "closure-1",
    tenantId: mockBranding.tenantId,
    type: "closure",
    name: "Closure Admiralty Junction",
    location: { lat: 6.444, lng: 3.482 },
    status: "healthy",
  },
  {
    id: "cust-node-1",
    tenantId: mockBranding.tenantId,
    type: "customer",
    name: "Residence C-21",
    location: { lat: 6.455, lng: 3.472 },
    status: "healthy",
  },
  {
    id: "cust-node-2",
    tenantId: mockBranding.tenantId,
    type: "customer",
    name: "Office Marina View",
    location: { lat: 6.442, lng: 3.497 },
    status: "fault",
  },
];

const buildCores = (
  coreCount: 2 | 4 | 8 | 12 | 24,
  used = 4,
  faultIndex?: number,
  fromMstId?: string,
  toMstId?: string,
): FibreCore[] =>
  Array.from({ length: coreCount }, (_, index) => {
    const color = FIBRE_CORE_PALETTE[index % FIBRE_CORE_PALETTE.length];
    return {
    id: `core-${index + 1}`,
    index: index + 1,
    label: `${color.label}-${index + 1}`,
    color: color.hex,
    status: faultIndex === index + 1 ? "faulty" : index < used ? "used" : "free",
    fromMstId: index < used ? fromMstId : undefined,
    toMstId: index < used ? toMstId : undefined,
    usagePath: index < used && fromMstId && toMstId ? `${color.label} core is used from ${fromMstId} to ${toMstId}` : undefined,
  };
  });

export const mockCables: FibreCable[] = [
  {
    id: "cab-1",
    name: "Backbone OLT to MST-1",
    coreCount: 24,
    fromNodeId: "olt-1",
    toNodeId: "mst-1",
    startMstId: "olt-1",
    endMstId: "mst-1",
    distanceMeters: 3680,
    faulted: false,
    coordinates: [
      { lat: 6.514, lng: 3.379 },
      { lat: 6.486, lng: 3.423 },
      { lat: 6.449, lng: 3.469 },
    ],
    cores: buildCores(24, 6, undefined, "olt-1", "mst-1"),
    splices: [
      { id: "sp-1", fromCore: "Blue-1", toCore: "Blue-1", lossDb: 0.11 },
      { id: "sp-2", fromCore: "Orange-2", toCore: "Orange-2", lossDb: 0.13 },
    ],
  },
  {
    id: "cab-2",
    name: "Distribution MST-1 to MST-2",
    coreCount: 12,
    fromNodeId: "mst-1",
    toNodeId: "mst-2",
    startMstId: "mst-1",
    endMstId: "mst-2",
    distanceMeters: 2220,
    faulted: true,
    coordinates: [
      { lat: 6.449, lng: 3.469 },
      { lat: 6.444, lng: 3.482 },
      { lat: 6.438, lng: 3.494 },
    ],
    cores: buildCores(12, 10, 3, "mst-1", "mst-2"),
    splices: [
      { id: "sp-3", fromCore: "Green-3", toCore: "Green-3", lossDb: 0.85 },
      { id: "sp-4", fromCore: "Brown-4", toCore: "Brown-4", lossDb: 0.31 },
    ],
  },
];

export const mockClosures: ClosureBox[] = [
  {
    id: "closure-1",
    name: "Closure Admiralty Junction",
    location: { lat: 6.444, lng: 3.482 },
    connectedCableIds: ["cab-1", "cab-2"],
    splices: [
      {
        id: "splice-1",
        fromCableId: "cab-1",
        fromCoreColor: "blue",
        toCableId: "cab-2",
        toCoreColor: "orange",
        location: { lat: 6.444, lng: 3.482 },
        notes: "Primary tie splice",
      },
    ],
  },
];

export const mockCustomers: Customer[] = [
  {
    id: "cust-1001",
    tenantId: mockBranding.tenantId,
    name: "Adebayo Tech Hub",
    email: "ops@adebayotech.ng",
    phone: "+234 803 200 1122",
    address: "6 Admiralty Way, Lekki",
    location: { lat: 6.455, lng: 3.472 },
    mstId: "mst-1",
    splitterPort: 2,
    fibreCoreId: "core-2",
    onuSerial: "ZTEG12398A",
    oltName: "OLT HQ Core",
    ponPort: "1/3/7",
    rxSignal: -19.1,
    txSignal: 2.1,
    accountStatus: "active",
    online: true,
  },
  {
    id: "cust-1002",
    tenantId: mockBranding.tenantId,
    name: "Marina View Offices",
    email: "it@marinaview.ng",
    phone: "+234 805 900 3388",
    address: "11 Prince Yesufu Abiodun, Oniru",
    location: { lat: 6.442, lng: 3.497 },
    mstId: "mst-2",
    splitterPort: 12,
    fibreCoreId: "core-3",
    onuSerial: "HWT89912XYZ",
    oltName: "OLT HQ Core",
    ponPort: "1/5/3",
    rxSignal: -30.9,
    txSignal: 0.9,
    accountStatus: "active",
    online: false,
  },
  {
    id: "cust-1003",
    tenantId: mockBranding.tenantId,
    name: "Korede Residential",
    email: "korede@example.com",
    phone: "+234 808 611 0556",
    address: "Block C24, Ikate Elegushi",
    location: { lat: 6.451, lng: 3.461 },
    mstId: "mst-1",
    splitterPort: 4,
    fibreCoreId: "core-4",
    onuSerial: "NOK001ABB12",
    oltName: "OLT HQ Core",
    ponPort: "1/3/8",
    rxSignal: -17.8,
    txSignal: 2.9,
    accountStatus: "suspended",
    online: false,
  },
];

export const mockAlerts: AlertItem[] = [
  {
    id: "alert-1",
    title: "Fibre Cut Suspected",
    description: "High loss detected between MST-1 and MST-2 distribution segment.",
    severity: "critical",
    createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
    acknowledged: false,
  },
  {
    id: "alert-2",
    title: "MST Capacity Near Full",
    description: "MST Chevron Gate is at 75% splitter utilization.",
    severity: "major",
    createdAt: new Date(now - 1000 * 60 * 53).toISOString(),
    acknowledged: false,
  },
  {
    id: "alert-3",
    title: "Low Optical Signal",
    description: "Customer cust-1002 below threshold RX level.",
    severity: "minor",
    createdAt: new Date(now - 1000 * 60 * 70).toISOString(),
    acknowledged: true,
  },
];

export const mockActivities: EngineerActivity[] = [
  {
    id: "act-1",
    type: "installation",
    engineerName: "Samuel A.",
    timestamp: new Date(now - 1000 * 60 * 35).toISOString(),
    location: { lat: 6.451, lng: 3.461 },
    note: "Installed ONU for customer cust-1003.",
  },
  {
    id: "act-2",
    type: "splicing",
    engineerName: "Bolanle O.",
    timestamp: new Date(now - 1000 * 60 * 75).toISOString(),
    location: { lat: 6.444, lng: 3.482 },
    note: "Re-spliced core 3 on distribution segment for signal stabilization.",
  },
  {
    id: "act-3",
    type: "fault_repair",
    engineerName: "Ibrahim D.",
    timestamp: new Date(now - 1000 * 60 * 145).toISOString(),
    location: { lat: 6.438, lng: 3.494 },
    note: "Patched damaged drop cable near Chevron gate cabinet.",
  },
];

export const mockFaults: Fault[] = [
  {
    id: "fault-1",
    tenantId: mockBranding.tenantId,
    title: "Distribution Segment Loss Spike",
    description: "Loss > 3.2dB over 500m detected.",
    severity: "critical",
    location: { lat: 6.444, lng: 3.482 },
    affectedCableId: "cab-2",
    affectedNodeId: "mst-2",
    status: "investigating",
    createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
  },
];

export let mockSessions: RadiusSession[] = [
  {
    id: "sess-1",
    customerId: "cust-1001",
    username: "adebayo_hub",
    ipAddress: "10.20.1.17",
    startedAt: new Date(now - 1000 * 60 * 160).toISOString(),
    status: "online",
    dataUsage: "3.8 GiB",
    duration: "02:40:19",
    accountStatus: "active",
    plan: "Core 10/10",
    expirationDate: new Date(now + 1000 * 60 * 60 * 24 * 12).toISOString(),
    lastUpdated: new Date(now - 1000 * 60 * 5).toISOString(),
    accountExists: true,
  },
  {
    id: "sess-2",
    customerId: "cust-1002",
    username: "marina_it",
    ipAddress: "10.20.1.29",
    startedAt: new Date(now - 1000 * 60 * 48).toISOString(),
    status: "offline",
    dataUsage: "1.2 GiB",
    duration: "01:04:02",
    accountStatus: "inactive",
    plan: "Core 20/20",
    expirationDate: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    lastUpdated: new Date(now - 1000 * 60 * 12).toISOString(),
    accountExists: true,
  },
];

export let mockServicePlans: ServicePlan[] = [
  { name: "Core 10/10", speed: "10M/10M", price: "₦8,500", rateLimit: "10M/10M", description: "Residential onboarding plan" },
  { name: "Core 20/20", speed: "20M/20M", price: "₦12,500", rateLimit: "20M/20M", description: "Business starter tier" },
  { name: "Core 50/50", speed: "50M/50M", price: "₦18,900", rateLimit: "50M/50M", description: "Enterprise burst-ready" },
];

export let mockRadiusUsers: RadiusUser[] = [
  {
    username: "adebayo_hub",
    status: "active",
    plan: "Core 10/10",
    customerType: "individual",
    zoneId: "zone-1",
    zone: "Lekki Core",
    nasId: "nas-1",
    nas: "MikroTik BRAS 01",
    expirationDate: new Date(now + 1000 * 60 * 60 * 24 * 12).toISOString(),
    exists: true,
    staticIp: "10.20.1.17",
    lastSeen: new Date(now - 1000 * 60 * 5).toISOString(),
  },
  {
    username: "marina_it",
    status: "inactive",
    plan: "Core 20/20",
    customerType: "corporate",
    zoneId: "zone-2",
    zone: "Ajah Access",
    nasId: "nas-2",
    nas: "MikroTik BRAS 02",
    expirationDate: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    priority: "medium",
    slaProfile: "Business Bronze",
    exists: true,
    lastSeen: new Date(now - 1000 * 60 * 12).toISOString(),
  },
  {
    username: "korede_res",
    status: "inactive",
    plan: "Core 10/10",
    customerType: "individual",
    zoneId: "zone-1",
    zone: "Lekki Core",
    nasId: "nas-1",
    nas: "MikroTik BRAS 01",
    expirationDate: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString(),
    exists: false,
    lastSeen: new Date(now - 1000 * 60 * 90).toISOString(),
  },
];

export let mockNasEntries: NasEntry[] = [
  { id: "nas-1", name: "MikroTik BRAS 01", ipAddress: "10.250.1.2", sharedSecret: "Ultrasecret123!" },
  { id: "nas-2", name: "MikroTik BRAS 02", ipAddress: "10.250.1.3", sharedSecret: "WestlinkCore!" },
];

export let mockZones: Zone[] = [
  { id: "zone-1", name: "Lekki Core", nasId: "nas-1", nasName: "MikroTik BRAS 01", description: "Lekki aggregation and business users", usersCount: 84 },
  { id: "zone-2", name: "Ajah Access", nasId: "nas-2", nasName: "MikroTik BRAS 02", description: "Residential PPPoE subscribers on Ajah ring", usersCount: 56 },
];

export let mockPermissionRoles: PermissionRole[] = [
  {
    id: "role-1",
    name: "Super Admin",
    scope: "global",
    description: "Full OSS/BSS control across tenants and infrastructure",
    memberCount: 2,
    privilegeModel: "Hybrid",
    accounts: [
      { id: "pa-1", fullName: "NOC Superintendent", email: "noc.superintendent@westlink.io", roleId: "role-1" },
      { id: "pa-2", fullName: "Platform Director", email: "platform.director@westlink.io", roleId: "role-1" },
    ],
  },
  {
    id: "role-2",
    name: "NOC Engineer",
    scope: "radius",
    description: "Manages PPPoE sessions, users, and operational troubleshooting",
    memberCount: 2,
    privilegeModel: "Role Based",
    accounts: [
      { id: "pa-3", fullName: "Aisha Bello", email: "aisha.bello@westlink.io", roleId: "role-2" },
      { id: "pa-4", fullName: "Tunde James", email: "tunde.james@westlink.io", roleId: "role-2" },
    ],
  },
  {
    id: "role-3",
    name: "Field Engineer",
    scope: "network",
    description: "Access to sync workflows and physical access diagnostics only",
    memberCount: 2,
    privilegeModel: "Approval Based",
    accounts: [
      { id: "pa-5", fullName: "Sade Okon", email: "sade.okon@westlink.io", roleId: "role-3" },
      { id: "pa-6", fullName: "Emeka Obi", email: "emeka.obi@westlink.io", roleId: "role-3" },
    ],
  },
];

export let mockSettingsLogs: SettingsLog[] = [
  { id: "log-1", type: "authentication", actor: "radius-engine", description: "PPPoE authentication accepted for adebayo_hub", createdAt: new Date(now - 1000 * 60 * 8).toISOString() },
  { id: "log-2", type: "disconnect", actor: "noc@westlink.io", description: "Manual disconnect sent to marina_it from NOC console", createdAt: new Date(now - 1000 * 60 * 22).toISOString() },
  { id: "log-3", type: "sync", actor: "field@westlink.io", description: "PPPoE account sync completed for korede_res on MikroTik BRAS 01", createdAt: new Date(now - 1000 * 60 * 41).toISOString() },
];

export function addMockRadiusUser(payload: {
  username: string;
  password: string;
  plan: string;
  zoneId: string;
  customerType: "individual" | "corporate";
  expirationDate: string;
  staticIp?: string;
  priority?: "high" | "medium" | "low";
  slaProfile?: string;
}) {
  const exists = mockRadiusUsers.some((entry) => entry.username === payload.username);
  if (exists) {
    throw new Error("User already exists");
  }
  const zone = mockZones.find((entry) => entry.id === payload.zoneId);
  if (!zone) {
    throw new Error("Zone not found");
  }
  const nas = mockNasEntries.find((entry) => entry.id === zone.nasId);
  const newUser: RadiusUser = {
    username: payload.username,
    status: "inactive",
    plan: payload.plan,
    customerType: payload.customerType,
    zoneId: zone.id,
    zone: zone.name,
    nasId: zone.nasId,
    nas: nas?.name ?? zone.nasName,
    expirationDate: payload.expirationDate,
    staticIp: payload.staticIp,
    priority: payload.priority,
    slaProfile: payload.slaProfile,
    exists: true,
    lastSeen: new Date().toISOString(),
  };
  mockRadiusUsers.unshift(newUser);
  mockSessions.unshift({
    id: randomId("sess"),
    customerId: randomId("cust"),
    username: payload.username,
    ipAddress: payload.staticIp ?? "Pending",
    startedAt: new Date().toISOString(),
    status: "offline",
    dataUsage: "0 GiB",
    duration: "00:00:00",
    accountStatus: "inactive",
    plan: payload.plan,
    expirationDate: payload.expirationDate,
    lastUpdated: new Date().toISOString(),
    accountExists: true,
  });
  return newUser;
}

export function bulkImportMockRadiusUsers(
  payloads: Array<{
    username: string;
    password: string;
    nas_id: string;
    enabled?: boolean;
    name?: string;
    customer_id?: string;
    company?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    city?: string;
    country?: string;
    state?: string;
    comment?: string;
    gps_lat?: number;
    gps_long?: number;
    mac?: string;
    expiration?: string;
    service_id?: string;
    static_ip?: string;
    created_by?: string;
  }>,
): RadiusBulkImportResult {
  payloads.forEach((payload) => {
    const nas = mockNasEntries.find((entry) => entry.id === payload.nas_id);
    const zone = mockZones.find((entry) => entry.nasId === payload.nas_id) ?? mockZones[0];
    if (!nas || !zone) {
      throw new Error("NAS or zone not found");
    }
    if (mockRadiusUsers.some((entry) => entry.username === payload.username)) {
      throw new Error("Duplicate username");
    }

    const importedUser: RadiusUser = {
      username: payload.username,
      status: payload.enabled ? "active" : "inactive",
      plan: payload.service_id ?? "Imported",
      customerType: "individual",
      zoneId: zone.id,
      zone: zone.name,
      nasId: nas.id,
      nas: nas.name,
      expirationDate: payload.expiration ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      staticIp: payload.static_ip,
      exists: true,
      lastSeen: new Date().toISOString(),
    };

    mockRadiusUsers.unshift(importedUser);
    mockSessions.unshift({
      id: randomId("sess"),
      customerId: payload.customer_id ?? randomId("cust"),
      username: payload.username,
      ipAddress: payload.static_ip ?? "Pending",
      startedAt: new Date().toISOString(),
      status: payload.enabled ? "online" : "offline",
      dataUsage: "0 GiB",
      duration: "00:00:00",
      accountStatus: payload.enabled ? "active" : "inactive",
      plan: payload.service_id ?? "Imported",
      expirationDate: importedUser.expirationDate,
      lastUpdated: new Date().toISOString(),
      accountExists: true,
    });
  });

  return { imported: payloads.length };
}

export function activateMockRadiusUser(username: string) {
  const user = mockRadiusUsers.find((entry) => entry.username === username);
  if (!user) throw new Error("User not found");
  user.status = "active";
  user.lastSeen = new Date().toISOString();
  const session = mockSessions.find((entry) => entry.username === username);
  if (session) {
    session.accountStatus = "active";
    session.status = new Date(user.expirationDate).getTime() < Date.now() ? "offline" : "online";
    session.expirationDate = user.expirationDate;
    session.lastUpdated = new Date().toISOString();
  }
  return user;
}

export function syncMockRadiusUser(username: string) {
  const user = mockRadiusUsers.find((entry) => entry.username === username);
  if (!user) throw new Error("User not found");
  user.lastSeen = new Date().toISOString();
  mockSettingsLogs.unshift({
    id: randomId("log"),
    type: "sync",
    actor: "noc@westlink.io",
    description: `PPPoE account sync completed for ${username}`,
    createdAt: new Date().toISOString(),
  });
  return user;
}

export function reconnectMockRadiusSession(username: string) {
  const session = mockSessions.find((entry) => entry.username === username);
  if (!session) throw new Error("Session not found");
  session.status = "online";
  session.lastUpdated = new Date().toISOString();
  session.startedAt = new Date().toISOString();
  session.duration = "00:00:09";
  mockSettingsLogs.unshift({
    id: randomId("log"),
    type: "disconnect",
    actor: "noc@westlink.io",
    description: `Reconnect workflow triggered for ${username}`,
    createdAt: new Date().toISOString(),
  });
  return session;
}

export function disconnectMockRadiusSession(username: string) {
  const session = mockSessions.find((entry) => entry.username === username);
  if (!session) throw new Error("Session not found");
  session.status = "offline";
  session.lastUpdated = new Date().toISOString();
  mockSettingsLogs.unshift({
    id: randomId("log"),
    type: "disconnect",
    actor: "noc@westlink.io",
    description: `Disconnect sent for ${username}`,
    createdAt: new Date().toISOString(),
  });
  return session;
}

export function extendMockRadiusUser(username: string, expirationDate: string) {
  const user = mockRadiusUsers.find((entry) => entry.username === username);
  if (!user) throw new Error("User not found");
  user.expirationDate = expirationDate;
  const session = mockSessions.find((entry) => entry.username === username);
  if (session) {
    session.expirationDate = expirationDate;
    session.lastUpdated = new Date().toISOString();
  }
  mockSettingsLogs.unshift({
    id: randomId("log"),
    type: "sync",
    actor: "noc@westlink.io",
    description: `Subscription extended for ${username} until ${new Date(expirationDate).toLocaleDateString("en-US")}`,
    createdAt: new Date().toISOString(),
  });
  return user;
}

export function addMockNasEntry(payload: Omit<NasEntry, "id">) {
  const entry: NasEntry = { id: randomId("nas"), ...payload };
  mockNasEntries = [entry, ...mockNasEntries.filter((item) => item.ipAddress !== payload.ipAddress)];
  return entry;
}

export function updateMockNasEntry(id: string, payload: Omit<NasEntry, "id">) {
  mockNasEntries = mockNasEntries.map((item) => (item.id === id ? { id, ...payload } : item));
  return mockNasEntries.find((item) => item.id === id);
}

export function deleteMockNasEntries(ids: string[]) {
  const idSet = new Set(ids);
  const deleted = mockNasEntries.filter((entry) => idSet.has(entry.id)).length;
  mockNasEntries = mockNasEntries.filter((entry) => !idSet.has(entry.id));
  return deleted;
}

export function addMockZone(payload: Omit<Zone, "id" | "usersCount" | "nasName"> & { usersCount?: number }) {
  const nas = mockNasEntries.find((entry) => entry.id === payload.nasId);
  if (!nas) {
    throw new Error("NAS not found");
  }
  const zone: Zone = {
    id: randomId("zone"),
    usersCount: payload.usersCount ?? 0,
    ...payload,
    nasName: nas.name,
  };
  mockZones = [zone, ...mockZones];
  return zone;
}

export function deleteMockZones(ids: string[]) {
  const idSet = new Set(ids);
  const deleted = mockZones.filter((zone) => idSet.has(zone.id)).length;
  mockZones = mockZones.filter((zone) => !idSet.has(zone.id));
  return deleted;
}

export function addMockServicePlan(payload: ServicePlan) {
  const existing = mockServicePlans.find((plan) => plan.name === payload.name);
  if (existing) throw new Error("Service plan already exists");
  mockServicePlans.unshift(payload);
  return payload;
}

export function deleteMockServicePlans(names: string[]) {
  const nameSet = new Set(names);
  const deleted = mockServicePlans.filter((plan) => nameSet.has(plan.name)).length;
  mockServicePlans = mockServicePlans.filter((plan) => !nameSet.has(plan.name));
  return deleted;
}

export function deleteMockRadiusUsers(usernames: string[]) {
  const usernameSet = new Set(usernames);
  const deleted = mockRadiusUsers.filter((user) => usernameSet.has(user.username)).length;
  mockRadiusUsers = mockRadiusUsers.filter((user) => !usernameSet.has(user.username));
  mockSessions = mockSessions.filter((session) => !usernameSet.has(session.username));
  return deleted;
}

export function deleteMockPermissionRoles(ids: string[]) {
  const idSet = new Set(ids);
  const deleted = mockPermissionRoles.filter((role) => idSet.has(role.id)).length;
  mockPermissionRoles = mockPermissionRoles.filter((role) => !idSet.has(role.id));
  return deleted;
}

export function updateMockPermissionRole(id: string, payload: { privilegeModel?: PrivilegeModel; description?: string }) {
  const role = mockPermissionRoles.find((entry) => entry.id === id);
  if (!role) throw new Error("Permission role not found");
  if (payload.privilegeModel) role.privilegeModel = payload.privilegeModel;
  if (payload.description) role.description = payload.description;
  role.memberCount = role.accounts?.length ?? role.memberCount;
  return role;
}

export function addMockPrivilegeAccount(payload: { fullName: string; email: string; roleId: string }): PrivilegeAccount {
  const role = mockPermissionRoles.find((entry) => entry.id === payload.roleId);
  if (!role) throw new Error("Permission role not found");
  const normalizedEmail = payload.email.trim().toLowerCase();
  const exists = mockPermissionRoles.some((entry) =>
    (entry.accounts ?? []).some((account) => account.email.trim().toLowerCase() === normalizedEmail),
  );
  if (exists) throw new Error("Privilege account already exists");

  const account: PrivilegeAccount = {
    id: randomId("pa"),
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    roleId: payload.roleId,
  };
  role.accounts = [account, ...(role.accounts ?? [])];
  role.memberCount = role.accounts.length;
  return account;
}

export function deleteMockSettingsLogs(ids: string[]) {
  const idSet = new Set(ids);
  const deleted = mockSettingsLogs.filter((log) => idSet.has(log.id)).length;
  mockSettingsLogs = mockSettingsLogs.filter((log) => !idSet.has(log.id));
  return deleted;
}

export function buildKpis(): KpiSnapshot {
  const activeCustomers = mockCustomers.filter((c) => c.accountStatus === "active").length;
  const offlineCustomers = mockCustomers.filter((c) => !c.online).length;
  const totalOlts = mockNodes.filter((n) => n.type === "olt").length;
  const activeRadiusSessions = mockSessions.filter((session) => session.status === "online").length;
  return { activeCustomers, offlineCustomers, totalOlts, activeRadiusSessions };
}

export function addMockFault(fault: Omit<Fault, "id" | "createdAt" | "tenantId">) {
  const newFault: Fault = {
    ...fault,
    id: randomId("fault"),
    tenantId: mockBranding.tenantId,
    createdAt: new Date().toISOString(),
  };
  mockFaults.unshift(newFault);
  mockAlerts.unshift({
    id: randomId("alert"),
    title: "New Fault Reported",
    description: fault.description,
    severity: fault.severity,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  });
  return newFault;
}

export function upsertCustomer(customer: Customer) {
  const index = mockCustomers.findIndex((entry) => entry.id === customer.id);
  if (index >= 0) {
    mockCustomers[index] = customer;
  } else {
    mockCustomers.unshift(customer);
  }
}

export function createMockMstConnection(payload: {
  startMstId: string;
  endMstId: string;
  geometry: { lat: number; lng: number }[];
  coreCount: 2 | 4 | 8 | 12 | 24;
}) {
  const startNode = mockNodes.find((node) => node.id === payload.startMstId);
  const endNode = mockNodes.find((node) => node.id === payload.endMstId);
  if (!startNode || !endNode) {
    throw new Error("Selected network nodes were not found.");
  }
  const cable: FibreCable = {
    id: randomId("cab"),
    name: `${startNode.name} to ${endNode.name}`,
    coreCount: payload.coreCount,
    fromNodeId: payload.startMstId,
    toNodeId: payload.endMstId,
    startMstId: payload.startMstId,
    endMstId: payload.endMstId,
    coordinates: payload.geometry,
    distanceMeters: Math.round(Math.hypot(startNode.location.lat - endNode.location.lat, startNode.location.lng - endNode.location.lng) * 111000),
    faulted: false,
    cores: buildCores(payload.coreCount, 0, undefined, payload.startMstId, payload.endMstId),
    splices: [],
  };
  mockCables.unshift(cable);
  return cable;
}

function syncCustomerAssignment(payload: {
  customerId: string;
  mstId?: string;
  splitterPort?: number;
  fibreCoreId?: string;
}) {
  const customer = mockCustomers.find((entry) => entry.id === payload.customerId);
  if (!customer) return;
  customer.mstId = payload.mstId;
  customer.splitterPort = payload.splitterPort;
  customer.fibreCoreId = payload.fibreCoreId;
}

function releaseCustomerCoreAssignments(customerId: string) {
  mockCables.forEach((cable) => {
    cable.cores.forEach((core) => {
      if (core.assignedToCustomerId !== customerId) return;
      core.status = "free";
      core.assignedToCustomerId = undefined;
      core.fromMstId = undefined;
      core.toMstId = undefined;
      core.usagePath = undefined;
    });
  });
}

export function setMockCableCoreState(payload: {
  cableId: string;
  coreId: string;
  status: "free" | "used";
  fromMstId?: string;
  toMstId?: string;
  usagePath?: string;
  assignedToCustomerId?: string;
}) {
  const cable = mockCables.find((entry) => entry.id === payload.cableId);
  if (!cable) throw new Error("Cable not found.");
  const core = cable.cores.find((entry) => entry.id === payload.coreId);
  if (!core) throw new Error("Core not found.");

  if (payload.status === "used") {
    if (core.status === "used" && core.assignedToCustomerId !== payload.assignedToCustomerId) {
      throw new Error("Selected core is already assigned.");
    }
    core.status = "used";
    core.assignedToCustomerId = payload.assignedToCustomerId;
    core.fromMstId = payload.fromMstId ?? cable.startMstId ?? cable.fromNodeId;
    core.toMstId = payload.toMstId ?? cable.endMstId ?? cable.toNodeId;
    core.usagePath = payload.usagePath ?? `${core.label} core is used from ${core.fromMstId ?? "-"} to ${core.toMstId ?? "-"}`;
  } else {
    core.status = "free";
    core.assignedToCustomerId = undefined;
    core.fromMstId = undefined;
    core.toMstId = undefined;
    core.usagePath = undefined;
  }

  return { cableId: cable.id, core };
}

export function assignMockCoreToCable(payload: { cableId: string; coreId: string }) {
  return setMockCableCoreState({
    cableId: payload.cableId,
    coreId: payload.coreId,
    status: "used",
  });
}

export function upsertMockClosureSplice(payload: {
  closureId: string;
  splice: {
    id?: string;
    fromCableId: string;
    fromCoreColor: string;
    toCableId: string;
    toCoreColor: string;
    notes?: string;
  };
}) {
  const closure = mockClosures.find((entry) => entry.id === payload.closureId);
  if (!closure) throw new Error("Closure not found.");

  const spliceId = payload.splice.id ?? randomId("splice");
  const existing = closure.splices.find((entry) => entry.id === spliceId);
  if (existing) {
    existing.fromCableId = payload.splice.fromCableId;
    existing.fromCoreColor = payload.splice.fromCoreColor;
    existing.toCableId = payload.splice.toCableId;
    existing.toCoreColor = payload.splice.toCoreColor;
    existing.notes = payload.splice.notes;
  } else {
    closure.splices.unshift({
      id: spliceId,
      fromCableId: payload.splice.fromCableId,
      fromCoreColor: payload.splice.fromCoreColor,
      toCableId: payload.splice.toCableId,
      toCoreColor: payload.splice.toCoreColor,
      location: closure.location,
      notes: payload.splice.notes,
    });
  }

  return closure;
}

export function removeMockClosureSplice(payload: { closureId: string; spliceId: string }) {
  const closure = mockClosures.find((entry) => entry.id === payload.closureId);
  if (!closure) throw new Error("Closure not found.");
  closure.splices = closure.splices.filter((splice) => splice.id !== payload.spliceId);
  return closure;
}

export function updateMockMstSplitterType(payload: { mstId: string; splitterType: SplitterType }) {
  const mstNode = mockNodes.find((node) => node.id === payload.mstId && node.type === "mst");
  if (!mstNode) throw new Error("MST not found.");

  const nextPortCount = getSplitterPortCount(payload.splitterType);
  const currentPorts = mstNode.splitterPorts ?? [];
  const currentPortMap = new Map(currentPorts.map((port) => [port.port, port]));

  const removedClientIds = currentPorts
    .filter((port) => port.port > nextPortCount && port.customerId)
    .map((port) => port.customerId as string);

  removedClientIds.forEach((clientId) => {
    releaseCustomerCoreAssignments(clientId);
    syncCustomerAssignment({ customerId: clientId });
  });

  mstNode.splitterType = payload.splitterType;
  mstNode.splitterPorts = Array.from({ length: nextPortCount }, (_, index) => {
    const portNumber = index + 1;
    const existing = currentPortMap.get(portNumber);
    if (existing) {
      return {
        port: portNumber,
        status: existing.status,
        customerId: existing.customerId,
        customerName: existing.customerName,
        assignedCoreColor: existing.assignedCoreColor,
      };
    }
    return {
      port: portNumber,
      status: "free",
    };
  });

  mstNode.clients = (mstNode.clients ?? []).filter((client) => client.splitterPort <= nextPortCount);
  return mstNode;
}

export function assignMockClientToMstPort(payload: {
  mstId: string;
  portNumber: number;
  clientId: string;
  clientName: string;
  fiberCore: string;
}) {
  const mstNode = mockNodes.find((node) => node.id === payload.mstId && node.type === "mst");
  if (!mstNode) throw new Error("MST splitter not found.");

  if (!mstNode.splitterPorts) {
    const defaultType = mstNode.splitterType ?? "1/8";
    mstNode.splitterPorts = Array.from({ length: getSplitterPortCount(defaultType) }, (_, index) => ({
      port: index + 1,
      status: "free",
    }));
  }

  const port = mstNode.splitterPorts.find((entry) => entry.port === payload.portNumber);
  if (!port) throw new Error("Selected splitter port was not found.");

  const clientExistingPort = mstNode.splitterPorts.find((entry) => entry.customerId === payload.clientId);
  const replacedClientId = port.customerId && port.customerId !== payload.clientId ? port.customerId : undefined;

  if (replacedClientId) {
    releaseCustomerCoreAssignments(replacedClientId);
    syncCustomerAssignment({ customerId: replacedClientId });
    mstNode.clients = (mstNode.clients ?? []).filter((client) => client.id !== replacedClientId);
  }

  if (clientExistingPort && clientExistingPort.port !== payload.portNumber) {
    clientExistingPort.status = "free";
    clientExistingPort.customerId = undefined;
    clientExistingPort.customerName = undefined;
    clientExistingPort.assignedCoreColor = undefined;
  }

  port.status = "used";
  port.customerId = payload.clientId;
  port.customerName = payload.clientName;
  port.assignedCoreColor = payload.fiberCore;

  mstNode.clients = mstNode.clients ?? [];
  const existingClient = mstNode.clients.find((client) => client.id === payload.clientId);
  if (existingClient) {
    existingClient.splitterPort = payload.portNumber;
    existingClient.fiberCore = payload.fiberCore;
    existingClient.name = payload.clientName;
  } else {
    mstNode.clients.push({
      id: payload.clientId,
      name: payload.clientName,
      splitterPort: payload.portNumber,
      fiberCore: payload.fiberCore,
    });
  }

  syncCustomerAssignment({
    customerId: payload.clientId,
    mstId: payload.mstId,
    splitterPort: payload.portNumber,
  });

  return mstNode;
}

export function removeMockClientFromMstPort(payload: { mstId: string; portNumber: number }) {
  const mstNode = mockNodes.find((node) => node.id === payload.mstId && node.type === "mst");
  if (!mstNode?.splitterPorts) throw new Error("MST splitter not found.");

  const port = mstNode.splitterPorts.find((entry) => entry.port === payload.portNumber);
  if (!port) throw new Error("Selected splitter port was not found.");

  const removedClientId = port.customerId;
  if (removedClientId) {
    mstNode.clients = (mstNode.clients ?? []).filter((client) => client.id !== removedClientId);
    releaseCustomerCoreAssignments(removedClientId);
    syncCustomerAssignment({ customerId: removedClientId });
  }

  port.status = "free";
  port.customerId = undefined;
  port.customerName = undefined;
  port.assignedCoreColor = undefined;

  return {
    mst: mstNode,
    removedClientId,
  };
}

export function deleteMockCable(payload: { cableId: string }) {
  const cableIndex = mockCables.findIndex((entry) => entry.id === payload.cableId);
  if (cableIndex < 0) throw new Error("Cable not found.");

  const removed = mockCables.splice(cableIndex, 1)[0];
  removed.cores
    .map((core) => core.assignedToCustomerId)
    .filter(Boolean)
    .forEach((customerId) => syncCustomerAssignment({ customerId: customerId as string }));

  mockClosures.forEach((closure) => {
    closure.connectedCableIds = closure.connectedCableIds.filter((id) => id !== payload.cableId);
    closure.splices = closure.splices.filter((splice) => splice.fromCableId !== payload.cableId && splice.toCableId !== payload.cableId);
  });

  return removed;
}


export function deleteMockClosure(payload: { closureId: string }) {
  const closureIndex = mockClosures.findIndex((entry) => entry.id === payload.closureId);
  if (closureIndex < 0) throw new Error("Closure not found.");

  const removedClosure = mockClosures.splice(closureIndex, 1)[0];
  const closureNodeIndex = mockNodes.findIndex((node) => node.type === "closure" && node.id === payload.closureId);
  if (closureNodeIndex >= 0) {
    mockNodes.splice(closureNodeIndex, 1);
  }

  return removedClosure;
}

export function deleteMockNode(payload: { nodeId: string }) {
  const nodeIndex = mockNodes.findIndex((entry) => entry.id === payload.nodeId);
  if (nodeIndex < 0) throw new Error("Node not found.");

  const removedNode = mockNodes[nodeIndex];
  const removedCableIds = new Set<string>();

  if (removedNode.type === "mst") {
    const affectedClientIds = new Set<string>();
    (removedNode.splitterPorts ?? []).forEach((port) => {
      if (port.customerId) affectedClientIds.add(port.customerId);
    });
    (removedNode.clients ?? []).forEach((client) => affectedClientIds.add(client.id));

    affectedClientIds.forEach((clientId) => {
      releaseCustomerCoreAssignments(clientId);
      syncCustomerAssignment({ customerId: clientId });
    });

    for (let index = mockCables.length - 1; index >= 0; index -= 1) {
      const cable = mockCables[index];
      if (cable.fromNodeId !== removedNode.id && cable.toNodeId !== removedNode.id) continue;

      removedCableIds.add(cable.id);
      cable.cores
        .map((core) => core.assignedToCustomerId)
        .filter(Boolean)
        .forEach((customerId) => syncCustomerAssignment({ customerId: customerId as string }));
      mockCables.splice(index, 1);
    }

    if (removedCableIds.size > 0) {
      mockClosures.forEach((closure) => {
        closure.connectedCableIds = closure.connectedCableIds.filter((id) => !removedCableIds.has(id));
        closure.splices = closure.splices.filter(
          (splice) => !removedCableIds.has(splice.fromCableId) && !removedCableIds.has(splice.toCableId),
        );
      });
    }
  }

  if (removedNode.type === "closure") {
    const closureIndex = mockClosures.findIndex((entry) => entry.id === removedNode.id);
    if (closureIndex >= 0) {
      mockClosures.splice(closureIndex, 1);
    }
  }

  mockNodes.splice(nodeIndex, 1);
  return {
    node: removedNode,
    removedCableIds: Array.from(removedCableIds),
  };
}
