import { FIBRE_CORE_PALETTE } from "@/constants/fibre";
import type {
  AlertItem,
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
  Fault,
  FibreCable,
  FibreCore,
  KpiSnapshot,
  NasEntry,
  NetworkNode,
  PermissionFlags,
  PermissionMember,
  PermissionRole,
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
  UsageSnapshot,
} from "@/types";
import { calculatePolylineDistanceMeters } from "@/lib/fibre-routing";
import { buildCustomerFromTelemetry } from "@/lib/onu-telemetry";
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

const mapPermissionMembers: PermissionMember[] = [
  {
    id: "perm-member-1",
    userId: mockUser.id,
    fullName: mockUser.fullName,
    email: mockUser.email,
    mapRole: "admin",
    canDelete: true,
    role: "admin",
    permissionProfileId: "role-1",
  },
  {
    id: "perm-member-2",
    userId: "u-field-1",
    fullName: "Field Engineer East",
    email: "field@westlink.io",
    mapRole: "engineer",
    canDelete: false,
    role: "noc",
    permissionProfileId: "role-2",
  },
  {
    id: "perm-member-3",
    userId: "u-view-1",
    fullName: "Audit Viewer",
    email: "audit@westlink.io",
    mapRole: "viewer",
    canDelete: false,
    role: "support",
    permissionProfileId: "role-3",
  },
];

const defaultPermissionFlags: PermissionFlags = {
  radius_access: true,
  disconnect_user: true,
  create_pppoe: true,
  view_customers: true,
  delete_customer: false,
  billing_access: false,
  settings_access: true,
};

