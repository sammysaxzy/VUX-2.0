export type Role = "super_admin" | "tenant_admin" | "noc_engineer" | "field_engineer";
export type NodeType = "olt" | "odf" | "cabinet" | "mst" | "pole" | "closure" | "customer";
export type SessionStatus = "online" | "offline";
export type FaultSeverity = "minor" | "major" | "critical";
export type AccountStatus = "active" | "suspended";
export type SplitterType = "1/2" | "1/4" | "1/8" | "1/16";
export type MapAccessRole = "admin" | "engineer" | "viewer";
export type MapPermission =
  | "add"
  | "edit"
  | "delete"
  | "assign_client"
  | "reroute_fibre"
  | "manage_permissions";

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

export type FibreRouteMode = "road" | "straight";
export type FibreRouteSource = "mapbox-directions" | "seeded" | "straight-line-fallback";

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

export interface FacilityCableLink {
  cableId: string;
  notes?: string;
}

export interface FacilitySplice {
  id: string;
  fromCableId: string;
  fromCoreLabel: string;
  toCableId: string;
  toCoreLabel: string;
  notes?: string;
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
  start?: GeoPoint;
  end?: GeoPoint;
  geometry?: GeoPoint[];
  coordinates: GeoPoint[];
  distanceMeters: number;
  routeMode?: FibreRouteMode;
  routeSource?: FibreRouteSource;
  routeFallbackReason?: string;
  segmentType?: "backbone" | "distribution" | "drop";
  flowDirection?: "incoming" | "outgoing" | "drop";
  clientId?: string;
  splitterPort?: number;
  assignedCoreId?: string;
  coreUsed?: string;
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
  facilityCables?: FacilityCableLink[];
  facilitySplices?: FacilitySplice[];
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
  dataUsage?: string;
  duration?: string;
  accountStatus?: RadiusUserStatus;
  plan?: string;
  expirationDate?: string;
  lastUpdated?: string;
  accountExists?: boolean;
}

export type RadiusUserStatus = "active" | "inactive";
export type CustomerType = "individual" | "corporate";
export type PriorityLevel = "high" | "medium" | "low";

export interface RadiusUser {
  username: string;
  status: RadiusUserStatus;
  plan: string;
  customerType: CustomerType;
  zoneId: string;
  zone: string;
  nasId: string;
  nas: string;
  expirationDate: string;
  staticIp?: string;
  priority?: PriorityLevel;
  slaProfile?: string;
  exists: boolean;
  lastSeen: string;
}

export interface RadiusBulkImportResult {
  imported: number;
}

export interface ServicePlan {
  name: string;
  speed: string;
  price: string;
  rateLimit: string;
  description?: string;
  customerTypes?: CustomerType[];
}

export type RadiusRealtimeEvent =
  | { type: "session:connected"; payload: RadiusSession }
  | { type: "session:updated"; payload: RadiusSession }
  | { type: "session:disconnected"; payload: RadiusSession };

export type RadiusTab = "sessions" | "users";

export type SettingsTab = "nas" | "zones" | "permissions" | "services" | "logs" | "configuration";

export interface NasEntry {
  id: string;
  name: string;
  ipAddress: string;
  sharedSecret: string;
}

export interface Zone {
  id: string;
  name: string;
  nasId: string;
  nasName: string;
  description: string;
  usersCount: number;
}

export interface PermissionRole {
  id: string;
  name: string;
  scope: string;
  description: string;
  memberCount: number;
  mapRole?: MapAccessRole;
  permissions?: MapPermission[];
  canGrantPermissions?: boolean;
  members?: PermissionMember[];
}

export interface PermissionMember {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  mapRole: MapAccessRole;
  canDelete: boolean;
}

export interface SettingsLog {
  id: string;
  type: "authentication" | "disconnect" | "sync";
  actor: string;
  description: string;
  createdAt: string;
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
  dropCableId?: string;
  onuVendor?: string;
  onuModel?: string;
  onuSerial: string;
  routerBrand?: string;
  routerType?: "standard" | "upgraded";
  deviceStatus?: "online" | "offline";
  lastSeenAt?: string;
  uptimeMinutes?: number;
  oltName: string;
  ponPort: string;
  rxSignal: number;
  txSignal: number;
  accountStatus: AccountStatus;
  online: boolean;
  pppoeUsername?: string;
  installStatus?: "pending" | "scheduled" | "installed";
  installDate?: string;
  assignedEngineer?: string;
  lastLogin?: string;
  slaTier?: "gold" | "silver" | "bronze";
}

export type CustomerPortalStatus = "active" | "suspended";
export type CustomerTicketStatus = "open" | "in_progress" | "resolved";
export type CustomerTicketCategory = "slow speed" | "no internet" | "billing" | "other";
export type NotificationSeverity = "info" | "warning" | "critical";
export type PaymentStatus = "pending" | "success" | "failed";

export interface CustomerPortalProfile {
  id: string;
  name: string;
  pppoeUsername: string;
  planName: string;
  speedMbps: number;
  status: CustomerPortalStatus;
  expiryDate?: string;
  usageGb?: number;
  capGb?: number;
}

export interface CustomerPlan {
  id: string;
  name: string;
  speedMbps: number;
  priceMonthly: number;
  description?: string;
  recommended?: boolean;
}

export interface CustomerTicketUpdate {
  id: string;
  message: string;
  createdAt: string;
  author: string;
}

export interface CustomerTicket {
  id: string;
  subject: string;
  description: string;
  category: CustomerTicketCategory;
  status: CustomerTicketStatus;
  createdAt: string;
  updatedAt: string;
  history: CustomerTicketUpdate[];
}

export interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: string;
  read: boolean;
}

export interface CustomerPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
  reference: string;
  createdAt: string;
  method: "paystack" | "flutterwave" | "stripe";
  planName: string;
}

export interface UsageSnapshot {
  month: string;
  usedGb: number;
  capGb?: number;
}

export interface OnuTelemetryPayload {
  serial_number: string;
  brand?: string;
  pon_port: string;
  olt_name: string;
  rx_power: number;
  tx_power: number;
  status: "online" | "offline";
  pppoe_username?: string;
  router_type?: "standard" | "upgraded";
  location?: GeoPoint;
  uptime_minutes?: number;
  last_seen?: string;
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
  deviceTelemetry?: OnuTelemetryPayload;
  mapEvent?: {
    type:
      | "core_assigned"
      | "core_released"
      | "client_added"
      | "client_removed"
      | "client_reassigned"
      | "client_route_updated"
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
