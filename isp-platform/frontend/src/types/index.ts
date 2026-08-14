export type Role =
  | "super_admin"
  | "tenant_admin"
  | "isp_admin"
  | "admin"
  | "manager"
  | "support"
  | "customer_care"
  | "noc"
  | "noc_viewer"
  | "noc_engineer"
  | "field_engineer"
  | "engineer"
  | "accountant"
  | "finance"
  | "store_manager";
export type NodeType = "pop" | "olt" | "odf" | "cabinet" | "mst" | "pole" | "manhole" | "closure" | "customer";
export type SessionStatus = "online" | "offline";
export type FaultSeverity = "minor" | "major" | "critical";
export type AccountStatus = "active" | "suspended";
export type SplitterType = "1/2" | "1/4" | "1/8" | "1/16";
export type FibreCoreCount = 2 | 4 | 8 | 12 | 24 | 48 | 96 | 144 | 288;
export type FibreInstallationMethod = "underground" | "aerial" | "duct" | "indoor";
export type FibreRouteStatus = "existing" | "planned" | "temporary" | "maintenance";
export type MapAccessRole = "admin" | "engineer" | "viewer";
export type MemberRole = "admin" | "support" | "noc";
export type PrivilegeModel = "Role Based" | "Approval Based" | "Hybrid";
export type PermissionKey =
  | "radius_access"
  | "disconnect_user"
  | "create_pppoe"
  | "view_customers"
  | "delete_customer"
  | "billing_access"
  | "settings_access"
  | "inventory_access"
  | "finance_access";
export type PermissionFlags = Record<PermissionKey, boolean>;
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

export interface TenantProfile {
  tenantId: string;
  companyName: string;
  legalName?: string;
  logoUrl?: string;
  primaryColor?: string;
  supportEmail: string;
  supportPhone: string;
  billingEmail?: string;
  address: string;
  website?: string;
  timezone: string;
  currency: string;
  taxId?: string;
  registrationNumber?: string;
  defaultBillingCycle: "monthly" | "quarterly" | "annually";
  paymentGateway: "paystack" | "flutterwave" | "manual";
  mapProvider: "mapbox" | "google_maps" | "openstreetmap";
  whatsappEnabled: boolean;
  companyNotes?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  tenantId: string;
  permissionProfileId?: string;
  permissions?: PermissionFlags;
  delete_customer?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  branding: TenantBranding;
}

