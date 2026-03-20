export type Role = "super_admin" | "tenant_admin" | "noc_engineer" | "field_engineer";
export type NodeType = "olt" | "mst" | "pole" | "closure" | "customer";
export type SessionStatus = "online" | "offline";
export type FaultSeverity = "minor" | "major" | "critical";
export type AccountStatus = "active" | "suspended";
export type SplitterType = "1/2" | "1/4" | "1/8" | "1/16";

export interface TenantBranding {
  tenantId: string;
  ispName: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  tenantId: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  branding: TenantBranding;
}

export interface KpiSnapshot {
  activeCustomers: number;
  offlineCustomers: number;
  totalOlts: number;
  activeRadiusSessions: number;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: FaultSeverity;
  createdAt: string;
  acknowledged: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface FibreCore {
  id: string;
  index: number;
  label: string;
  color: string;
  status: "free" | "used" | "faulty";
  fromMstId?: string;
  toMstId?: string;
  usagePath?: string;
  assignedToCustomerId?: string;
}

export interface SpliceRecord {
  id: string;
  fromCore: string;
  toCore: string;
  lossDb: number;
}

export interface FibreCable {
  id: string;
  name: string;
  coreCount: 2 | 4 | 8 | 12 | 24;
  fromNodeId: string;
  toNodeId: string;
  startMstId?: string;
  endMstId?: string;
  coordinates: GeoPoint[];
  distanceMeters: number;
  faulted: boolean;
  cores: FibreCore[];
  splices: SpliceRecord[];
}

export interface ClosureSplice {
  id: string;
  fromCableId: string;
  fromCoreColor: string;
  toCableId: string;
  toCoreColor: string;
  location: GeoPoint;
  notes?: string;
}

export interface ClosureBox {
  id: string;
  name: string;
  location: GeoPoint;
  connectedCableIds: string[];
  splices: ClosureSplice[];
}

export interface NetworkNode {
  id: string;
  tenantId: string;
  type: NodeType;
  name: string;
  location: GeoPoint;
  status: "healthy" | "warning" | "fault";
  splitterType?: SplitterType;
  splitterPorts?: SplitterPort[];
  clients?: MSTClient[];
}

export interface SplitterPort {
  port: number;
  status: "free" | "used";
  customerId?: string;
  customerName?: string;
  assignedCoreColor?: string;
}

export interface MSTClient {
  id: string;
  name: string;
  splitterPort: number;
  fiberCore: string;
}

export interface RadiusSession {
  id: string;
  customerId: string;
  username: string;
  ipAddress: string;
  startedAt: string;
  status: SessionStatus;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  location: GeoPoint;
  mstId?: string;
  splitterPort?: number;
  fibreCoreId?: string;
  onuSerial: string;
  oltName: string;
  ponPort: string;
  rxSignal: number;
  txSignal: number;
  accountStatus: AccountStatus;
  online: boolean;
}

export interface EngineerActivity {
  id: string;
  type: "installation" | "splicing" | "fault_repair";
  engineerName: string;
  timestamp: string;
  location: GeoPoint;
  note: string;
}

export interface Fault {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  severity: FaultSeverity;
  location: GeoPoint;
  affectedNodeId?: string;
  affectedCableId?: string;
  status: "open" | "investigating" | "resolved";
  createdAt: string;
}

export interface DashboardRealtimePayload {
  kpis?: Partial<KpiSnapshot>;
  alerts?: AlertItem[];
  activity?: EngineerActivity;
  fault?: Fault;
  customerStatusUpdate?: { customerId: string; online: boolean };
  mapEvent?: {
    type:
      | "core_assigned"
      | "core_released"
      | "client_added"
      | "client_removed"
      | "client_reassigned"
      | "port_used"
      | "splice_created"
      | "splitter_changed"
      | "core_updated"
      | "splice_updated"
      | "cable_deleted"
      | "node_deleted"
      | "closure_deleted";
    mstId?: string;
    cableId?: string;
    closureId?: string;
    portNumber?: number;
    customerId?: string;
    splitterType?: SplitterType;
    core?: FibreCore;
    node?: NetworkNode;
    mst?: NetworkNode;
    cable?: FibreCable;
    closure?: ClosureBox;
    customer?: Customer;
    removedCableIds?: string[];
    deletedNodeId?: string;
    deletedCableId?: string;
    deletedClosureId?: string;
    message?: string;
  };
}

export interface MstConnectionDraft {
  startMstId: string;
  endMstId: string;
  start: GeoPoint;
  end: GeoPoint;
  coreCount: 2 | 4 | 8 | 12 | 24;
}

export interface CustomersQuery {
  search?: string;
}
