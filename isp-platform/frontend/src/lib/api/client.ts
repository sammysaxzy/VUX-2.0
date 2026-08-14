import axios from "axios";
import type {
  AlertItem,
  AiNocResponse,
  ActivationQueueRecord,
  ActivationRetryResponse,
  AuthResponse,
  PaymentProviderConfig,
  ClosureBox,
  Customer,
  CustomerNotification,
  CustomerPayment,
  CustomerPlan,
  CustomerPortalProfile,
  CustomerPortalSession,
  CustomerDocument,
  CustomerKycRecord,
  CustomerSlaMetrics,
  CustomerTicket,
  CustomerTicketCategory,
  CommunicationTemplateRecord,
  CommissionRecord,
  ChurnRetentionRecord,
  EnterpriseSlaReport,
  DemoModeSettings,
  DeviceAssignmentRecord,
  DiscountPromoRecord,
  ExpenseSummaryLine,
  EquipmentLifecycleRecord,
  OnuTelemetryPayload,
  EngineerActivity,
  FinanceSummary,
  Fault,
  FiberCoreManagementSnapshot,
  FibreCoreCount,
  FinancialTransaction,
  FibreCable,
  BackupStatus,
  BusinessIntelligenceSnapshot,
  CapacityResource,
  InventoryItem,
  InventoryMovement,
  InventorySummary,
  InventoryPurchase,
  IntegrationService,
  ImportValidationSummary,
  InstallationWorkflowRecord,
  IpamSubnetRecord,
  KpiSnapshot,
  KnowledgeBaseArticle,
  Lead,
  LaunchReadinessChecklist,
  LicenseSubscriptionSnapshot,
  LocalizationSettings,
  NasEntry,
  NocAlert,
  NetworkTopologySnapshot,
  NetworkNode,
  NotificationRule,
  OnboardingChecklist,
  PermissionFlags,
  PermissionRole,
  ProcurementRecord,
  RadiusBulkImportResult,
  RadiusSession,
  RadiusUser,
  ResellerAgentRecord,
  SecurityControlSettings,
  ServiceArea,
  ServicePlan,
  SiteSurveyRecord,
  SiteManagementRecord,
  GisDistanceEstimate,
  StockLocationType,
  StockMovementType,
  SettingsLog,
  Supplier,
  SystemHealthSnapshot,
  TenantProfile,
  TenantBranding,
  PortalAccessProvisionResponse,
  PortalAccessStatus,
  User,
  UsageAnalyticsSnapshot,
  FaultWorkflowTicket,
  OutageMaintenanceRecord,
  ApprovalWorkflowRecord,
  CustomerTimelineEvent,
  DeveloperPortalSnapshot,
  DisasterRecoverySnapshot,
  PluginCatalogEntry,
  PlanChangeRecord,
  SuspensionWorkflowRecord,
  ContractRenewalRecord,
  CustomerFeedbackRecord,
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

const mockTenantProfiles: TenantProfile[] = [
  {
    tenantId: "tenant-west-001",
    companyName: "WestLink Fibre",
    legalName: "WestLink Fibre Networks Ltd",
    logoUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=300&auto=format&fit=crop",
    primaryColor: "#0B7285",
    supportEmail: "support@westlink.io",
    supportPhone: "+234 800 WESTLINK",
    billingEmail: "billing@westlink.io",
    address: "Lekki Phase 1, Lagos, Nigeria",
    website: "https://westlink.example",
    timezone: "Africa/Lagos",
    currency: "NGN",
    taxId: "TIN-1029384",
    registrationNumber: "RC-2201884",
    defaultBillingCycle: "monthly",
    paymentGateway: "paystack",
    mapProvider: "mapbox",
    whatsappEnabled: true,
    companyNotes: "Premium FTTH operator focused on estates and SMEs in Lagos.",
  },
  {
    tenantId: "tenant-north-002",
    companyName: "NorthWave Broadband",
    legalName: "NorthWave Digital Infrastructure Ltd",
    primaryColor: "#155EEF",
    supportEmail: "care@northwave.ng",
    supportPhone: "+234 809 NORTHWAVE",
    billingEmail: "accounts@northwave.ng",
    address: "Gwarinpa, Abuja, Nigeria",
    website: "https://northwave.example",
    timezone: "Africa/Lagos",
    currency: "NGN",
    defaultBillingCycle: "monthly",
    paymentGateway: "manual",
    mapProvider: "openstreetmap",
    whatsappEnabled: false,
    companyNotes: "Regional ISP serving mixed residential and enterprise clusters in Abuja.",
  },
];

let mockServiceAreas: ServiceArea[] = [
  {
    id: "area-1",
    tenantId: "tenant-west-001",
    name: "Lekki Phase 1",
    type: "service_zone",
    status: "active",
    households: 420,
    notes: "Primary FTTH service cluster with strong enterprise demand.",
  },
  {
    id: "area-2",
    tenantId: "tenant-west-001",
    name: "Admiralty Way",
    type: "street",
    parentName: "Lekki Phase 1",
    status: "active",
    households: 90,
  },
  {
    id: "area-3",
    tenantId: "tenant-west-001",
    name: "Chevron POP",
    type: "pop",
    parentName: "Chevron",
    status: "maintenance",
  },
  {
    id: "area-4",
    tenantId: "tenant-north-002",
    name: "Gwarinpa Central",
    type: "service_zone",
    status: "active",
    households: 360,
  },
];

let mockLeads: Lead[] = [
  {
    id: "lead-1",
    tenantId: "tenant-west-001",
    fullName: "Halima Yusuf",
    phone: "+234 803 400 9981",
    email: "halima@example.com",
    source: "referral",
    status: "survey_scheduled",
    serviceAreaId: "area-1",
    serviceAreaName: "Lekki Phase 1",
    address: "16 Fola Osibo, Lekki",
    followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    assignedMarketer: "Tosin A.",
    surveyStatus: "booked",
    interestedPlan: "Business 50 Mbps",
    notes: "Prospect referred by existing SME customer.",
  },
  {
    id: "lead-2",
    tenantId: "tenant-west-001",
    fullName: "Greenwood Estate HOA",
    phone: "+234 809 111 2020",
    source: "estate_campaign",
    status: "negotiating",
    serviceAreaName: "Chevron",
    address: "Greenwood Estate Main Gate",
    followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    assignedMarketer: "Ini O.",
    surveyStatus: "completed",
    interestedPlan: "Dedicated 100 Mbps",
  },
  {
    id: "lead-3",
    tenantId: "tenant-north-002",
    fullName: "Favour Clinic",
    phone: "+234 812 559 4310",
    source: "website",
    status: "new",
    serviceAreaId: "area-4",
    serviceAreaName: "Gwarinpa Central",
    address: "3rd Avenue, Gwarinpa",
    assignedMarketer: "Musa J.",
    surveyStatus: "pending",
    interestedPlan: "Business 25 Mbps",
  },
];

let mockNotificationRules: NotificationRule[] = [
  {
    id: "notify-1",
    tenantId: "tenant-west-001",
    name: "Payment reminders",
    channels: ["email", "whatsapp", "in_app"],
    trigger: "payment_reminder",
    enabled: true,
    audience: "customer",
    templateNote: "Send 5 days before due date and on due date morning.",
  },
  {
    id: "notify-2",
    tenantId: "tenant-west-001",
    name: "Outage escalation",
    channels: ["email", "sms", "in_app"],
    trigger: "outage_alert",
    enabled: true,
    audience: "management",
  },
  {
    id: "notify-3",
    tenantId: "tenant-west-001",
    name: "Low stock alerts",
    channels: ["email", "in_app"],
    trigger: "low_stock_alert",
    enabled: true,
    audience: "operations",
  },
];

let mockAiNocResponses: AiNocResponse[] = [];

const mockCustomerKycById: Record<string, CustomerKycRecord> = {
  "cust-1001": {
    idType: "national_id",
    idNumber: "NIN-90118827361",
    addressProof: "IKEDC utility bill",
    customerPhoto: "On file",
    verificationStatus: "verified",
    verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
  "cust-1002": {
    idType: "drivers_license",
    idNumber: "DL-ABJ-8821092",
    addressProof: "Tenancy agreement",
    customerPhoto: "On file",
    verificationStatus: "pending",
  },
};

const mockCustomerDocumentsById: Record<string, CustomerDocument[]> = {
  "cust-1001": [
    {
      id: "doc-1",
      name: "Business Service Agreement",
      type: "service_agreement",
      status: "available",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
      reference: "AGR-2401-1001",
    },
    {
      id: "doc-2",
      name: "Installation Completion Form",
      type: "installation_form",
      status: "available",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
  ],
  "cust-1002": [
    {
      id: "doc-3",
      name: "KYC Address Proof",
      type: "kyc_document",
      status: "available",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    },
    {
      id: "doc-4",
      name: "Site Survey Form",
      type: "site_survey",
      status: "pending_signature",
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
  ],
};

const mockCustomerSlaById: Record<string, CustomerSlaMetrics> = {
  "cust-1001": {
    profile: "business",
    uptimeTarget: "99.5%",
    currentUptime: "99.82%",
    downtimeMinutes: 52,
    averageResponseMinutes: 18,
    averageResolutionMinutes: 62,
    breachCount: 0,
    faultDurationMinutes: 52,
    breachRisk: "normal",
  },
  "cust-1003": {
    profile: "dedicated",
    uptimeTarget: "99.9%",
    currentUptime: "99.41%",
    downtimeMinutes: 258,
    averageResponseMinutes: 11,
    averageResolutionMinutes: 74,
    breachCount: 1,
    faultDurationMinutes: 258,
    breachRisk: "critical",
  },
};

let mockSites: SiteManagementRecord[] = [
  {
    id: "site-1",
    name: "Lekki POP Alpha",
    type: "pop",
    location: { lat: 6.437, lng: 3.472 },
    serviceAreaName: "Lekki Phase 1",
    powerStatus: "normal",
    batteryStatus: "healthy",
    inverterStatus: "healthy",
    uplink: "10G Metro Ring A",
    oltName: "OLT-Lekki-01",
    routerName: "CCR-Core-01",
    equipment: ["Huawei OLT", "MikroTik CCR", "48V DC plant", "Battery bank"],
    maintenanceHistory: [
      {
        id: "maint-1",
        title: "Quarterly battery inspection",
        performedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
        engineer: "Kunle O.",
        notes: "Battery bank healthy, inverter fan cleaned.",
      },
    ],
  },
  {
    id: "site-2",
    name: "Chevron Cabinet East",
    type: "cabinet",
    location: { lat: 6.451, lng: 3.503 },
    serviceAreaName: "Chevron",
    powerStatus: "warning",
    batteryStatus: "degraded",
    inverterStatus: "warning",
    uplink: "1G Distribution Feed",
    oltName: "OLT-Chevron-02",
    equipment: ["Outdoor cabinet", "8-port MST uplink tray", "UPS"],
    maintenanceHistory: [
      {
        id: "maint-2",
        title: "Power-site alert response",
        performedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        engineer: "Sade A.",
        notes: "Battery runtime reduced below threshold, replacement recommended.",
      },
    ],
  },
];

let mockNocAlerts: NocAlert[] = [
  {
    id: "noc-1",
    category: "optical",
    severity: "critical",
    title: "Weak optical power on distribution segment",
    description: "RX levels dropped below threshold across customers downstream of Closure CL-17.",
    source: "OLT-Lekki-01 / PON 3",
    affectedCount: 14,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "noc-2",
    category: "latency",
    severity: "warning",
    title: "High latency on upstream path",
    description: "Business customers experienced elevated latency during peak utilization window.",
    source: "Metro Uplink A",
    affectedCount: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
  },
  {
    id: "noc-3",
    category: "customer",
    severity: "normal",
    title: "Customers offline",
    description: "Routine overnight offline set within expected limits.",
    source: "Customer CPE monitoring",
    affectedCount: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

const mockUsageAnalytics: UsageAnalyticsSnapshot = {
  totalCapacityMbps: 2500,
  peakUsageMbps: 1830,
  averageUsageMbps: 1285,
  peakHourWindow: "19:00 - 22:00",
  planUtilization: [
    { planName: "20 Mbps Home", averageUsageMbps: 310, subscribers: 142 },
    { planName: "Business 50 Mbps", averageUsageMbps: 420, subscribers: 36 },
    { planName: "Dedicated 100 Mbps", averageUsageMbps: 610, subscribers: 8 },
  ],
  topUsers: [
    { customerName: "Greenwood Estate HOA", usageGb: 921, planName: "Dedicated 100 Mbps" },
    { customerName: "Favour Clinic", usageGb: 402, planName: "Business 25 Mbps" },
    { customerName: "The Annex Workspace", usageGb: 387, planName: "Business 50 Mbps" },
  ],
  customerUsage: [
    { customerId: "cust-1001", customerName: "The Annex Workspace", usageGb: 387, planName: "Business 50 Mbps" },
    { customerId: "cust-1002", customerName: "Amina Bello", usageGb: 96, planName: "20 Mbps Home" },
    { customerId: "cust-1003", customerName: "Greenwood Estate HOA", usageGb: 921, planName: "Dedicated 100 Mbps" },
  ],
};

const mockSlaReports: EnterpriseSlaReport[] = [
  {
    id: "sla-1",
    customerName: "Greenwood Estate HOA",
    serviceWindow: "July 2026",
    uptime: "99.41%",
    downtimeMinutes: 258,
    responseMinutes: 11,
    resolutionMinutes: 74,
    breachStatus: "breached",
  },
  {
    id: "sla-2",
    customerName: "The Annex Workspace",
    serviceWindow: "July 2026",
    uptime: "99.82%",
    downtimeMinutes: 52,
    responseMinutes: 18,
    resolutionMinutes: 62,
    breachStatus: "met",
  },
];

let mockProcurementRecords: ProcurementRecord[] = [
  {
    id: "proc-1",
    vendorName: "Metro Fiber Depot",
    type: "purchase_order",
    reference: "PO-2407-19",
    itemSummary: "1x8 PLC splitters, drop cable, pigtails",
    amount: 1245000,
    deliveryStatus: "in_transit",
    paymentStatus: "part_paid",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "proc-2",
    vendorName: "Main FTTH Supplier",
    type: "quotation",
    reference: "QTN-2407-44",
    itemSummary: "Battery bank replacement for POP Alpha",
    amount: 880000,
    deliveryStatus: "pending",
    paymentStatus: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
];

const mockExpenseSummary: ExpenseSummaryLine[] = [
  { category: "fuel", amount: 185000 },
  { category: "contractors", amount: 620000 },
  { category: "materials", amount: 920000 },
  { category: "maintenance", amount: 210000 },
  { category: "salaries", amount: 1750000 },
  { category: "site_rent", amount: 340000 },
  { category: "power", amount: 290000 },
  { category: "upstream", amount: 2400000 },
];

const mockBackupStatus: BackupStatus = {
  lastBackupAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  databaseStatus: "healthy",
  retentionPolicy: "Daily snapshots retained for 30 days, weekly archives for 6 months.",
  restoreReady: true,
  securityNotes: [
    "Backups should be encrypted at rest using provider-managed keys or KMS.",
    "Restore actions should require privileged approval and audit logging.",
  ],
};

const mockIntegrations: IntegrationService[] = [
  {
    id: "int-1",
    name: "SmartOLT",
    category: "network",
    status: "pending",
    envKeys: ["SMARTOLT_BASE_URL", "SMARTOLT_API_KEY"],
    notes: "Use backend proxy for optical telemetry and alarm sync.",
  },
  {
    id: "int-2",
    name: "Paystack",
    category: "billing",
    status: "configured",
    envKeys: ["PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY", "PAYSTACK_WEBHOOK_SECRET"],
    notes: "Webhook verification must remain server-side.",
  },
  {
    id: "int-3",
    name: "WhatsApp",
    category: "communication",
    status: "pending",
    envKeys: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    notes: "Template approvals still required for production rollout.",
  },
  {
    id: "int-4",
    name: "OpenAI",
    category: "ai",
    status: "pending",
    envKeys: ["OPENAI_API_KEY"],
    notes: "Route prompts through backend guardrails and audit storage.",
  },
];

const mockResellerAgents: ResellerAgentRecord[] = [
  {
    id: "agent-1",
    fullName: "Tosin A.",
    role: "marketer",
    assignedLeads: 11,
    convertedCustomers: 4,
    commissionEarned: 145000,
    payoutStatus: "processing",
    referrals: 6,
  },
  {
    id: "agent-2",
    fullName: "PrimeNet Reseller Desk",
    role: "reseller",
    assignedLeads: 8,
    convertedCustomers: 3,
    commissionEarned: 280000,
    payoutStatus: "pending",
    referrals: 8,
  },
];

const mockSystemHealth: SystemHealthSnapshot = {
  serverStatus: "healthy",
  databaseStatus: "healthy",
  queueStatus: "warning",
  apiStatus: "healthy",
  failedJobs: 3,
  backgroundTasks: 11,
  lastCheckedAt: new Date().toISOString(),
};

const mockOnboardingChecklist: OnboardingChecklist[] = [
  { id: "ob-1", title: "Company setup", description: "Branding, support contacts, billing identity, and tenant profile.", completed: true },
  { id: "ob-2", title: "Service areas", description: "Create estates, streets, POPs, and coverage zones.", completed: true },
  { id: "ob-3", title: "Internet plans", description: "Publish residential, business, and dedicated packages.", completed: true },
  { id: "ob-4", title: "Users and roles", description: "Create admin, NOC, finance, support, and engineer accounts.", completed: false },
  { id: "ob-5", title: "Payment settings", description: "Configure gateway env vars and billing defaults.", completed: false },
  { id: "ob-6", title: "Map settings", description: "Select provider, API env vars, and asset import rules.", completed: false },
  { id: "ob-7", title: "First customer import", description: "Import CRM data from CSV or Excel templates.", completed: false },
];

const mockInstallationWorkflow: InstallationWorkflowRecord[] = [
  {
    id: "install-1",
    customerName: "Greenwood Estate HOA",
    stage: "quotation",
    assignedTo: "Tosin A.",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    notes: "Dedicated 100 Mbps quotation awaiting commercial sign-off.",
  },
  {
    id: "install-2",
    customerName: "Amina Bello",
    stage: "installation_assigned",
    assignedTo: "Kunle O.",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    notes: "Materials issued for MST drop and ONU install.",
  },
  {
    id: "install-3",
    customerName: "Favour Clinic",
    stage: "testing",
    assignedTo: "Musa J.",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
  },
];

const mockSiteSurveys: SiteSurveyRecord[] = [
  {
    id: "survey-1",
    leadName: "Greenwood Estate HOA",
    location: "Greenwood Estate Main Gate",
    buildingType: "estate",
    distanceFromNodeMeters: 180,
    signalReading: "-18.2 dBm",
    powerReading: "Stable mains + inverter",
    requiredMaterials: ["1 Core Drop Cable", "ONU", "Router", "8 Port MST Closure"],
    installationDifficulty: "medium",
    photos: 6,
    recommendation: "approved",
  },
  {
    id: "survey-2",
    leadName: "Favour Clinic",
    location: "3rd Avenue, Gwarinpa",
    buildingType: "commercial",
    distanceFromNodeMeters: 95,
    signalReading: "-21.0 dBm",
    powerReading: "UPS available",
    requiredMaterials: ["ONU", "Router", "Patch Cord"],
    installationDifficulty: "low",
    photos: 4,
    recommendation: "approved",
  },
];

const mockFaultWorkflowTickets: FaultWorkflowTicket[] = [
  {
    id: "ft-1",
    customerName: "The Annex Workspace",
    category: "degraded_signal",
    priority: "high",
    affectedService: "Business 50 Mbps",
    assignedTechnician: "Sade A.",
    faultLocation: "Admiralty Way distribution segment",
    diagnosis: "High splice loss near closure CL-17.",
    materialsUsed: ["Pigtail", "Splice protector"],
    resolutionNote: "Respliced affected core and restored RX levels.",
    customerConfirmation: "confirmed",
    closureTime: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "ft-2",
    customerName: "Amina Bello",
    category: "no_internet",
    priority: "medium",
    affectedService: "20 Mbps Home",
    assignedTechnician: "Kunle O.",
    faultLocation: "Drop cable from MST-04",
    diagnosis: "Outdoor connector damaged by weather exposure.",
    materialsUsed: ["Fast connector"],
    customerConfirmation: "pending",
  },
];

const mockOutages: OutageMaintenanceRecord[] = [
  {
    id: "out-1",
    type: "planned_maintenance",
    title: "Lekki POP battery maintenance",
    affectedAreas: ["Lekki Phase 1", "Admiralty Way"],
    affectedCustomers: 48,
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
    customerNotice: "Brief maintenance window to improve site power resilience.",
    status: "scheduled",
  },
  {
    id: "out-2",
    type: "unplanned_outage",
    title: "Distribution fibre cut near Chevron axis",
    affectedAreas: ["Chevron"],
    affectedCustomers: 21,
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    customerNotice: "Emergency outage response underway.",
    completionReport: "Temporary reroute restored services pending permanent civil fix.",
    status: "completed",
  },
];

let mockCommunicationTemplates: CommunicationTemplateRecord[] = [
  {
    id: "tpl-1",
    channel: "whatsapp",
    name: "payment_reminder",
    message: "Hello {{name}}, your invoice of {{amount}} is due on {{due_date}}. Please pay to avoid suspension.",
    active: true,
  },
  {
    id: "tpl-2",
    channel: "email",
    name: "welcome_message",
    subject: "Welcome to {{isp_name}}",
    message: "Your service is now active. Plan: {{plan}}, username: {{username}}.",
    active: true,
  },
  {
    id: "tpl-3",
    channel: "sms",
    name: "outage_notice",
    message: "We are working on a service issue in your area. Updates will follow shortly.",
    active: true,
  },
];

let mockKnowledgeBase: KnowledgeBaseArticle[] = [
  {
    id: "kb-1",
    category: "troubleshooting",
    title: "Weak optical power triage checklist",
    summary: "Validate ONU levels, inspect closure splices, check bends, and compare recent degradation pattern before dispatch.",
    audience: "noc",
  },
  {
    id: "kb-2",
    category: "installation",
    title: "Standard FTTH installation handover procedure",
    summary: "Verify light levels, document router and ONU assets, confirm Wi-Fi, and collect signed completion acknowledgment.",
    audience: "engineer",
  },
  {
    id: "kb-3",
    category: "responses",
    title: "Customer outage response script",
    summary: "How to acknowledge complaints professionally, explain outage context, and set expectation on the next update window.",
    audience: "support",
  },
];

let mockApprovalRequests: ApprovalWorkflowRecord[] = [
  {
    id: "apr-1",
    type: "discount",
    requester: "Finance Desk",
    target: "Greenwood Estate HOA onboarding discount",
    amount: 150000,
    status: "pending",
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "apr-2",
    type: "large_expense",
    requester: "Operations Manager",
    target: "POP Alpha battery replacement",
    amount: 880000,
    status: "approved",
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

let mockDiscountPromos: DiscountPromoRecord[] = [
  {
    id: "promo-1",
    code: "ESTATE100",
    type: "fixed",
    amount: 100000,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
    eligiblePlans: ["Dedicated 100 Mbps", "Business 50 Mbps"],
    approvalStatus: "approved",
    usageCount: 3,
  },
  {
    id: "promo-2",
    code: "WELCOME10",
    type: "percentage",
    amount: 10,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    eligiblePlans: ["20 Mbps Home", "25 Mbps Home"],
    approvalStatus: "pending",
    usageCount: 0,
  },
];

let mockCommissionRecords: CommissionRecord[] = [
  {
    id: "com-1",
    partnerName: "Tosin A.",
    leadSource: "Referral",
    convertedCustomer: "Favour Clinic",
    planValue: 125000,
    commissionAmount: 25000,
    approvalStatus: "approved",
    payoutStatus: "processing",
  },
  {
    id: "com-2",
    partnerName: "PrimeNet Reseller Desk",
    leadSource: "Estate campaign",
    convertedCustomer: "Greenwood Estate HOA",
    planValue: 850000,
    commissionAmount: 95000,
    approvalStatus: "pending",
    payoutStatus: "pending",
  },
];

const mockChurnRetention: ChurnRetentionRecord[] = [
  {
    id: "ch-1",
    customerName: "Amina Bello",
    riskLevel: "high",
    cancellationRequested: false,
    reasonForLeaving: "Repeated service instability",
    retentionAction: "Offer temporary service credit and fast-track field intervention.",
    winBackStatus: "in_progress",
  },
  {
    id: "ch-2",
    customerName: "Legacy Prints",
    riskLevel: "medium",
    cancellationRequested: true,
    reasonForLeaving: "Budget pressure",
    retentionAction: "Proposed downgrade with promo support.",
    winBackStatus: "in_progress",
  },
];

const mockImportValidation: ImportValidationSummary[] = [
  {
    module: "customers",
    totalRows: 120,
    validRows: 114,
    invalidRows: 6,
    sampleErrors: ["Duplicate PPPoE username on row 17", "Missing phone number on row 43"],
  },
  {
    module: "inventory",
    totalRows: 42,
    validRows: 39,
    invalidRows: 3,
    sampleErrors: ["Negative stock value on row 9", "Unknown supplier code on row 16"],
  },
];

let mockDemoMode: DemoModeSettings = {
  enabled: true,
  hideSensitiveSettings: true,
  preventDestructiveActions: true,
  sampleDatasetName: "WestLink Commercial Demo Pack",
};

let mockSecurityControls: SecurityControlSettings = {
  passwordResetFlow: "email_link",
  twoFactorPlaceholder: true,
  sessionTimeoutMinutes: 30,
  sensitiveActionConfirmation: true,
  auditTrailEnabled: true,
};

const mockNetworkTopology: NetworkTopologySnapshot = {
  faultDomain: "Distribution Router DR-Lekki-02 to OLT-Lekki-01",
  impactedCustomers: 21,
  path: [
    { id: "top-1", label: "Main Upstream Provider", layer: "provider", status: "healthy", linkedTo: ["top-2"], metric: "10 Gbps" },
    { id: "top-2", label: "CCR-Core-01", layer: "core_router", status: "healthy", linkedTo: ["top-3"], metric: "4.3 Gbps" },
    { id: "top-3", label: "DR-Lekki-02", layer: "distribution_router", status: "warning", linkedTo: ["top-4"], metric: "82% utilized" },
    { id: "top-4", label: "OLT-Lekki-01", layer: "olt", status: "warning", linkedTo: ["top-5"], metric: "PON 3 degraded" },
    { id: "top-5", label: "1:8 Splitter A", layer: "splitter", status: "fault", linkedTo: ["top-6"], metric: "High loss" },
    { id: "top-6", label: "MST-04 Admiralty", layer: "mst", status: "fault", linkedTo: ["top-7"], metric: "21 customers" },
    { id: "top-7", label: "Customer Cluster", layer: "customer", status: "warning", metric: "Affected" },
  ],
};

const mockCapacityPlanning: CapacityResource[] = [
  { id: "cap-1", name: "OLT-Lekki-01 / PON 3", type: "pon_port", utilizationPercent: 86, thresholdPercent: 80, availableUnits: 12, forecastDaysToExhaustion: 42, recommendation: "Plan split ratio reduction or new PON card." },
  { id: "cap-2", name: "MST-04 Splitter", type: "splitter", utilizationPercent: 88, thresholdPercent: 75, availableUnits: 1, forecastDaysToExhaustion: 18, recommendation: "Install additional 1:8 splitter in this estate." },
  { id: "cap-3", name: "Metro Uplink A", type: "uplink", utilizationPercent: 78, thresholdPercent: 70, availableUnits: 220, forecastDaysToExhaustion: 65, recommendation: "Prepare uplink burst upgrade before next quarter." },
  { id: "cap-4", name: "Lekki POP Alpha", type: "pop", utilizationPercent: 73, thresholdPercent: 70, availableUnits: 4, forecastDaysToExhaustion: 90, recommendation: "Reserve rack and power expansion capacity." },
  { id: "cap-5", name: "Retail Bandwidth Pool", type: "bandwidth", utilizationPercent: 81, thresholdPercent: 75, availableUnits: 450, forecastDaysToExhaustion: 54, recommendation: "Increase upstream commit and review peak-hour shaping." },
];

const mockGisEstimates: GisDistanceEstimate[] = [
  { customerName: "Amina Bello", closureName: "Closure CL-17", mstName: "MST-04 Admiralty", distanceClosureToMstMeters: 310, distanceMstToCustomerMeters: 86, estimatedCableMeters: 430, estimatedInstallationCost: 185000, nearestAvailableMst: "MST-04 Admiralty" },
  { customerName: "Favour Clinic", closureName: "Closure GW-03", mstName: "MST-11 Gwarinpa", distanceClosureToMstMeters: 420, distanceMstToCustomerMeters: 95, estimatedCableMeters: 560, estimatedInstallationCost: 228000, nearestAvailableMst: "MST-11 Gwarinpa" },
];

const mockFiberCoreManagement: FiberCoreManagementSnapshot[] = [
  { cableName: "Lekki Backbone 48F", coreCount: 48, usedCores: 31, spareCores: 11, reservedCores: 4, damagedCores: 2, spliceHistoryCount: 18 },
  { cableName: "Chevron Distribution 24F", coreCount: 24, usedCores: 16, spareCores: 5, reservedCores: 2, damagedCores: 1, spliceHistoryCount: 9 },
  { cableName: "Admiralty Drop Bundle 12F", coreCount: 12, usedCores: 8, spareCores: 3, reservedCores: 1, damagedCores: 0, spliceHistoryCount: 4 },
];

const mockIpamOverview: IpamSubnetRecord[] = [
  { id: "ipam-1", segment: "Core public pool", type: "public", subnet: "102.89.16.0/28", allocated: 10, available: 4, status: "warning" },
  { id: "ipam-2", segment: "Residential PPPoE VLAN 120", type: "vlan", vlanId: 120, subnet: "10.120.0.0/22", allocated: 702, available: 322, status: "healthy" },
  { id: "ipam-3", segment: "Business static pool", type: "private", subnet: "10.50.8.0/24", allocated: 181, available: 73, status: "healthy" },
  { id: "ipam-4", segment: "CGNAT pool A", type: "cgnat", subnet: "100.64.0.0/18", allocated: 14320, available: 2064, status: "critical" },
  { id: "ipam-5", segment: "DHCP Router Pool", type: "dhcp_pool", subnet: "192.168.10.0/24", allocated: 188, available: 54, status: "warning" },
];

const mockEquipmentLifecycle: EquipmentLifecycleRecord[] = [
  { id: "life-1", assetName: "OLT-Lekki-01", assetType: "olt", purchaseDate: new Date(Date.now() - 920 * 86400000).toISOString(), installationDate: new Date(Date.now() - 870 * 86400000).toISOString(), warrantyEndDate: new Date(Date.now() + 175 * 86400000).toISOString(), depreciationStatus: "mid_life", maintenanceHistory: ["Fan replacement - Jan 2026", "Optics health check - Apr 2026"], replacementSchedule: "Review for refresh in Q2 2027" },
  { id: "life-2", assetName: "Battery Bank POP Alpha", assetType: "battery", purchaseDate: new Date(Date.now() - 1280 * 86400000).toISOString(), installationDate: new Date(Date.now() - 1260 * 86400000).toISOString(), warrantyEndDate: new Date(Date.now() - 220 * 86400000).toISOString(), depreciationStatus: "end_of_life", maintenanceHistory: ["Voltage balancing - Dec 2025", "Capacity drop alert - Jul 2026"], replacementSchedule: "Immediate replacement recommended" },
];

const mockBusinessIntelligence: BusinessIntelligenceSnapshot = {
  mrr: 18450000,
  arr: 221400000,
  churnRate: 2.7,
  customerGrowthPercent: 14.8,
  arpu: 27850,
  ltv: 334200,
  ticketTrendPercent: -6.4,
  technicianPerformancePercent: 91,
  revenueByArea: [
    { area: "Lekki Phase 1", revenue: 6200000 },
    { area: "Chevron", revenue: 4100000 },
    { area: "Gwarinpa Central", revenue: 3250000 },
  ],
};

const mockDisasterRecovery: DisasterRecoverySnapshot = {
  backupHealth: "healthy",
  failoverReadiness: "partial",
  restoreTestedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
  recoveryStatus: "documented",
  notes: [
    "Daily backups healthy and replicated to secondary region.",
    "Quarterly restore testing exists but application failover is still partial.",
    "Runbook for major outage response has been documented for operations leadership.",
  ],
};

const mockDeveloperPortal: DeveloperPortalSnapshot = {
  apiBaseUrl: "https://api.vux.example/v1",
  authentication: ["api_key", "oauth2", "webhooks", "rate_limiting"],
  docsStatus: "draft",
  exampleCollections: ["Postman collection", "Webhook signing example", "OAuth client walkthrough"],
};

const mockPluginCatalog: PluginCatalogEntry[] = [
  { id: "plug-1", name: "Paystack Billing Connector", category: "payment", status: "installed", description: "Extends invoice collection and webhook handling." },
  { id: "plug-2", name: "SmartOLT Telemetry Adapter", category: "network", status: "beta", description: "Imports optical alarms and device metrics." },
  { id: "plug-3", name: "WhatsApp Broadcast Add-on", category: "communication", status: "available", description: "Adds message templates and campaign dispatching." },
];

const mockLocalizationSettings: LocalizationSettings = {
  currencies: ["NGN", "USD", "KES"],
  timezones: ["Africa/Lagos", "Africa/Nairobi", "UTC"],
  languages: ["English", "French", "Swahili"],
  taxMode: "per-tenant regional rules",
  regionalFormats: ["en-NG", "en-KE", "fr-FR"],
};

const mockLicenseSubscription: LicenseSubscriptionSnapshot = {
  tenantName: "WestLink Fibre",
  licenseTier: "enterprise",
  billingCycle: "annually",
  activeSeats: 26,
  seatLimit: 40,
  storageUsedGb: 182,
  storageLimitGb: 500,
  enabledModules: ["CRM", "Billing", "Inventory", "Field Ops", "Maps", "AI NOC", "Customer Portal"],
};

const mockLaunchReadiness: LaunchReadinessChecklist = {
  score: 86,
  completed: [
    "Commercial CRM, billing, inventory, support, and technician modules are present.",
    "Enterprise operations workflows now have backend-ready persistence structure.",
    "Multi-tenant brand and settings experience is demo-ready.",
  ],
  remaining: [
    "Move remaining mock analytics and portal workflows to live backend persistence.",
    "Add tenant-level backend isolation to all new operations records.",
    "Finalize production API gateway, rate limiting, and webhook security.",
  ],
  securityRisks: [
    "2FA is still a placeholder and should be implemented before production launch.",
    "Some integration modules are API-ready but still awaiting secret management and webhook verification.",
  ],
  performanceNotes: [
    "Introduce pagination and server-side filtering for large CRM and inventory datasets.",
    "Add caching and background aggregation for BI metrics above 100k customers.",
    "Index operation_records by tenant/module/status before production-scale rollout.",
  ],
};

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

function enrichCustomerRecord(customer: Customer): Customer {
  const defaultDeviceAssignments: DeviceAssignmentRecord[] = [
    {
      id: `${customer.id}-onu`,
      deviceType: "onu",
      model: `${customer.onuVendor ?? "ZTE"} ${customer.onuModel ?? "ONU"}`.trim(),
      serialNumber: customer.onuSerial,
      macAddress: customer.onuMac,
      status: "assigned",
      assignedAt: customer.installDate ?? customer.customerSince ?? new Date().toISOString(),
    },
    {
      id: `${customer.id}-router`,
      deviceType: "router",
      model: `${customer.routerBrand ?? "Huawei"} ${customer.routerModel ?? "Router"}`.trim(),
      serialNumber: customer.routerSerial ?? `RTR-${customer.id}`,
      macAddress: customer.routerMac,
      status: customer.routerMac ? "assigned" : "replaced",
      assignedAt: customer.installDate ?? customer.customerSince ?? new Date().toISOString(),
      notes: customer.routerType === "upgraded" ? "Upgraded router supplied during service optimization." : undefined,
    },
  ];

  const defaultPlanChanges: PlanChangeRecord[] = customer.planName
    ? [
        {
          id: `${customer.id}-plan-change`,
          oldPlan: customer.planName === "Business 50 Mbps" ? "25 Mbps Home" : customer.planName,
          newPlan: customer.planName,
          priceDifference: customer.monthlyFee ? Math.round(customer.monthlyFee * 0.35) : 0,
          effectiveDate: customer.lastPaymentDate ?? new Date().toISOString(),
          paymentAdjustment: "Proration to be calculated on billing confirmation.",
          approvalStatus: "approved",
        },
      ]
    : [];

  const defaultSuspensions: SuspensionWorkflowRecord[] =
    customer.accountStatus === "suspended"
      ? [
          {
            id: `${customer.id}-suspend`,
            reason: "Payment delinquency",
            suspendedBy: "Finance Desk",
            suspensionDate: customer.nextInvoiceDate ?? new Date().toISOString(),
            paymentStatus: customer.paymentStatus ?? "overdue",
          },
        ]
      : [];

  const defaultRenewals: ContractRenewalRecord[] =
    customer.slaTier && customer.slaTier !== "bronze"
      ? [
          {
            id: `${customer.id}-renewal`,
            contractStartDate: customer.customerSince ?? new Date().toISOString(),
            contractEndDate: customer.nextInvoiceDate ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
            renewalReminderDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
            renewalStatus: "upcoming",
            signedAgreement: true,
            accountManager: customer.assignedEngineer ?? "Enterprise Desk",
          },
        ]
      : [];

  const defaultFeedback: CustomerFeedbackRecord[] = [
    {
      id: `${customer.id}-feedback`,
      source: "installation",
      rating: customer.supportStatus === "needs_attention" ? 3 : 5,
      comment: customer.supportStatus === "needs_attention" ? "Install was completed, but follow-up signal stabilization was needed." : "Installation team was prompt and professional.",
      satisfactionScore: customer.supportStatus === "needs_attention" ? 62 : 91,
      createdAt: customer.installDate ?? customer.customerSince ?? new Date().toISOString(),
    },
  ];

  const defaultTimeline: CustomerTimelineEvent[] = [
    {
      id: `${customer.id}-timeline-registration`,
      type: "registration",
      title: "Customer registered",
      description: "Initial CRM profile created.",
      createdAt: customer.customerSince ?? new Date().toISOString(),
      actor: "Customer Care",
      status: "completed",
    },
    {
      id: `${customer.id}-timeline-install`,
      type: "installation",
      title: "Installation completed",
      description: `ONU ${customer.onuSerial} and router assets assigned.`,
      createdAt: customer.installDate ?? customer.customerSince ?? new Date().toISOString(),
      actor: customer.assignedEngineer ?? "Installation Team",
      status: customer.installStatus ?? "installed",
    },
    {
      id: `${customer.id}-timeline-payment`,
      type: "payment",
      title: "Latest payment cycle",
      description: customer.paymentStatus === "overdue" ? "Customer account has overdue invoices." : "Subscription payment recorded successfully.",
      createdAt: customer.lastPaymentDate ?? customer.nextInvoiceDate ?? new Date().toISOString(),
      actor: "Finance",
      status: customer.paymentStatus ?? "pending",
    },
  ];

  return {
    ...customer,
    kyc:
      customer.kyc ??
      mockCustomerKycById[customer.id] ?? {
        idType: "national_id",
        idNumber: "Pending verification",
        addressProof: "Pending upload",
        customerPhoto: "Pending upload",
        verificationStatus: "pending",
      },
    documents: customer.documents ?? mockCustomerDocumentsById[customer.id] ?? [],
    slaMetrics:
      customer.slaMetrics ??
      mockCustomerSlaById[customer.id] ?? {
        profile: customer.slaTier === "gold" ? "dedicated" : customer.slaTier === "silver" ? "business" : "standard",
        uptimeTarget: customer.slaTier === "gold" ? "99.9%" : customer.slaTier === "silver" ? "99.5%" : "98.5%",
        currentUptime: customer.online ? "99.72%" : "98.94%",
        downtimeMinutes: customer.online ? 64 : 202,
        averageResponseMinutes: 24,
        averageResolutionMinutes: 91,
        breachCount: customer.online ? 0 : 1,
        faultDurationMinutes: customer.online ? 64 : 202,
        breachRisk: customer.online ? "normal" : "warning",
      },
    deviceAssignments: customer.deviceAssignments ?? defaultDeviceAssignments,
    planChangeHistory: customer.planChangeHistory ?? defaultPlanChanges,
    suspensionHistory: customer.suspensionHistory ?? defaultSuspensions,
    contractRenewals: customer.contractRenewals ?? defaultRenewals,
    feedback: customer.feedback ?? defaultFeedback,
    timeline: customer.timeline ?? defaultTimeline,
  };
}

function getTenantProfile(tenantId: string) {
  return mockTenantProfiles.find((profile) => profile.tenantId === tenantId) ?? {
    tenantId,
    companyName: tenantId,
    supportEmail: `support@${tenantId}.example`,
    supportPhone: "+234 800 000 0000",
    address: "Tenant address pending",
    timezone: "Africa/Lagos",
    currency: "NGN",
    defaultBillingCycle: "monthly" as const,
    paymentGateway: "manual" as const,
    mapProvider: "openstreetmap" as const,
    whatsappEnabled: false,
  };
}

function appendSettingsLog(
  tenantId: string,
  entry: Omit<SettingsLog, "id" | "createdAt" | "tenantId">,
) {
  mockSettingsLogs.unshift({
    id: randomId("log"),
    tenantId,
    createdAt: new Date().toISOString(),
    ...entry,
  });
}

export const apiClient = {
  async login(email: string, password: string, tenantId: string): Promise<AuthResponse> {
    if (USE_MOCKS) {
      await sleep();
      const profile = getTenantProfile(tenantId);
      return {
        token: `mock-token-${password.length}`,
        user: { ...mockUser, email, tenantId, fullName: tenantId === "tenant-north-002" ? "NorthWave Supervisor" : mockUser.fullName },
        branding: { tenantId, ispName: profile.companyName, logoUrl: profile.logoUrl, primaryColor: profile.primaryColor },
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
      const existing = mockTenantProfiles.find((profile) => profile.tenantId === payload.tenantId);
      if (!existing) {
        mockTenantProfiles.push({
          tenantId: payload.tenantId,
          companyName: payload.ispName,
          supportEmail: payload.email,
          supportPhone: "+234 800 000 0000",
          address: "Tenant address pending",
          timezone: "Africa/Lagos",
          currency: "NGN",
          defaultBillingCycle: "monthly",
          paymentGateway: "manual",
          mapProvider: "openstreetmap",
          whatsappEnabled: false,
        });
      }
      const user: User = {
        id: randomId("u"),
        email: payload.email,
        fullName: payload.fullName,
        role: "tenant_admin",
        tenantId: payload.tenantId,
      };
      const branding: TenantBranding = { tenantId: payload.tenantId, ispName: payload.ispName };
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
      return mockCustomers.map(enrichCustomerRecord);
    }
    const { data } = await api.get<Customer[]>("/customers", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data.map(enrichCustomerRecord);
  },

  async getCustomerById(id: string, tenantId: string, token?: string): Promise<Customer> {
    if (USE_MOCKS) {
      await sleep(230);
      const found = mockCustomers.find((customer) => customer.id === id);
      if (!found) throw new Error("Customer not found");
      return enrichCustomerRecord(found);
    }
    const { data } = await api.get<Customer>(`/customers/${id}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return enrichCustomerRecord(data);
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
      coreCount: cable.coreCount ?? (cable.core_count as FibreCoreCount) ?? (cable.cores.length as FibreCoreCount),
    }));
  },

  async createMstConnection(
    payload: {
      startMstId: string;
      endMstId: string;
      geometry: { lat: number; lng: number }[];
      coreCount: FibreCoreCount;
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
      status: "free" | "used" | "reserved";
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
      return mockServicePlans.map((plan, index) => ({
        id: plan.id ?? `plan-${tenantId}-${index + 1}`,
        tenantId,
        billingCycle: plan.billingCycle ?? "monthly",
        status: plan.status ?? "active",
        category: plan.category ?? "business",
        speedMbps: plan.speedMbps ?? (Number.parseInt(plan.speed, 10) || undefined),
        priceMonthly: plan.priceMonthly ?? (Number(String(plan.price).replace(/[^\d.]/g, "")) || undefined),
        ...plan,
      }));
    }
    const { data } = await api.get<ServicePlan[]>("/settings/services", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createServicePlan(payload: ServicePlan, tenantId: string, token?: string): Promise<ServicePlan> {
    if (USE_MOCKS) {
      await sleep(170);
      appendSettingsLog(tenantId, {
        type: "create",
        actor: "Tenant Admin",
        module: "plans",
        description: `Created plan ${payload.name}.`,
      });
      return addMockServicePlan({ ...payload, tenantId, id: payload.id ?? randomId("plan"), status: payload.status ?? "active" });
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
      appendSettingsLog(tenantId, {
        type: "create",
        actor: "Tenant Admin",
        module: "nas",
        description: `Added NAS ${payload.name}.`,
      });
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
      appendSettingsLog(tenantId, {
        type: "update",
        actor: "Tenant Admin",
        module: "nas",
        description: `Updated NAS ${payload.name}.`,
      });
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
      appendSettingsLog(tenantId, {
        type: "create",
        actor: "Tenant Admin",
        module: "zones",
        description: `Created zone ${payload.name}.`,
      });
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
      appendSettingsLog(tenantId, {
        type: "update",
        actor: "Tenant Admin",
        module: "permissions",
        description: `Updated permission profile ${payload.id}.`,
      });
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
      appendSettingsLog(tenantId, {
        type: "create",
        actor: "Tenant Admin",
        module: "users",
        description: `Created team member ${payload.fullName}.`,
      });
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
      appendSettingsLog(tenantId, {
        type: "assign",
        actor: "Tenant Admin",
        module: "permissions",
        description: `Updated map access for ${payload.member.fullName}.`,
      });
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
      return mockSettingsLogs
        .filter((entry) => !entry.tenantId || entry.tenantId === tenantId)
        .map((entry) => ({ ...entry, tenantId: entry.tenantId ?? tenantId }));
    }
    const { data } = await api.get<SettingsLog[]>("/settings/logs", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getTenantProfileSettings(tenantId: string, token?: string): Promise<TenantProfile> {
    if (USE_MOCKS) {
      await sleep(180);
      return getTenantProfile(tenantId);
    }
    const { data } = await api.get<TenantProfile>("/settings/company", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async updateTenantProfileSettings(payload: TenantProfile, tenantId: string, token?: string): Promise<TenantProfile> {
    if (USE_MOCKS) {
      await sleep(170);
      const index = mockTenantProfiles.findIndex((entry) => entry.tenantId === tenantId);
      if (index >= 0) {
        mockTenantProfiles[index] = payload;
      } else {
        mockTenantProfiles.push(payload);
      }
      appendSettingsLog(tenantId, {
        type: "update",
        actor: "Tenant Admin",
        module: "company",
        description: "Updated company profile and tenant settings.",
      });
      return payload;
    }
    const { data } = await api.put<TenantProfile>("/settings/company", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getNotificationRules(tenantId: string, token?: string): Promise<NotificationRule[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return mockNotificationRules.filter((entry) => entry.tenantId === tenantId);
    }
    const { data } = await api.get<NotificationRule[]>("/settings/notifications", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async saveNotificationRule(payload: NotificationRule, tenantId: string, token?: string): Promise<NotificationRule> {
    if (USE_MOCKS) {
      await sleep(160);
      const index = mockNotificationRules.findIndex((entry) => entry.id === payload.id);
      if (index >= 0) {
        mockNotificationRules[index] = payload;
      } else {
        mockNotificationRules.unshift(payload);
      }
      appendSettingsLog(tenantId, {
        type: "notification",
        actor: "Tenant Admin",
        module: "notifications",
        description: `Saved notification rule ${payload.name}.`,
      });
      return payload;
    }
    const { data } = await api.post<NotificationRule>("/settings/notifications", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getServiceAreas(tenantId: string, token?: string): Promise<ServiceArea[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return mockServiceAreas.filter((entry) => entry.tenantId === tenantId);
    }
    const { data } = await api.get<ServiceArea[]>("/settings/coverage", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createServiceArea(payload: ServiceArea, tenantId: string, token?: string): Promise<ServiceArea> {
    if (USE_MOCKS) {
      await sleep(150);
      mockServiceAreas.unshift(payload);
      appendSettingsLog(tenantId, {
        type: "create",
        actor: "Operations Manager",
        module: "coverage",
        description: `Added coverage area ${payload.name}.`,
      });
      return payload;
    }
    const { data } = await api.post<ServiceArea>("/settings/coverage", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getLeads(tenantId: string, token?: string): Promise<Lead[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return mockLeads.filter((entry) => entry.tenantId === tenantId);
    }
    const { data } = await api.get<Lead[]>("/crm/leads", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async createLead(payload: Lead, tenantId: string, token?: string): Promise<Lead> {
    if (USE_MOCKS) {
      await sleep(150);
      mockLeads.unshift(payload);
      appendSettingsLog(tenantId, {
        type: "create",
        actor: "Sales Desk",
        module: "leads",
        description: `Created lead ${payload.fullName}.`,
      });
      return payload;
    }
    const { data } = await api.post<Lead>("/crm/leads", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async askAiNoc(
    payload: { prompt: string; mode: AiNocResponse["mode"] },
    tenantId: string,
    token?: string,
  ): Promise<AiNocResponse> {
    if (USE_MOCKS) {
      await sleep(260);
      const response: AiNocResponse = {
        id: randomId("ai"),
        tenantId,
        prompt: payload.prompt,
        mode: payload.mode,
        response:
          payload.mode === "fault_analysis"
            ? "Probable cause: optical loss on the distribution segment. Check the last closure splice, compare recent RX drop trends, and prioritize the affected business customers for dispatch."
            : payload.mode === "report"
              ? "Executive summary: service remained stable in the core zone, while one distribution outage affected a small customer cluster and required coordinated NOC, field, and customer-care follow-up."
              : payload.mode === "outage_explanation"
                ? "Customer-facing explanation: a fibre path issue reduced service quality in your area. Our field team is already working on restoration and updates will be shared as repair milestones are completed."
                : payload.mode === "technician_guidance"
                  ? "Technician guidance: verify power levels at ONU and MST, inspect drop cable bends, test spare core continuity, and record before/after signal values before closing the task."
                  : "Support guidance: confirm tenant, customer ID, plan, payment state, and current outage context, then provide the next action and ETA clearly.",
        createdAt: new Date().toISOString(),
      };
      mockAiNocResponses.unshift(response);
      appendSettingsLog(tenantId, {
        type: "create",
        actor: "AI NOC",
        module: "ai",
        description: `Generated AI ${payload.mode.replace("_", " ")} response.`,
      });
      return response;
    }
    const { data } = await api.post<AiNocResponse>("/ai/noc", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getSiteManagement(tenantId: string, token?: string): Promise<SiteManagementRecord[]> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockSites;
    }
    const { data } = await api.get<SiteManagementRecord[]>("/operations/sites", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getNocAlerts(tenantId: string, token?: string): Promise<NocAlert[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return mockNocAlerts;
    }
    const { data } = await api.get<NocAlert[]>("/operations/noc-alerts", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getUsageAnalytics(tenantId: string, token?: string): Promise<UsageAnalyticsSnapshot> {
    if (USE_MOCKS) {
      await sleep(180);
      return mockUsageAnalytics;
    }
    const { data } = await api.get<UsageAnalyticsSnapshot>("/operations/usage", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getEnterpriseSlaReports(tenantId: string, token?: string): Promise<EnterpriseSlaReport[]> {
    if (USE_MOCKS) {
      await sleep(150);
      return mockSlaReports;
    }
    const { data } = await api.get<EnterpriseSlaReport[]>("/operations/sla-reports", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getProcurementRecords(tenantId: string, token?: string): Promise<ProcurementRecord[]> {
    if (USE_MOCKS) {
      await sleep(170);
      return mockProcurementRecords;
    }
    const { data } = await api.get<ProcurementRecord[]>("/procurement/records", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getExpenseBreakdown(tenantId: string, token?: string): Promise<ExpenseSummaryLine[]> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockExpenseSummary;
    }
    const { data } = await api.get<ExpenseSummaryLine[]>("/finance/expense-breakdown", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getBackupStatus(tenantId: string, token?: string): Promise<BackupStatus> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockBackupStatus;
    }
    const { data } = await api.get<BackupStatus>("/system/backup-status", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getIntegrations(tenantId: string, token?: string): Promise<IntegrationService[]> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockIntegrations;
    }
    const { data } = await api.get<IntegrationService[]>("/system/integrations", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getResellerAgents(tenantId: string, token?: string): Promise<ResellerAgentRecord[]> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockResellerAgents;
    }
    const { data } = await api.get<ResellerAgentRecord[]>("/crm/agents", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getSystemHealth(tenantId: string, token?: string): Promise<SystemHealthSnapshot> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockSystemHealth;
    }
    const { data } = await api.get<SystemHealthSnapshot>("/system/health", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getOnboardingChecklist(tenantId: string, token?: string): Promise<OnboardingChecklist[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockOnboardingChecklist;
    }
    const { data } = await api.get<OnboardingChecklist[]>("/system/onboarding", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getInstallationWorkflow(tenantId: string, token?: string): Promise<InstallationWorkflowRecord[]> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockInstallationWorkflow;
    }
    const { data } = await api.get<InstallationWorkflowRecord[]>("/operations/installations", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getSiteSurveys(tenantId: string, token?: string): Promise<SiteSurveyRecord[]> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockSiteSurveys;
    }
    const { data } = await api.get<SiteSurveyRecord[]>("/operations/site-surveys", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getFaultWorkflowTickets(tenantId: string, token?: string): Promise<FaultWorkflowTicket[]> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockFaultWorkflowTickets;
    }
    const { data } = await api.get<FaultWorkflowTicket[]>("/operations/fault-workflow", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getOutageMaintenance(tenantId: string, token?: string): Promise<OutageMaintenanceRecord[]> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockOutages;
    }
    const { data } = await api.get<OutageMaintenanceRecord[]>("/operations/outages", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getCommunicationTemplates(tenantId: string, token?: string): Promise<CommunicationTemplateRecord[]> {
    if (USE_MOCKS) {
      await sleep(120);
      return mockCommunicationTemplates;
    }
    const { data } = await api.get<CommunicationTemplateRecord[]>("/operations/communication-templates", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async saveCommunicationTemplate(
    payload: CommunicationTemplateRecord,
    tenantId: string,
    token?: string,
  ): Promise<CommunicationTemplateRecord> {
    if (USE_MOCKS) {
      await sleep(140);
      const nextPayload = payload.id ? payload : { ...payload, id: randomId("tpl") };
      const existingIndex = mockCommunicationTemplates.findIndex((entry) => entry.id === nextPayload.id);
      if (existingIndex >= 0) {
        mockCommunicationTemplates[existingIndex] = nextPayload;
      } else {
        mockCommunicationTemplates = [nextPayload, ...mockCommunicationTemplates];
      }
      return nextPayload;
    }
    if (payload.id) {
      const { data } = await api.patch<CommunicationTemplateRecord>(`/operations/communication-templates/${payload.id}`, payload, {
        headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      });
      return data;
    }
    const { data } = await api.post<CommunicationTemplateRecord>("/operations/communication-templates", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getKnowledgeBase(tenantId: string, token?: string): Promise<KnowledgeBaseArticle[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockKnowledgeBase;
    }
    const { data } = await api.get<KnowledgeBaseArticle[]>("/operations/knowledge-base", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async saveKnowledgeBaseArticle(payload: KnowledgeBaseArticle, tenantId: string, token?: string): Promise<KnowledgeBaseArticle> {
    if (USE_MOCKS) {
      await sleep(140);
      const nextPayload = payload.id ? payload : { ...payload, id: randomId("kb") };
      const existingIndex = mockKnowledgeBase.findIndex((entry) => entry.id === nextPayload.id);
      if (existingIndex >= 0) {
        mockKnowledgeBase[existingIndex] = nextPayload;
      } else {
        mockKnowledgeBase = [nextPayload, ...mockKnowledgeBase];
      }
      return nextPayload;
    }
    if (payload.id) {
      const { data } = await api.patch<KnowledgeBaseArticle>(`/operations/knowledge-base/${payload.id}`, payload, {
        headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      });
      return data;
    }
    const { data } = await api.post<KnowledgeBaseArticle>("/operations/knowledge-base", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getApprovalRequests(tenantId: string, token?: string): Promise<ApprovalWorkflowRecord[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockApprovalRequests;
    }
    const { data } = await api.get<ApprovalWorkflowRecord[]>("/operations/approvals", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async saveApprovalRequest(
    payload: ApprovalWorkflowRecord,
    tenantId: string,
    token?: string,
  ): Promise<ApprovalWorkflowRecord> {
    if (USE_MOCKS) {
      await sleep(140);
      const nextPayload = payload.id ? payload : { ...payload, id: randomId("apr") };
      const existingIndex = mockApprovalRequests.findIndex((entry) => entry.id === nextPayload.id);
      if (existingIndex >= 0) {
        mockApprovalRequests[existingIndex] = nextPayload;
      } else {
        mockApprovalRequests = [nextPayload, ...mockApprovalRequests];
      }
      return nextPayload;
    }
    if (payload.id) {
      const { data } = await api.patch<ApprovalWorkflowRecord>(`/operations/approvals/${payload.id}`, payload, {
        headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      });
      return data;
    }
    const { data } = await api.post<ApprovalWorkflowRecord>("/operations/approvals", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getDiscountPromos(tenantId: string, token?: string): Promise<DiscountPromoRecord[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockDiscountPromos;
    }
    const { data } = await api.get<DiscountPromoRecord[]>("/operations/promos", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async saveDiscountPromo(payload: DiscountPromoRecord, tenantId: string, token?: string): Promise<DiscountPromoRecord> {
    if (USE_MOCKS) {
      await sleep(140);
      const nextPayload = payload.id ? payload : { ...payload, id: randomId("promo") };
      const existingIndex = mockDiscountPromos.findIndex((entry) => entry.id === nextPayload.id);
      if (existingIndex >= 0) {
        mockDiscountPromos[existingIndex] = nextPayload;
      } else {
        mockDiscountPromos = [nextPayload, ...mockDiscountPromos];
      }
      return nextPayload;
    }
    if (payload.id) {
      const { data } = await api.patch<DiscountPromoRecord>(`/operations/promos/${payload.id}`, payload, {
        headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      });
      return data;
    }
    const { data } = await api.post<DiscountPromoRecord>("/operations/promos", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getCommissionRecords(tenantId: string, token?: string): Promise<CommissionRecord[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockCommissionRecords;
    }
    const { data } = await api.get<CommissionRecord[]>("/operations/commissions", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async saveCommissionRecord(payload: CommissionRecord, tenantId: string, token?: string): Promise<CommissionRecord> {
    if (USE_MOCKS) {
      await sleep(140);
      const nextPayload = payload.id ? payload : { ...payload, id: randomId("com") };
      const existingIndex = mockCommissionRecords.findIndex((entry) => entry.id === nextPayload.id);
      if (existingIndex >= 0) {
        mockCommissionRecords[existingIndex] = nextPayload;
      } else {
        mockCommissionRecords = [nextPayload, ...mockCommissionRecords];
      }
      return nextPayload;
    }
    if (payload.id) {
      const { data } = await api.patch<CommissionRecord>(`/operations/commissions/${payload.id}`, payload, {
        headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
      });
      return data;
    }
    const { data } = await api.post<CommissionRecord>("/operations/commissions", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getChurnRetention(tenantId: string, token?: string): Promise<ChurnRetentionRecord[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockChurnRetention;
    }
    const { data } = await api.get<ChurnRetentionRecord[]>("/operations/churn-retention", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getImportValidationSummaries(tenantId: string, token?: string): Promise<ImportValidationSummary[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockImportValidation;
    }
    const { data } = await api.get<ImportValidationSummary[]>("/operations/import-validation", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getDemoModeSettings(tenantId: string, token?: string): Promise<DemoModeSettings> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockDemoMode;
    }
    const { data } = await api.get<DemoModeSettings>("/operations/demo-mode", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async updateDemoModeSettings(payload: DemoModeSettings, tenantId: string, token?: string): Promise<DemoModeSettings> {
    if (USE_MOCKS) {
      await sleep(140);
      mockDemoMode = payload;
      return payload;
    }
    const { data } = await api.put<DemoModeSettings>("/operations/demo-mode", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getSecurityControls(tenantId: string, token?: string): Promise<SecurityControlSettings> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockSecurityControls;
    }
    const { data } = await api.get<SecurityControlSettings>("/operations/security-controls", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async updateSecurityControls(payload: SecurityControlSettings, tenantId: string, token?: string): Promise<SecurityControlSettings> {
    if (USE_MOCKS) {
      await sleep(140);
      mockSecurityControls = payload;
      return payload;
    }
    const { data } = await api.put<SecurityControlSettings>("/operations/security-controls", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getNetworkTopology(tenantId: string, token?: string): Promise<NetworkTopologySnapshot> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockNetworkTopology;
    }
    const { data } = await api.get<NetworkTopologySnapshot>("/operations/topology", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getCapacityPlanning(tenantId: string, token?: string): Promise<CapacityResource[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockCapacityPlanning;
    }
    const { data } = await api.get<CapacityResource[]>("/operations/capacity-planning", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getGisDistanceEstimates(tenantId: string, token?: string): Promise<GisDistanceEstimate[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockGisEstimates;
    }
    const { data } = await api.get<GisDistanceEstimate[]>("/operations/gis-distance", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getFiberCoreManagement(tenantId: string, token?: string): Promise<FiberCoreManagementSnapshot[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockFiberCoreManagement;
    }
    const { data } = await api.get<FiberCoreManagementSnapshot[]>("/operations/fiber-core-management", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getIpamOverview(tenantId: string, token?: string): Promise<IpamSubnetRecord[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockIpamOverview;
    }
    const { data } = await api.get<IpamSubnetRecord[]>("/operations/ipam", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getEquipmentLifecycle(tenantId: string, token?: string): Promise<EquipmentLifecycleRecord[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockEquipmentLifecycle;
    }
    const { data } = await api.get<EquipmentLifecycleRecord[]>("/operations/equipment-lifecycle", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getCustomerTimeline(customerId: string, tenantId: string, token?: string): Promise<CustomerTimelineEvent[]> {
    if (USE_MOCKS) {
      await sleep(100);
      const customer = mockCustomers.find((entry) => entry.id === customerId);
      return customer?.timeline ?? [];
    }
    const { data } = await api.get<CustomerTimelineEvent[]>(`/operations/customer-timeline/${customerId}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getBusinessIntelligence(tenantId: string, token?: string): Promise<BusinessIntelligenceSnapshot> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockBusinessIntelligence;
    }
    const { data } = await api.get<BusinessIntelligenceSnapshot>("/operations/business-intelligence", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getDisasterRecovery(tenantId: string, token?: string): Promise<DisasterRecoverySnapshot> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockDisasterRecovery;
    }
    const { data } = await api.get<DisasterRecoverySnapshot>("/operations/disaster-recovery", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getDeveloperPortal(tenantId: string, token?: string): Promise<DeveloperPortalSnapshot> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockDeveloperPortal;
    }
    const { data } = await api.get<DeveloperPortalSnapshot>("/operations/developer-portal", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getPluginCatalog(tenantId: string, token?: string): Promise<PluginCatalogEntry[]> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockPluginCatalog;
    }
    const { data } = await api.get<PluginCatalogEntry[]>("/operations/plugins", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getLocalizationSettings(tenantId: string, token?: string): Promise<LocalizationSettings> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockLocalizationSettings;
    }
    const { data } = await api.get<LocalizationSettings>("/operations/localization", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getLicenseSubscription(tenantId: string, token?: string): Promise<LicenseSubscriptionSnapshot> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockLicenseSubscription;
    }
    const { data } = await api.get<LicenseSubscriptionSnapshot>("/operations/license-subscription", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getLaunchReadiness(tenantId: string, token?: string): Promise<LaunchReadinessChecklist> {
    if (USE_MOCKS) {
      await sleep(100);
      return mockLaunchReadiness;
    }
    const { data } = await api.get<LaunchReadinessChecklist>("/operations/launch-readiness", {
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

  async customerPortalLogin(payload: { identity: string; password: string; tenantId?: string }): Promise<CustomerPortalSession> {
    if (USE_MOCKS) {
      await sleep(200);
      const session = portalLogin(payload.identity, payload.password);
      return {
        access_token: session.token,
        token_type: "bearer",
        customer_id: session.customerId,
        tenant_id: "tenant-west-001",
        username: payload.identity,
        first_login_required: false,
      };
    }
    const { data } = await api.post<CustomerPortalSession>("/api/customer-portal/login", {
      identity: payload.identity,
      password: payload.password,
      tenant_id: payload.tenantId,
    });
    return data;
  },

  async getCustomerPortalProfile(customerId: string, token?: string): Promise<CustomerPortalProfile> {
    if (USE_MOCKS) {
      await sleep(180);
      return getPortalProfile(customerId);
    }
    const { data } = await api.get<CustomerPortalProfile>(`/api/customer-portal/${customerId}/profile`, {
      headers: authHeaders(token),
    });
    return data;
  },

  async getCustomerPortalPlans(token?: string): Promise<CustomerPlan[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return getPortalPlans();
    }
    const { data } = await api.get<CustomerPlan[]>("/api/customer-portal/plans", {
      headers: authHeaders(token),
    });
    return data;
  },

  async getCustomerPortalTickets(customerId: string, token?: string): Promise<CustomerTicket[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return getPortalTickets(customerId);
    }
    const { data } = await api.get<CustomerTicket[]>(`/api/customer-portal/${customerId}/tickets`, {
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
    const { data } = await api.post<CustomerTicket>(`/api/customer-portal/${customerId}/tickets`, payload, {
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
      `/api/customer-portal/${customerId}/tickets/${payload.ticketId}`,
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
    const { data } = await api.get<CustomerNotification[]>(`/api/customer-portal/${customerId}/notifications`, {
      headers: authHeaders(token),
    });
    return data;
  },

  async getCustomerPortalPayments(customerId: string, token?: string): Promise<CustomerPayment[]> {
    if (USE_MOCKS) {
      await sleep(160);
      return getPortalPayments(customerId);
    }
    const { data } = await api.get<CustomerPayment[]>(`/api/customer-portal/${customerId}/payments`, {
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
    const { data } = await api.post<CustomerPayment>(`/api/customer-portal/${customerId}/payments`, payload, {
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
    const { data } = await api.post<CustomerPortalProfile>(`/api/customer-portal/${customerId}/upgrade`, payload, {
      headers: authHeaders(token),
    });
    return data;
  },

  async getCustomerPortalUsage(customerId: string, token?: string): Promise<UsageSnapshot[]> {
    if (USE_MOCKS) {
      await sleep(140);
      return getPortalUsage(customerId);
    }
    const { data } = await api.get<UsageSnapshot[]>(`/api/customer-portal/${customerId}/usage`, {
      headers: authHeaders(token),
    });
    return data;
  },

  async changeCustomerPortalPassword(payload: { currentPassword: string; newPassword: string }, token?: string) {
    const { data } = await api.post<{ success: boolean }>(
      "/api/customer-portal/change-password",
      {
        current_password: payload.currentPassword,
        new_password: payload.newPassword,
      },
      { headers: authHeaders(token) },
    );
    return data;
  },

  async getPortalAccessStatus(customerId: string, tenantId: string, token?: string): Promise<PortalAccessStatus> {
    const { data } = await api.get<PortalAccessStatus>(`/api/customer-portal/access/${customerId}`, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async provisionPortalAccess(
    payload: {
      customerId: string;
      username?: string;
      email?: string;
      phone?: string;
      temporaryPassword?: string;
    },
    tenantId: string,
    token?: string,
  ): Promise<PortalAccessProvisionResponse> {
    const { data } = await api.post<PortalAccessProvisionResponse>(
      "/api/customer-portal/access",
      {
        customer_id: payload.customerId,
        username: payload.username,
        email: payload.email,
        phone: payload.phone,
        temporary_password: payload.temporaryPassword,
      },
      { headers: { ...tenantHeaders(tenantId), ...authHeaders(token) } },
    );
    return data;
  },

  async getPortalPaymentInvoiceHtml(customerId: string, paymentId: string, token?: string): Promise<string> {
    const { data } = await api.get<string>(`/api/payment-gateway/portal/${customerId}/payments/${paymentId}/invoice`, {
      headers: authHeaders(token),
      responseType: "text" as "json",
    });
    return data;
  },

  async getPortalPaymentInvoicePdf(customerId: string, paymentId: string, token?: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/api/payment-gateway/portal/${customerId}/payments/${paymentId}/invoice.pdf`, {
      headers: authHeaders(token),
      responseType: "blob",
    });
    return data;
  },

  async getPortalPaymentReceiptHtml(customerId: string, paymentId: string, token?: string): Promise<string> {
    const { data } = await api.get<string>(`/api/payment-gateway/portal/${customerId}/payments/${paymentId}/receipt`, {
      headers: authHeaders(token),
      responseType: "text" as "json",
    });
    return data;
  },

  async getPortalPaymentReceiptPdf(customerId: string, paymentId: string, token?: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/api/payment-gateway/portal/${customerId}/payments/${paymentId}/receipt.pdf`, {
      headers: authHeaders(token),
      responseType: "blob",
    });
    return data;
  },

  async getPaymentProviderConfigs(tenantId: string, token?: string): Promise<PaymentProviderConfig[]> {
    const { data } = await api.get<PaymentProviderConfig[]>("/api/payment-gateway/configs", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async savePaymentProviderConfig(
    payload: Omit<PaymentProviderConfig, "id" | "tenant_id" | "created_at" | "updated_at"> & { provider: PaymentProviderConfig["provider"] },
    tenantId: string,
    token?: string,
  ): Promise<PaymentProviderConfig> {
    const { data } = await api.post<PaymentProviderConfig>("/api/payment-gateway/configs", payload, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async getActivationQueue(tenantId: string, token?: string): Promise<ActivationQueueRecord[]> {
    const { data } = await api.get<ActivationQueueRecord[]>("/api/payment-gateway/activation-queue", {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
    });
    return data;
  },

  async retryActivationQueueRecord(recordId: number, tenantId: string, token?: string): Promise<ActivationRetryResponse> {
    const { data } = await api.post<ActivationRetryResponse>(`/api/payment-gateway/activation-queue/${recordId}/retry`, null, {
      headers: { ...tenantHeaders(tenantId), ...authHeaders(token) },
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