export interface KpiSnapshot {
  totalCustomers?: number;
  activeCustomers: number;
  suspendedCustomers?: number;
  offlineCustomers: number;
  totalOlts: number;
  activeRadiusSessions: number;
  revenue?: number;
  overdueInvoices?: number;
  openTickets?: number;
  networkFaults?: number;
  technicianJobs?: number;
  inventoryValue?: number;
  totalIncome?: number;
  totalExpenses?: number;
  netProfit?: number;
  lowStockItems?: number;
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

export interface AssetPhotoSlot {
  id: string;
  label: "before_installation" | "after_installation" | "current_condition";
  title: string;
  url?: string;
  note?: string;
  capturedAt?: string;
}

export type FibreRouteMode = "road" | "straight";
export type FibreRouteSource = "mapbox-directions" | "seeded" | "straight-line-fallback";

export interface FibreCore {
  id: string;
  index: number;
  label: string;
  color: string;
  status: "free" | "used" | "reserved" | "faulty" | "damaged" | "dark";
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
  coreCount: FibreCoreCount;
  fromNodeId: string;
  toNodeId: string;
  startAssetType?: NodeType;
  startAssetName?: string;
  endAssetType?: NodeType;
  endAssetName?: string;
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
  routeType?: "backbone" | "distribution" | "drop" | "feeder" | "access";
  flowDirection?: "incoming" | "outgoing" | "drop";
  routeStatus?: FibreRouteStatus;
  installationMethod?: FibreInstallationMethod;
  owner?: string;
  cableType?: string;
  installDate?: string;
  depthMeters?: number;
  heightMeters?: number;
  notes?: string;
  slackLoops?: Array<{
    id: string;
    lengthMeters: number;
    location: string;
    loopCount: number;
    coilDiameterMeters: number;
    note?: string;
  }>;
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
  photos?: AssetPhotoSlot[];
}

export interface NetworkNode {
  id: string;
  tenantId: string;
  type: NodeType;
  name: string;
  location: GeoPoint;
  status: "healthy" | "warning" | "fault";
  photos?: AssetPhotoSlot[];
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
  id?: string;
  tenantId?: string;
  name: string;
  category?: "residential" | "business" | "dedicated" | "custom";
  speed: string;
  price: string;
  rateLimit: string;
  description?: string;
  customerTypes?: CustomerType[];
  billingCycle?: "monthly" | "quarterly" | "annually";
  status?: "active" | "draft" | "archived";
  speedMbps?: number;
  priceMonthly?: number;
}

export type RadiusRealtimeEvent =
  | { type: "session:connected"; payload: RadiusSession }
  | { type: "session:updated"; payload: RadiusSession }
  | { type: "session:disconnected"; payload: RadiusSession };

export type RadiusTab = "sessions" | "users";

export type SettingsTab =
  | "company"
  | "nas"
  | "zones"
  | "permissions"
  | "services"
  | "notifications"
  | "coverage"
  | "logs"
  | "configuration";

export interface PaymentProviderConfig {
  id: number;
  tenant_id: string;
  provider: "paystack" | "flutterwave" | "manual";
  public_key_env?: string;
  secret_key_env?: string;
  webhook_secret_env?: string;
  currency: string;
  enabled: boolean;
  enabled_methods: string[];
  automatic_activation: boolean;
  manual_confirmation: boolean;
  callback_url?: string;
  receipt_branding: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export interface ActivationQueueRecord {
  id: number;
  record_key: string;
  title?: string;
  status: string;
  client_id?: number;
  payload: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ActivationRetryResponse {
  success: boolean;
  status: string;
  message: string;
  external_reference?: string;
}

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
  permissionFlags?: PermissionFlags;
  privilegeModel?: PrivilegeModel;
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
  role?: MemberRole;
  permissionProfileId?: string;
}

export interface PrivilegeMember {
  id: string;
  fullName: string;
  email: string;
  role: MemberRole;
  permissionProfileId?: string;
  profileName?: string;
  permissions?: PermissionFlags;
}

export interface SettingsLog {
  id: string;
  tenantId?: string;
  type:
    | "authentication"
    | "disconnect"
    | "sync"
    | "create"
    | "update"
    | "delete"
    | "assign"
    | "billing"
    | "inventory"
    | "fault"
    | "notification";
  actor: string;
  module?: string;
  description: string;
  createdAt: string;
}

export interface NotificationRule {
  id: string;
  tenantId: string;
  name: string;
  channels: Array<"email" | "sms" | "whatsapp" | "in_app">;
  trigger:
    | "payment_reminder"
    | "payment_success"
    | "outage_alert"
    | "ticket_update"
    | "installation_update"
    | "low_stock_alert";
  enabled: boolean;
  audience: "customer" | "operations" | "management";
  templateNote?: string;
}

export interface ServiceArea {
  id: string;
  tenantId: string;
  name: string;
  type: "estate" | "street" | "town" | "pop" | "service_zone";
  parentName?: string;
  status: "active" | "planned" | "maintenance";
  households?: number;
  notes?: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  email?: string;
  source: "estate_campaign" | "referral" | "walk_in" | "website" | "social_media";
  status: "new" | "survey_scheduled" | "proposal_sent" | "negotiating" | "converted" | "lost";
  serviceAreaId?: string;
  serviceAreaName?: string;
  address: string;
  followUpDate?: string;
  assignedMarketer?: string;
  surveyStatus?: "pending" | "booked" | "completed";
  interestedPlan?: string;
  notes?: string;
}

export interface AiNocResponse {
  id: string;
  tenantId: string;
  prompt: string;
  mode: "support" | "fault_analysis" | "report" | "outage_explanation" | "technician_guidance";
  response: string;
  createdAt: string;
}

export interface CustomerKycRecord {
  idType: "national_id" | "drivers_license" | "international_passport" | "voters_card";
  idNumber: string;
  addressProof: string;
  customerPhoto: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedAt?: string;
}

export interface CustomerDocument {
  id: string;
  name: string;
  type:
    | "service_agreement"
    | "kyc_document"
    | "invoice"
    | "receipt"
    | "installation_form"
    | "site_survey"
    | "contractor_agreement";
  status: "available" | "pending_signature" | "expired";
  uploadedAt: string;
  reference?: string;
}

export interface CustomerSlaMetrics {
  profile: "standard" | "business" | "dedicated";
  uptimeTarget: string;
  currentUptime: string;
  downtimeMinutes: number;
  averageResponseMinutes: number;
  averageResolutionMinutes: number;
  breachCount: number;
  faultDurationMinutes: number;
  breachRisk: "normal" | "warning" | "critical";
}

export interface SiteManagementRecord {
  id: string;
  name: string;
  type: "pop" | "base_station" | "cabinet" | "shelter" | "rack" | "power_site";
  location: GeoPoint;
  serviceAreaName: string;
  powerStatus: "normal" | "warning" | "critical";
  batteryStatus: "healthy" | "degraded" | "offline";
  inverterStatus: "healthy" | "warning" | "fault";
  uplink: string;
  oltName?: string;
  routerName?: string;
  equipment: string[];
  maintenanceHistory: Array<{
    id: string;
    title: string;
    performedAt: string;
    engineer: string;
    notes: string;
  }>;
}

export interface NocAlert {
  id: string;
  category: "customer" | "optical" | "latency" | "packet_loss" | "bandwidth" | "device";
  severity: "normal" | "warning" | "critical";
  title: string;
  description: string;
  source: string;
  affectedCount?: number;
  createdAt: string;
}

export interface UsageAnalyticsSnapshot {
  totalCapacityMbps: number;
  peakUsageMbps: number;
  averageUsageMbps: number;
  peakHourWindow: string;
  planUtilization: Array<{ planName: string; averageUsageMbps: number; subscribers: number }>;
  topUsers: Array<{ customerName: string; usageGb: number; planName: string }>;
  customerUsage: Array<{ customerId: string; customerName: string; usageGb: number; planName: string }>;
}

export interface EnterpriseSlaReport {
  id: string;
  customerName: string;
  serviceWindow: string;
  uptime: string;
  downtimeMinutes: number;
  responseMinutes: number;
  resolutionMinutes: number;
  breachStatus: "met" | "at_risk" | "breached";
}

export interface ProcurementRecord {
  id: string;
  vendorName: string;
  type: "quotation" | "purchase_order";
  reference: string;
  itemSummary: string;
  amount: number;
  deliveryStatus: "pending" | "in_transit" | "delivered";
  paymentStatus: "pending" | "part_paid" | "paid";
  createdAt: string;
}

export interface ExpenseSummaryLine {
  category: "fuel" | "contractors" | "materials" | "maintenance" | "salaries" | "site_rent" | "power" | "upstream";
  amount: number;
}

export interface BackupStatus {
  lastBackupAt: string;
  databaseStatus: "healthy" | "warning" | "critical";
  retentionPolicy: string;
  restoreReady: boolean;
  securityNotes: string[];
}

export interface IntegrationService {
  id: string;
  name: string;
  category: "billing" | "communication" | "mapping" | "ai" | "network" | "system";
  status: "configured" | "pending" | "attention";
  envKeys: string[];
  notes: string;
}

export interface ResellerAgentRecord {
  id: string;
  fullName: string;
  role: "reseller" | "marketer" | "agent";
  assignedLeads: number;
  convertedCustomers: number;
  commissionEarned: number;
  payoutStatus: "pending" | "processing" | "paid";
  referrals: number;
}

export interface SystemHealthSnapshot {
  serverStatus: "healthy" | "warning" | "critical";
  databaseStatus: "healthy" | "warning" | "critical";
  queueStatus: "healthy" | "warning" | "critical";
  apiStatus: "healthy" | "warning" | "critical";
  failedJobs: number;
  backgroundTasks: number;
  lastCheckedAt: string;
}

export interface OnboardingChecklist {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface InstallationWorkflowRecord {
  id: string;
  customerName: string;
  stage:
    | "lead"
    | "site_survey"
    | "quotation"
    | "payment"
    | "installation_assigned"
    | "materials_issued"
    | "installation_completed"
    | "testing"
    | "activation"
    | "handover";
  assignedTo?: string;
  dueDate?: string;
  notes?: string;
}

export interface SiteSurveyRecord {
  id: string;
  leadName: string;
  location: string;
  buildingType: "residential" | "commercial" | "estate" | "mixed_use";
  distanceFromNodeMeters: number;
  signalReading?: string;
  powerReading?: string;
  requiredMaterials: string[];
  installationDifficulty: "low" | "medium" | "high";
  photos: number;
  recommendation: "approved" | "revise_quote" | "not_feasible";
}

export interface FaultWorkflowTicket {
  id: string;
  customerName: string;
  category: "no_internet" | "slow_speed" | "billing" | "degraded_signal" | "outage";
  priority: "low" | "medium" | "high" | "critical";
  affectedService: string;
  assignedTechnician?: string;
  faultLocation: string;
  diagnosis?: string;
  materialsUsed: string[];
  resolutionNote?: string;
  customerConfirmation: "pending" | "confirmed";
  closureTime?: string;
}

export interface OutageMaintenanceRecord {
  id: string;
  type: "planned_maintenance" | "unplanned_outage";
  title: string;
  affectedAreas: string[];
  affectedCustomers: number;
  startTime: string;
  endTime?: string;
  customerNotice: string;
  completionReport?: string;
  status: "scheduled" | "in_progress" | "completed";
}

export interface CommunicationTemplateRecord {
  id: string;
  channel: "whatsapp" | "sms" | "email" | "in_app";
  name:
    | "payment_reminder"
    | "welcome_message"
    | "installation_update"
    | "outage_notice"
    | "maintenance_notice"
    | "complaint_received"
    | "ticket_resolved"
    | "service_suspension";
  subject?: string;
  message: string;
  active: boolean;
}

export interface DeviceAssignmentRecord {
  id: string;
  deviceType: "onu" | "router" | "power_adapter";
  model: string;
  serialNumber: string;
  macAddress?: string;
  status: "assigned" | "removed" | "replaced" | "faulty" | "returned" | "damaged";
  assignedAt: string;
  removedAt?: string;
  notes?: string;
}

export interface PlanChangeRecord {
  id: string;
  oldPlan: string;
  newPlan: string;
  priceDifference: number;
  effectiveDate: string;
  paymentAdjustment: string;
  approvalStatus: "pending" | "approved" | "rejected";
  reason?: string;
}

export interface SuspensionWorkflowRecord {
  id: string;
  reason: string;
  suspendedBy: string;
  suspensionDate: string;
  paymentStatus: "paid" | "pending" | "overdue";
  reactivationDate?: string;
  reactivatedBy?: string;
}

export interface ContractRenewalRecord {
  id: string;
  contractStartDate: string;
  contractEndDate: string;
  renewalReminderDate: string;
  renewalStatus: "upcoming" | "renewed" | "expired";
  signedAgreement: boolean;
  accountManager: string;
}

export interface CustomerFeedbackRecord {
  id: string;
  source: "installation" | "support" | "maintenance";
  rating: number;
  comment: string;
  complaint?: string;
  satisfactionScore: number;
  createdAt: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  category: "troubleshooting" | "installation" | "responses" | "escalation" | "fault_solutions";
  title: string;
  summary: string;
  audience: "support" | "engineer" | "noc" | "all";
}

export interface ApprovalWorkflowRecord {
  id: string;
  type: "refund" | "discount" | "plan_price_change" | "customer_deletion" | "device_write_off" | "large_expense" | "enterprise_change";
  requester: string;
  target: string;
  amount?: number;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

export interface DiscountPromoRecord {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  amount: number;
  expiryDate: string;
  eligiblePlans: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  usageCount: number;
}

export interface CommissionRecord {
  id: string;
  partnerName: string;
  leadSource: string;
  convertedCustomer: string;
  planValue: number;
  commissionAmount: number;
  approvalStatus: "pending" | "approved" | "rejected";
  payoutStatus: "pending" | "processing" | "paid";
}

export interface ChurnRetentionRecord {
  id: string;
  customerName: string;
  riskLevel: "low" | "medium" | "high";
  cancellationRequested: boolean;
  reasonForLeaving?: string;
  retentionAction?: string;
  winBackStatus: "none" | "in_progress" | "recovered" | "lost";
}

export interface ImportValidationSummary {
  module: "customers" | "inventory" | "invoices" | "assets";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleErrors: string[];
}

export interface DemoModeSettings {
  enabled: boolean;
  hideSensitiveSettings: boolean;
  preventDestructiveActions: boolean;
  sampleDatasetName: string;
}

export interface SecurityControlSettings {
  passwordResetFlow: "email_link" | "admin_only" | "disabled";
  twoFactorPlaceholder: boolean;
  sessionTimeoutMinutes: number;
  sensitiveActionConfirmation: boolean;
  auditTrailEnabled: boolean;
}

export interface NetworkTopologyNode {
  id: string;
  label: string;
  layer: "provider" | "core_router" | "distribution_router" | "olt" | "splitter" | "mst" | "customer";
  status: "healthy" | "warning" | "fault";
  linkedTo?: string[];
  metric?: string;
}

export interface NetworkTopologySnapshot {
  faultDomain?: string;
  impactedCustomers: number;
  path: NetworkTopologyNode[];
}

export interface CapacityResource {
  id: string;
  name: string;
  type: "pon_port" | "splitter" | "uplink" | "pop" | "bandwidth";
  utilizationPercent: number;
  thresholdPercent: number;
  availableUnits: number;
  forecastDaysToExhaustion: number;
  recommendation: string;
}

export interface GisDistanceEstimate {
  customerName: string;
  closureName: string;
  mstName: string;
  distanceClosureToMstMeters: number;
  distanceMstToCustomerMeters: number;
  estimatedCableMeters: number;
  estimatedInstallationCost: number;
  nearestAvailableMst: string;
}

export interface FiberCoreManagementSnapshot {
  cableName: string;
  coreCount: number;
  usedCores: number;
  spareCores: number;
  reservedCores: number;
  damagedCores: number;
  spliceHistoryCount: number;
}

export interface IpamSubnetRecord {
  id: string;
  segment: string;
  type: "public" | "private" | "dhcp_pool" | "cgnat" | "vlan";
  vlanId?: number;
  subnet: string;
  allocated: number;
  available: number;
  status: "healthy" | "warning" | "critical";
}

export interface EquipmentLifecycleRecord {
  id: string;
  assetName: string;
  assetType: "olt" | "router" | "onu" | "splitter" | "battery" | "inverter";
  purchaseDate: string;
  installationDate?: string;
  warrantyEndDate?: string;
  depreciationStatus: "normal" | "mid_life" | "end_of_life";
  maintenanceHistory: string[];
  replacementSchedule: string;
}

export interface CustomerTimelineEvent {
  id: string;
  type:
    | "registration"
    | "survey"
    | "installation"
    | "activation"
    | "payment"
    | "plan_change"
    | "ticket"
    | "maintenance"
    | "device_replacement"
    | "suspension"
    | "reactivation";
  title: string;
  description: string;
  createdAt: string;
  actor?: string;
  status?: string;
}

export interface BusinessIntelligenceSnapshot {
  mrr: number;
  arr: number;
  churnRate: number;
  customerGrowthPercent: number;
  arpu: number;
  ltv: number;
  ticketTrendPercent: number;
  technicianPerformancePercent: number;
  revenueByArea: Array<{ area: string; revenue: number }>;
}

export interface DisasterRecoverySnapshot {
  backupHealth: "healthy" | "warning" | "critical";
  failoverReadiness: "ready" | "partial" | "not_ready";
  restoreTestedAt?: string;
  recoveryStatus: "documented" | "in_progress" | "pending";
  notes: string[];
}

export interface DeveloperPortalSnapshot {
  apiBaseUrl: string;
  authentication: Array<"api_key" | "oauth2" | "webhooks" | "rate_limiting">;
  docsStatus: "draft" | "published";
  exampleCollections: string[];
}

export interface PluginCatalogEntry {
  id: string;
  name: string;
  category: "payment" | "communication" | "network" | "analytics" | "custom";
  status: "installed" | "available" | "beta";
  description: string;
}

export interface LocalizationSettings {
  currencies: string[];
  timezones: string[];
  languages: string[];
  taxMode: string;
  regionalFormats: string[];
}

export interface LicenseSubscriptionSnapshot {
  tenantName: string;
  licenseTier: "starter" | "growth" | "enterprise";
  billingCycle: "monthly" | "quarterly" | "annually";
  activeSeats: number;
  seatLimit: number;
  storageUsedGb: number;
  storageLimitGb: number;
  enabledModules: string[];
}

export interface LaunchReadinessChecklist {
  score: number;
  completed: string[];
  remaining: string[];
  securityRisks: string[];
  performanceNotes: string[];
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  serviceLocation?: string;
  location: GeoPoint;
  mstId?: string;
  splitterPort?: number;
  fibreCoreId?: string;
  dropCableId?: string;
  onuVendor?: string;
  onuModel?: string;
  onuSerial: string;
  onuMac?: string;
  routerBrand?: string;
  routerModel?: string;
  routerSerial?: string;
  routerMac?: string;
  wifiName?: string;
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
  planName?: string;
  monthlyFee?: number;
  paymentStatus?: "paid" | "pending" | "overdue";
  balance?: number;
  customerSince?: string;
  nextInvoiceDate?: string;
  lastPaymentDate?: string;
  paymentReference?: string;
  installationFee?: number;
  supportStatus?: "stable" | "watch" | "needs_attention";
  tags?: string[];
  notes?: Array<{
    id: string;
    author: string;
    message: string;
    createdAt: string;
  }>;
  history?: Array<{
    id: string;
    title: string;
    description: string;
    createdAt: string;
    type: "billing" | "support" | "installation" | "network" | "account";
    status?: string;
  }>;
  installationRecords?: Array<{
    id: string;
    title: string;
    technician: string;
    scheduledAt?: string;
    completedAt?: string;
    status: "pending" | "scheduled" | "completed";
    materials: string[];
    notes?: string;
  }>;
  kyc?: CustomerKycRecord;
  documents?: CustomerDocument[];
  slaMetrics?: CustomerSlaMetrics;
  deviceAssignments?: DeviceAssignmentRecord[];
  planChangeHistory?: PlanChangeRecord[];
  suspensionHistory?: SuspensionWorkflowRecord[];
  contractRenewals?: ContractRenewalRecord[];
  feedback?: CustomerFeedbackRecord[];
  timeline?: CustomerTimelineEvent[];
}

export type CustomerPortalStatus = "active" | "suspended";
export type CustomerTicketStatus = "open" | "in_progress" | "escalated" | "resolved" | "closed";
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

export interface CustomerPortalSession {
  access_token: string;
  token_type: "bearer";
  customer_id: string;
  tenant_id: string;
  username: string;
  first_login_required: boolean;
}

export interface PortalAccessStatus {
  customer_id: string;
  username: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  portal_access_enabled: boolean;
  first_login_required: boolean;
  password_reset_required: boolean;
  last_login?: string;
  created_at?: string;
}

export interface PortalAccessProvisionResponse extends PortalAccessStatus {
  temporary_password: string;
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
  invoice_number?: string;
  provider?: string;
  checkout_url?: string;
  access_code?: string;
  receipt_number?: string;
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
  status: "open" | "investigating" | "escalated" | "resolved";
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
  coreCount: FibreCoreCount;
}

export interface CustomersQuery {
  search?: string;
}

export type InventoryCategory =
  | "cable"
  | "device"
  | "accessory"
  | "voucher"
  | "bundle"
  | "infrastructure"
  | "tool"
  | "other";

export type StockMovementType = "purchase" | "usage" | "sale" | "transfer" | "adjustment" | "return";
export type StockLocationType = "store" | "field" | "customer_site" | "map_location";
export type FinanceEntryType = "income" | "expense";
export type ReferenceType =
  | "inventory_purchase"
  | "inventory_usage"
  | "customer_installation"
  | "subscription"
  | "device_sale"
  | "salary"
  | "maintenance"
  | "logistics"
  | "other";

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: InventoryCategory;
  description?: string;
  unit_of_measure: string;
  quantity_in_stock: number;
  unit_cost: number;
  selling_price?: number;
  minimum_stock_level: number;
  supplier_id?: number;
  core_type?: number;
  length_meters?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryMovement {
  id: number;
  item_id: number;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  source_location?: StockLocationType;
  destination_location?: StockLocationType;
  notes?: string;
  reference_type: ReferenceType;
  reference_id?: string;
  job_reference?: string;
  used_by_user_id?: number;
  client_id?: number;
  mst_id?: number;
  fibre_route_id?: number;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface InventorySummary {
  total_items: number;
  low_stock_items: number;
  total_stock_units: number;
  inventory_value: number;
  recent_movements: InventoryMovement[];
  most_used_items: Array<{ item_id: number; name: string; quantity_used: string }>;
  pending_approvals: number;
}

export interface FinancialTransaction {
  id: number;
  transaction_code: string;
  entry_type: FinanceEntryType;
  category: string;
  amount: number;
  description: string;
  reference_type: ReferenceType;
  reference_id?: string;
  inventory_item_id?: number;
  inventory_movement_id?: number;
  client_id?: number;
  payment_id?: number;
  created_by_user_id?: number;
  transaction_date: string;
  created_at?: string;
  updated_at?: string;
}

export type BillingInvoiceStatus = "draft" | "issued" | "partial" | "paid" | "overdue";

export interface BillingInvoice {
  id: string;
  customerId: string;
  customerName: string;
  planName: string;
  amount: number;
  balance: number;
  status: BillingInvoiceStatus;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  reference: string;
  paymentMethod?: "bank_transfer" | "cash" | "paystack" | "card";
  paymentGateway?: "paystack";
  notes?: string;
}

export interface FinanceSummary {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  cash_flow: number;
  inventory_value: number;
  transaction_count: number;
  recent_transactions: FinancialTransaction[];
  expenses_today: number;
  expenses_this_week: number;
  expenses_this_month: number;
}

export type WorkOrderType = "installation" | "maintenance" | "repair" | "upgrade" | "survey";
export type WorkOrderStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
export type InventoryDeductionMode = "automatic" | "manual_approval";
export type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export interface InventoryPurchaseLine {
  id: number;
  item_id: number;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  movement_id?: number;
  notes?: string;
}

export interface InventoryPurchase {
  id: number;
  purchase_code: string;
  supplier_id?: number;
  purchase_date: string;
  total_cost: number;
  notes?: string;
  created_by_user_id?: number;
  created_at?: string;
  updated_at?: string;
  lines: InventoryPurchaseLine[];
}

export interface WorkOrderMaterial {
  id: number;
  item_id: number;
  quantity_planned: number;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  serial_number?: string;
  mac_address?: string;
  cable_length_used?: number;
  notes?: string;
  inventory_movement_id?: number;
}

export interface WorkOrder {
  id: number;
  work_order_code: string;
  work_type: WorkOrderType;
  status: WorkOrderStatus;
  inventory_deduction_mode: InventoryDeductionMode;
  approval_status: ApprovalStatus;
  title: string;
  description?: string;
  customer_name?: string;
  service_address?: string;
  client_id?: number;
  mst_id?: number;
  fibre_route_id?: number;
  assigned_engineer_user_id?: number;
  approved_by_user_id?: number;
  onu_serial?: string;
  onu_mac?: string;
  router_mac?: string;
  installation_fee: number;
  priority?: "low" | "medium" | "high" | "critical";
  latitude?: number;
  longitude?: number;
  map_reference?: string;
  notes?: string;
  photos: string[];
  scheduled_at?: string;
  completed_at?: string;
  approved_at?: string;
  created_by_user_id?: number;
  created_at?: string;
  updated_at?: string;
  due_date?: string;
  escalation_reason?: string;
  completion_notes?: string;
  materials: WorkOrderMaterial[];
}