function buildPermissionRoles(members: PermissionMember[]): PermissionRole[] {
  const grouped = {
    admin: members.filter((member) => member.mapRole === "admin"),
    engineer: members.filter((member) => member.mapRole === "engineer"),
    viewer: members.filter((member) => member.mapRole === "viewer"),
  };

  return [
    {
      id: "role-1",
      name: "ADMIN",
      scope: "map",
      description: "Full access to add, edit, delete, assign clients, and manage map permissions.",
      memberCount: grouped.admin.length,
      mapRole: "admin",
      permissions: ["add", "edit", "delete", "assign_client", "reroute_fibre", "manage_permissions"],
      permissionFlags: { ...defaultPermissionFlags, delete_customer: true, billing_access: true, settings_access: true },
      privilegeModel: "Role Based",
      canGrantPermissions: true,
      members: grouped.admin,
    },
    {
      id: "role-2",
      name: "ENGINEER",
      scope: "map",
      description: "Can add and edit infrastructure, assign clients from MST, and re-route fibre drops.",
      memberCount: grouped.engineer.length,
      mapRole: "engineer",
      permissions: ["add", "edit", "assign_client", "reroute_fibre"],
      permissionFlags: { ...defaultPermissionFlags, delete_customer: false, billing_access: false, settings_access: false },
      privilegeModel: "Role Based",
      canGrantPermissions: false,
      members: grouped.engineer,
    },
    {
      id: "role-3",
      name: "VIEWER",
      scope: "map",
      description: "Read-only access to network topology, splitter usage, and client fibre paths.",
      memberCount: grouped.viewer.length,
      mapRole: "viewer",
      permissions: [],
      permissionFlags: { ...defaultPermissionFlags, radius_access: false, create_pppoe: false, disconnect_user: false, settings_access: false },
      privilegeModel: "Role Based",
      canGrantPermissions: false,
      members: grouped.viewer,
    },
  ];
}

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
    id: "odf-1",
    tenantId: mockBranding.tenantId,
    type: "odf",
    name: "ODF NOC Room",
    location: { lat: 6.512, lng: 3.383 },
    status: "healthy",
    facilityCables: [{ cableId: "cab-1", notes: "Backbone termination shelf A." }],
    facilitySplices: [
      {
        id: "odf-sp-1",
        fromCableId: "cab-1",
        fromCoreLabel: "Blue-1",
        toCableId: "cab-2",
        toCoreLabel: "Blue-1",
        notes: "Primary cross-connect at ODF shelf A.",
      },
    ],
  },
  {
    id: "cab-1",
    tenantId: mockBranding.tenantId,
    type: "cabinet",
    name: "Cabinet Admiralty Hub",
    location: { lat: 6.452, lng: 3.463 },
    status: "healthy",
    facilityCables: [{ cableId: "cab-2", notes: "Distribution cabinet row 2." }],
    facilitySplices: [],
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
    id: "cust-1001",
    tenantId: mockBranding.tenantId,
    type: "customer",
    name: "Adebayo Tech Hub",
    location: { lat: 6.455, lng: 3.472 },
    status: "healthy",
  },
  {
    id: "cust-1002",
    tenantId: mockBranding.tenantId,
    type: "customer",
    name: "Marina View Offices",
    location: { lat: 6.442, lng: 3.497 },
    status: "fault",
  },
  {
    id: "cust-1003",
    tenantId: mockBranding.tenantId,
    type: "customer",
    name: "Korede Residential",
    location: { lat: 6.451, lng: 3.461 },
    status: "warning",
  },
  {
    id: "cust-demo",
    tenantId: mockBranding.tenantId,
    type: "customer",
    name: "Demo Customer",
    location: { lat: 6.454, lng: 3.471 },
    status: "healthy",
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
    segmentType: "backbone",
    coreCount: 24,
    fromNodeId: "olt-1",
    toNodeId: "mst-1",
    startMstId: "olt-1",
    endMstId: "mst-1",
    start: { lat: 6.514, lng: 3.379 },
    end: { lat: 6.449, lng: 3.469 },
    geometry: [
      { lat: 6.514, lng: 3.379 },
      { lat: 6.486, lng: 3.423 },
      { lat: 6.449, lng: 3.469 },
    ],
    distanceMeters: 3680,
    routeMode: "road",
    routeSource: "seeded",
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
    segmentType: "distribution",
    coreCount: 12,
    fromNodeId: "mst-1",
    toNodeId: "mst-2",
    startMstId: "mst-1",
    endMstId: "mst-2",
    start: { lat: 6.449, lng: 3.469 },
    end: { lat: 6.438, lng: 3.494 },
    geometry: [
      { lat: 6.449, lng: 3.469 },
      { lat: 6.444, lng: 3.482 },
      { lat: 6.438, lng: 3.494 },
    ],
    distanceMeters: 2220,
    routeMode: "road",
    routeSource: "seeded",
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
    id: "cust-demo",
    tenantId: mockBranding.tenantId,
    name: "Demo Customer",
    email: "demo_user@example.com",
    phone: "+234 800 000 0000",
    address: "Demo Address",
    location: { lat: 6.454, lng: 3.471 },
    pppoeUsername: "demo_user",
    onuVendor: "ZTE",
    onuModel: "zte-f660",
    onuSerial: "DEMO-ONU-001",
    routerBrand: "ZTE",
    routerType: "standard",
    deviceStatus: "online",
    lastSeenAt: new Date(now - 1000 * 60 * 5).toISOString(),
    uptimeMinutes: 5420,
    oltName: "OLT HQ Core",
    ponPort: "1/1/2",
    rxSignal: -18.2,
    txSignal: 2.4,
    accountStatus: "active",
    online: true,
    installStatus: "installed",
    installDate: new Date(now - 1000 * 60 * 60 * 24 * 40).toISOString(),
    assignedEngineer: "Bolanle O.",
    lastLogin: new Date(now - 1000 * 60 * 45).toISOString(),
    slaTier: "silver",
  },
  {
    id: "cust-1001",
    tenantId: mockBranding.tenantId,
    name: "Adebayo Tech Hub",
    email: "ops@adebayotech.ng",
    phone: "+234 803 200 1122",
    address: "6 Admiralty Way, Lekki",
    location: { lat: 6.455, lng: 3.472 },
    pppoeUsername: "adebayo_hub",
    onuVendor: "Huawei",
    onuModel: "huawei-hg8245",
    mstId: "mst-1",
    splitterPort: 2,
    fibreCoreId: "core-2",
    onuSerial: "ZTEG12398A",
    routerBrand: "Huawei",
    routerType: "upgraded",
    deviceStatus: "online",
    lastSeenAt: new Date(now - 1000 * 60 * 2).toISOString(),
    uptimeMinutes: 8600,
    oltName: "OLT HQ Core",
    ponPort: "1/3/7",
    rxSignal: -19.1,
    txSignal: 2.1,
    accountStatus: "active",
    online: true,
    installStatus: "installed",
    installDate: new Date(now - 1000 * 60 * 60 * 24 * 120).toISOString(),
    assignedEngineer: "Samuel A.",
    lastLogin: new Date(now - 1000 * 60 * 10).toISOString(),
    slaTier: "gold",
  },
  {
    id: "cust-1002",
    tenantId: mockBranding.tenantId,
    name: "Marina View Offices",
    email: "it@marinaview.ng",
    phone: "+234 805 900 3388",
    address: "11 Prince Yesufu Abiodun, Oniru",
    location: { lat: 6.442, lng: 3.497 },
    pppoeUsername: "marina_view",
    onuVendor: "Nokia",
    onuModel: "nokia-g240",
    mstId: "mst-2",
    splitterPort: 12,
    fibreCoreId: "core-3",
    onuSerial: "HWT89912XYZ",
    routerBrand: "Nokia",
    routerType: "standard",
    deviceStatus: "offline",
    lastSeenAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    uptimeMinutes: 1200,
    oltName: "OLT HQ Core",
    ponPort: "1/5/3",
    rxSignal: -30.9,
    txSignal: 0.9,
    accountStatus: "active",
    online: false,
    installStatus: "installed",
    installDate: new Date(now - 1000 * 60 * 60 * 24 * 70).toISOString(),
    assignedEngineer: "Ibrahim D.",
    lastLogin: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    slaTier: "silver",
  },
  {
    id: "cust-1003",
    tenantId: mockBranding.tenantId,
    name: "Korede Residential",
    email: "korede@example.com",
    phone: "+234 808 611 0556",
    address: "Block C24, Ikate Elegushi",
    location: { lat: 6.451, lng: 3.461 },
    pppoeUsername: "korede_home",
    onuVendor: "Genexis",
    onuModel: "genexis-xg6846",
    mstId: "mst-1",
    splitterPort: 4,
    fibreCoreId: "core-4",
    onuSerial: "NOK001ABB12",
    routerBrand: "Genexis",
    routerType: "standard",
    deviceStatus: "offline",
    lastSeenAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    uptimeMinutes: 980,
    oltName: "OLT HQ Core",
    ponPort: "1/3/8",
    rxSignal: -17.8,
    txSignal: 2.9,
    accountStatus: "suspended",
    online: false,
    installStatus: "scheduled",
    installDate: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString(),
    assignedEngineer: "Bolanle O.",
    lastLogin: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    slaTier: "bronze",
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

export const mockServicePlans: ServicePlan[] = [
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

export let mockPermissionRoles: PermissionRole[] = buildPermissionRoles(mapPermissionMembers);

export function upsertMockPermissionMemberAccess(payload: {
  member: {
    id?: string;
    userId?: string;
    fullName: string;
    email: string;
    mapRole: "admin" | "engineer" | "viewer";
    canDelete: boolean;
  };
}) {
  const normalizedEmail = payload.member.email.trim().toLowerCase();
  const existingMembers = mockPermissionRoles.flatMap((role) => role.members ?? []);
  const existing = existingMembers.find(
    (member) =>
      (payload.member.userId && member.userId === payload.member.userId) ||
      member.email.toLowerCase() === normalizedEmail ||
      (payload.member.id && member.id === payload.member.id),
  );

  const nextMember: PermissionMember = {
    id: existing?.id ?? payload.member.id ?? randomId("perm-member"),
    userId: payload.member.userId ?? existing?.userId,
    fullName: payload.member.fullName.trim(),
    email: normalizedEmail,
    mapRole: payload.member.mapRole,
    canDelete: payload.member.canDelete,
  };

  const nextMembers = [
    ...existingMembers.filter((member) => member.id !== existing?.id && member.email.toLowerCase() !== normalizedEmail),
    nextMember,
  ];

  mockPermissionRoles = buildPermissionRoles(nextMembers);
  return mockPermissionRoles;
}

export function updateMockPermissionRole(payload: { id: string; privilegeModel: string; permissionFlags: PermissionFlags }) {
  mockPermissionRoles = mockPermissionRoles.map((role) =>
    role.id !== payload.id
      ? role
      : {
          ...role,
          privilegeModel: payload.privilegeModel as PermissionRole["privilegeModel"],
          permissionFlags: payload.permissionFlags,
        },
  );
  return mockPermissionRoles.find((role) => role.id === payload.id);
}

export function createMockPrivilegeAccount(payload: {
  fullName: string;
  email: string;
  role: "admin" | "support" | "noc";
  permissionProfileId: string;
}) {
  const targetRole = mockPermissionRoles.find((role) => role.id === payload.permissionProfileId);
  if (!targetRole) throw new Error("Permission profile not found");
  const newMember: PermissionMember = {
    id: randomId("perm-member"),
    fullName: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    mapRole: targetRole.mapRole ?? "viewer",
    canDelete: false,
    role: payload.role,
    permissionProfileId: payload.permissionProfileId,
  };
  const nextMembers = [
    ...(targetRole.members ?? []).filter((member) => member.email.toLowerCase() !== newMember.email),
    newMember,
  ];
  mockPermissionRoles = mockPermissionRoles.map((role) =>
    role.id !== targetRole.id ? role : { ...role, members: nextMembers, memberCount: nextMembers.length },
  );
  return newMember;
}

export const mockSettingsLogs: SettingsLog[] = [
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

export function deleteMockRadiusUsers(usernames: string[]) {
  const usernameSet = new Set(usernames);
  const removed = mockRadiusUsers.filter((entry) => usernameSet.has(entry.username));
  mockRadiusUsers = mockRadiusUsers.filter((entry) => !usernameSet.has(entry.username));
  mockSessions = mockSessions.filter((entry) => !usernameSet.has(entry.username));
  return removed;
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

export function addMockServicePlan(payload: ServicePlan) {
  const existing = mockServicePlans.find((plan) => plan.name === payload.name);
  if (existing) throw new Error("Service plan already exists");
  mockServicePlans.unshift(payload);
  return payload;
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

export function updateMockFault(payload: { faultId: string; update: Omit<Fault, "id" | "tenantId" | "createdAt"> }) {
  const index = mockFaults.findIndex((fault) => fault.id === payload.faultId);
  if (index === -1) throw new Error("Fault not found");
  const current = mockFaults[index];
  const next: Fault = {
    ...current,
    ...payload.update,
  };
  mockFaults[index] = next;
  mockAlerts.unshift({
    id: randomId("alert"),
    title: "Fault Updated",
    description: payload.update.description,
    severity: payload.update.severity,
    acknowledged: false,
    createdAt: new Date().toISOString(),
  });
  return next;
}

export function deleteMockFault(payload: { faultId: string }) {
  const index = mockFaults.findIndex((fault) => fault.id === payload.faultId);
  if (index === -1) throw new Error("Fault not found");
  const [removed] = mockFaults.splice(index, 1);
  return { id: removed.id };
}

export function upsertCustomer(customer: Customer) {
  const index = mockCustomers.findIndex((entry) => entry.id === customer.id);
  if (index >= 0) {
    mockCustomers[index] = customer;
  } else {
    mockCustomers.unshift(customer);
  }
  upsertCustomerNode(customer);
}

function upsertCustomerNode(customer: Customer) {
  const existingIndex = mockNodes.findIndex((node) => node.type === "customer" && node.id === customer.id);
  const node: NetworkNode = {
    id: customer.id,
    tenantId: customer.tenantId,
    type: "customer",
    name: customer.name,
    location: customer.location,
    status: customer.accountStatus === "suspended" ? "warning" : customer.online ? "healthy" : "warning",
  };
  if (existingIndex >= 0) {
    mockNodes[existingIndex] = { ...mockNodes[existingIndex], ...node };
  } else {
    mockNodes.unshift(node);
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
    segmentType: startNode.type === "olt" || endNode.type === "olt" ? "backbone" : "distribution",
    coreCount: payload.coreCount,
    fromNodeId: payload.startMstId,
    toNodeId: payload.endMstId,
    startMstId: payload.startMstId,
    endMstId: payload.endMstId,
    start: payload.geometry[0],
    end: payload.geometry[payload.geometry.length - 1],
    geometry: payload.geometry,
    coordinates: payload.geometry,
    distanceMeters: calculatePolylineDistanceMeters(payload.geometry),
    routeMode: payload.geometry.length > 2 ? "road" : "straight",
    routeSource: payload.geometry.length > 2 ? "mapbox-directions" : "straight-line-fallback",
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
  dropCableId?: string;
  location?: Customer["location"];
}) {
  const customer = mockCustomers.find((entry) => entry.id === payload.customerId);
  if (!customer) return;
  customer.mstId = payload.mstId;
  customer.splitterPort = payload.splitterPort;
  customer.fibreCoreId = payload.fibreCoreId;
  customer.dropCableId = payload.dropCableId;
  if (payload.location) {
    customer.location = payload.location;
    upsertCustomerNode(customer);
  }
}

function ensureMstSplitterPorts(mstNode: NetworkNode) {
  if (mstNode.type !== "mst") return;
  if (mstNode.splitterPorts?.length) return;
  const defaultType = mstNode.splitterType ?? "1/8";
  mstNode.splitterPorts = Array.from({ length: getSplitterPortCount(defaultType) }, (_, index) => ({
    port: index + 1,
    status: "free",
  }));
}

function clearCustomerFromMstPorts(customerId: string) {
  mockNodes.forEach((node) => {
    if (node.type !== "mst") return;
    ensureMstSplitterPorts(node);
    node.splitterPorts = (node.splitterPorts ?? []).map((port) =>
      port.customerId === customerId
        ? {
            ...port,
            status: "free",
            customerId: undefined,
            customerName: undefined,
            assignedCoreColor: undefined,
          }
        : port,
    );
    node.clients = (node.clients ?? []).filter((client) => client.id !== customerId);
  });
}

function removeCustomerDropCable(customerId: string) {
  const removedCableIds: string[] = [];
  for (let index = mockCables.length - 1; index >= 0; index -= 1) {
    const cable = mockCables[index];
    const isClientDrop = cable.segmentType === "drop" || cable.clientId === customerId;
    if (!isClientDrop || cable.clientId !== customerId) continue;
    removedCableIds.push(cable.id);
    mockCables.splice(index, 1);
  }
  return removedCableIds;
}

function buildDropCableCores(payload: {
  coreId: string;
  coreLabel: string;
  fiberCore: string;
  mstId: string;
  clientId: string;
}): FibreCore[] {
  const paletteEntry = FIBRE_CORE_PALETTE.find((entry) => entry.label.toLowerCase() === payload.fiberCore.toLowerCase());
  const usedColor = paletteEntry?.hex ?? payload.fiberCore;
  const spareColor = FIBRE_CORE_PALETTE[1]?.hex ?? "#CBD5E1";

  return [
    {
      id: `${payload.coreId}-drop-active`,
      index: 1,
      label: payload.coreLabel,
      color: usedColor,
      status: "used",
      fromMstId: payload.mstId,
      toMstId: payload.clientId,
      usagePath: `${payload.coreLabel} core is assigned from ${payload.mstId} to ${payload.clientId}`,
      assignedToCustomerId: payload.clientId,
    },
    {
      id: `${payload.coreId}-drop-spare`,
      index: 2,
      label: "Spare-2",
      color: spareColor,
      status: "free",
    },
  ];
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
  clearCustomerFromMstPorts(customerId);
  const removedCableIds = removeCustomerDropCable(customerId);
  syncCustomerAssignment({
    customerId,
    mstId: undefined,
    splitterPort: undefined,
    fibreCoreId: undefined,
    dropCableId: undefined,
  });
  return removedCableIds;
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
  coreId: string;
  coreLabel: string;
  cableId: string;
  clientLocation: Customer["location"];
  geometry: FibreCable["coordinates"];
  routeMode: NonNullable<FibreCable["routeMode"]>;
  routeSource: NonNullable<FibreCable["routeSource"]>;
  routeFallbackReason?: string;
}) {
  const mstNode = mockNodes.find((node) => node.id === payload.mstId && node.type === "mst");
  if (!mstNode) throw new Error("MST splitter not found.");
  const customer = mockCustomers.find((entry) => entry.id === payload.clientId);
  if (!customer) throw new Error("Client was not found in CRM.");
  const upstreamCable = mockCables.find((entry) => entry.id === payload.cableId);
  if (!upstreamCable) throw new Error("Selected fibre cable was not found.");
  const selectedCore = upstreamCable.cores.find((entry) => entry.id === payload.coreId);
  if (!selectedCore) throw new Error("Selected fibre core was not found.");

  ensureMstSplitterPorts(mstNode);

  const port = mstNode.splitterPorts?.find((entry) => entry.port === payload.portNumber);
  if (!port) throw new Error("Selected splitter port was not found.");
  if (selectedCore.status === "used" && selectedCore.assignedToCustomerId !== payload.clientId) {
    throw new Error("Selected fibre core is already assigned.");
  }

  const clientExistingPort = mstNode.splitterPorts?.find((entry) => entry.customerId === payload.clientId);
  const replacedClientId = port.customerId && port.customerId !== payload.clientId ? port.customerId : undefined;
  const previousDropCableIds = removeCustomerDropCable(payload.clientId);
  releaseCustomerCoreAssignments(payload.clientId);

  if (replacedClientId) {
    releaseCustomerCoreAssignments(replacedClientId);
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

  selectedCore.status = "used";
  selectedCore.assignedToCustomerId = payload.clientId;
  selectedCore.fromMstId = payload.mstId;
  selectedCore.toMstId = payload.clientId;
  selectedCore.usagePath = `${payload.coreLabel} core is assigned from ${payload.mstId} to ${payload.clientName} on splitter port ${payload.portNumber}`;

  const dropCableId = customer.dropCableId ?? randomId("drop");
  const geometry = payload.geometry.length
    ? payload.geometry
    : [mstNode.location, payload.clientLocation];
  const dropCable: FibreCable = {
    id: dropCableId,
    name: `${mstNode.name} -> ${payload.clientName}`,
    segmentType: "drop",
    coreCount: 2,
    fromNodeId: mstNode.id,
    toNodeId: payload.clientId,
    startMstId: mstNode.id,
    endMstId: payload.clientId,
    start: geometry[0],
    end: geometry[geometry.length - 1],
    geometry,
    coordinates: geometry,
    distanceMeters: calculatePolylineDistanceMeters(geometry),
    routeMode: payload.routeMode,
    routeSource: payload.routeSource,
    routeFallbackReason: payload.routeFallbackReason,
    clientId: payload.clientId,
    splitterPort: payload.portNumber,
    assignedCoreId: payload.coreId,
    coreUsed: payload.coreLabel,
    faulted: false,
    cores: buildDropCableCores({
      coreId: payload.coreId,
      coreLabel: payload.coreLabel,
      fiberCore: payload.fiberCore,
      mstId: payload.mstId,
      clientId: payload.clientId,
    }),
    splices: [],
  };
  mockCables.unshift(dropCable);

  syncCustomerAssignment({
    customerId: payload.clientId,
    mstId: payload.mstId,
    splitterPort: payload.portNumber,
    fibreCoreId: payload.coreId,
    dropCableId,
    location: payload.clientLocation,
  });

  return {
    mst: mstNode,
    customer: mockCustomers.find((entry) => entry.id === payload.clientId),
    cable: dropCable,
    core: selectedCore,
    replacedClientId,
    removedCableIds: previousDropCableIds,
  };
}

export function removeMockClientFromMstPort(payload: { mstId: string; portNumber: number }) {
  const mstNode = mockNodes.find((node) => node.id === payload.mstId && node.type === "mst");
  if (!mstNode?.splitterPorts) throw new Error("MST splitter not found.");

  const port = mstNode.splitterPorts.find((entry) => entry.port === payload.portNumber);
  if (!port) throw new Error("Selected splitter port was not found.");

  const removedClientId = port.customerId;
  let removedCableId: string | undefined;
  if (removedClientId) {
    mstNode.clients = (mstNode.clients ?? []).filter((client) => client.id !== removedClientId);
    removedCableId = releaseCustomerCoreAssignments(removedClientId)[0];
  }

  port.status = "free";
  port.customerId = undefined;
  port.customerName = undefined;
  port.assignedCoreColor = undefined;

  return {
    mst: mstNode,
    removedClientId,
    removedCableId,
  };
}

export function deleteMockCable(payload: { cableId: string }) {
  const cableIndex = mockCables.findIndex((entry) => entry.id === payload.cableId);
  if (cableIndex < 0) throw new Error("Cable not found.");

  const removed = mockCables.splice(cableIndex, 1)[0];
  if (removed.segmentType === "drop" && removed.clientId) {
    releaseCustomerCoreAssignments(removed.clientId);
  } else {
    removed.cores
      .map((core) => core.assignedToCustomerId)
      .filter(Boolean)
      .forEach((customerId) => releaseCustomerCoreAssignments(customerId as string));
  }

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

    for (let index = mockCables.length - 1; index >= 0; index -= 1) {
      const cable = mockCables[index];
      if (cable.fromNodeId !== removedNode.id && cable.toNodeId !== removedNode.id) continue;

      removedCableIds.add(cable.id);
      cable.cores
        .map((core) => core.assignedToCustomerId)
        .filter(Boolean)
        .forEach((customerId) => affectedClientIds.add(customerId as string));
      mockCables.splice(index, 1);
    }

    affectedClientIds.forEach((clientId) => {
      releaseCustomerCoreAssignments(clientId);
    });

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

export function activateMockCustomer(customerId: string) {
  const customer = mockCustomers.find((entry) => entry.id === customerId);
  if (!customer) throw new Error("Customer not found.");
  customer.accountStatus = "active";
  return customer;
}

export function deleteMockCustomer(customerId: string) {
  const index = mockCustomers.findIndex((entry) => entry.id === customerId);
  if (index < 0) throw new Error("Customer not found.");
  const [removed] = mockCustomers.splice(index, 1);
  const nodeIndex = mockNodes.findIndex((node) => node.type === "customer" && node.id === customerId);
  if (nodeIndex >= 0) mockNodes.splice(nodeIndex, 1);
  releaseCustomerCoreAssignments(customerId);
  return removed;
}

export function ingestOnuTelemetry(payload: OnuTelemetryPayload) {
  const existing = mockCustomers.find((entry) => entry.onuSerial === payload.serial_number);
  const nextCustomer = buildCustomerFromTelemetry(payload, existing, mockBranding.tenantId);
  upsertCustomer(nextCustomer);
  return nextCustomer;
}

export function simulateMockBackendTick() {
  return { changed: false, faultRaised: false };
}

type PortalCredential = {
  username: string;
  password: string;
  customerId: string;
};

export const mockCustomerPlans: CustomerPlan[] = [
  { id: "plan-basic", name: "Basic 10Mbps", speedMbps: 10, priceMonthly: 8500, description: "Starter home plan" },
  { id: "plan-plus", name: "Plus 20Mbps", speedMbps: 20, priceMonthly: 12000, description: "Great for streaming", recommended: true },
  { id: "plan-pro", name: "Pro 50Mbps", speedMbps: 50, priceMonthly: 20000, description: "Multi-device power user" },
  { id: "plan-ultra", name: "Ultra 100Mbps", speedMbps: 100, priceMonthly: 32000, description: "SME & creator bundle" },
];

const portalCredentials: PortalCredential[] = [
  { username: "adebayo_hub", password: "pppoe-1234", customerId: "cust-1001" },
  { username: "marina_view", password: "pppoe-1234", customerId: "cust-1002" },
  { username: "korede_home", password: "pppoe-1234", customerId: "cust-1003" },
  { username: "demo_user", password: "pppoe-1234", customerId: "cust-demo" },
];

const portalProfiles = new Map<string, CustomerPortalProfile>([
  [
    "cust-1001",
    {
      id: "cust-1001",
      name: "Adebayo Tech Hub",
      pppoeUsername: "adebayo_hub",
      planName: "Plus 20Mbps",
      speedMbps: 20,
      status: "active" as const,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
      usageGb: 380,
      capGb: 500,
    },
  ],
  [
    "cust-1002",
    {
      id: "cust-1002",
      name: "Marina View Offices",
      pppoeUsername: "marina_view",
      planName: "Pro 50Mbps",
      speedMbps: 50,
      status: "active" as const,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
      usageGb: 620,
      capGb: 700,
    },
  ],
  [
    "cust-1003",
    {
      id: "cust-1003",
      name: "Korede Residential",
      pppoeUsername: "korede_home",
      planName: "Basic 10Mbps",
      speedMbps: 10,
      status: "suspended" as const,
      expiryDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      usageGb: 140,
      capGb: 200,
    },
  ],
  [
    "cust-demo",
    {
      id: "cust-demo",
      name: "Demo Customer",
      pppoeUsername: "demo_user",
      planName: "Plus 20Mbps",
      speedMbps: 20,
      status: "active" as const,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      usageGb: 120,
      capGb: 300,
    },
  ],
]);

const portalTickets = new Map<string, CustomerTicket[]>([
  [
    "cust-1001",
    [
      {
        id: "tkt-001",
        subject: "Evening speed drops",
        description: "Streaming buffers between 8pm-10pm daily.",
        category: "slow speed",
      status: "in_progress" as const,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        history: [
          {
            id: "tkt-001-1",
            message: "Ticket assigned to field engineer.",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
            author: "NOC",
          },
        ],
      },
    ],
  ],
]);

const portalNotifications = new Map<string, CustomerNotification[]>([
  [
    "cust-1001",
    [
      {
        id: "ntf-1",
        title: "Planned Maintenance",
        message: "Overnight upgrade scheduled for 2am-4am tomorrow.",
        severity: "info",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        read: false,
      },
      {
        id: "ntf-2",
        title: "Payment Reminder",
        message: "Your subscription renews in 7 days.",
        severity: "warning",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        read: false,
      },
    ],
  ],
]);

const portalPayments = new Map<string, CustomerPayment[]>([
  [
    "cust-1001",
    [
      {
        id: "pay-001",
        amount: 12000,
        status: "success",
        reference: "PSK-0001",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
        method: "paystack",
        planName: "Plus 20Mbps",
      },
    ],
  ],
]);

const portalUsage = new Map<string, UsageSnapshot[]>([
  [
    "cust-1001",
    [
      { month: "2026-01", usedGb: 420, capGb: 500 },
      { month: "2026-02", usedGb: 380, capGb: 500 },
      { month: "2026-03", usedGb: 210, capGb: 500 },
    ],
  ],
]);

export function portalLogin(username: string, password: string) {
  const match = portalCredentials.find((entry) => entry.username === username);
  if (!match || match.password !== password) {
    throw new Error("Invalid PPPoE credentials.");
  }
  return {
    token: `portal-${match.customerId}-${Date.now()}`,
    customerId: match.customerId,
  };
}

export function getPortalProfile(customerId: string) {
  const profile = portalProfiles.get(customerId);
  if (!profile) throw new Error("Customer portal profile not found.");
  return profile;
}

export function getPortalPlans() {
  return mockCustomerPlans;
}

export function getPortalTickets(customerId: string) {
  return portalTickets.get(customerId) ?? [];
}

export function addPortalTicket(customerId: string, payload: { subject: string; description: string; category: CustomerTicketCategory }) {
  const nextTicket: CustomerTicket = {
    id: randomId("tkt"),
    subject: payload.subject,
    description: payload.description,
    category: payload.category,
    status: "open" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: randomId("tkt-hist"),
        message: "Ticket created by customer.",
        createdAt: new Date().toISOString(),
        author: "Customer",
      },
    ],
  };
  const existing = portalTickets.get(customerId) ?? [];
  portalTickets.set(customerId, [nextTicket, ...existing]);
  return nextTicket;
}

export function updatePortalTicketStatus(
  customerId: string,
  payload: { ticketId: string; status: CustomerTicket["status"]; note?: string },
) {
  const list = portalTickets.get(customerId) ?? [];
  const next = list.map((ticket) => {
    if (ticket.id !== payload.ticketId) return ticket;
    return {
      ...ticket,
      status: payload.status,
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: randomId("tkt-hist"),
          message: payload.note || `Ticket marked ${payload.status.replace("_", " ")}`,
          createdAt: new Date().toISOString(),
          author: "Customer Care",
        },
        ...ticket.history,
      ],
    };
  });
  portalTickets.set(customerId, next);
  return next.find((ticket) => ticket.id === payload.ticketId);
}

export function getPortalNotifications(customerId: string) {
  return portalNotifications.get(customerId) ?? [];
}

export function getPortalPayments(customerId: string) {
  return portalPayments.get(customerId) ?? [];
}

export function createPortalPayment(customerId: string, payload: { planId: string; method: CustomerPayment["method"] }) {
  const plan = mockCustomerPlans.find((entry) => entry.id === payload.planId);
  if (!plan) throw new Error("Selected plan not found.");
  const payment: CustomerPayment = {
    id: randomId("pay"),
    amount: plan.priceMonthly,
    status: "success" as const,
    reference: `PAY-${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`,
    createdAt: new Date().toISOString(),
    method: payload.method,
    planName: plan.name,
  };
  const existing = portalPayments.get(customerId) ?? [];
  portalPayments.set(customerId, [payment, ...existing]);

  const profile = portalProfiles.get(customerId);
  if (profile) {
    portalProfiles.set(customerId, {
      ...profile,
      planName: plan.name,
      speedMbps: plan.speedMbps,
      status: "active" as const,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    });
  }
  return payment;
}

export function upgradePortalPlan(customerId: string, planId: string) {
  const plan = mockCustomerPlans.find((entry) => entry.id === planId);
  if (!plan) throw new Error("Plan not found.");
  const profile = portalProfiles.get(customerId);
  if (!profile) throw new Error("Customer profile not found.");
  const nextProfile = {
    ...profile,
    planName: plan.name,
    speedMbps: plan.speedMbps,
    status: "active" as const,
  };
  portalProfiles.set(customerId, nextProfile);
  return nextProfile;
}

export function getPortalUsage(customerId: string) {
  return portalUsage.get(customerId) ?? [];
}

export function bulkImportCustomers(rows: Array<{ name: string; phone: string; pppoe_username: string; plan: string }>) {
  let inserted = 0;
  let skipped = 0;

  rows.forEach((row) => {
    const existing = mockCustomers.find((customer) => customer.pppoeUsername === row.pppoe_username);
    if (existing) {
      skipped += 1;
      return;
    }
    const newCustomer: Customer = {
      id: randomId("cust"),
      tenantId: mockBranding.tenantId,
      name: row.name,
      email: `${row.pppoe_username}@example.com`,
      phone: row.phone,
      address: "Imported",
      location: { lat: 6.45, lng: 3.47 },
      pppoeUsername: row.pppoe_username,
      onuVendor: "ZTE",
      onuModel: "zte-f660",
      onuSerial: `ONU-${Math.floor(Math.random() * 99999)}`,
      routerBrand: "ZTE",
      routerType: "standard",
      deviceStatus: "offline",
      lastSeenAt: new Date().toISOString(),
      uptimeMinutes: 0,
      oltName: "OLT HQ Core",
      ponPort: "1/1/1",
      rxSignal: -20,
      txSignal: 2,
      accountStatus: "active",
      online: false,
    };
    mockCustomers.unshift(newCustomer);
    upsertCustomerNode(newCustomer);
    inserted += 1;
  });

  return { inserted, skipped };
}
