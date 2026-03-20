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
  NetworkNode,
  RadiusSession,
  SplitterType,
  SplitterPort,
  TenantBranding,
  User,
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

export const mockSessions: RadiusSession[] = [
  {
    id: "sess-1",
    customerId: "cust-1001",
    username: "adebayo_hub",
    ipAddress: "10.20.1.17",
    startedAt: new Date(now - 1000 * 60 * 160).toISOString(),
    status: "online",
  },
  {
    id: "sess-2",
    customerId: "cust-1002",
    username: "marina_it",
    ipAddress: "10.20.1.29",
    startedAt: new Date(now - 1000 * 60 * 48).toISOString(),
    status: "offline",
  },
];

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
    throw new Error("Selected MST nodes were not found.");
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
