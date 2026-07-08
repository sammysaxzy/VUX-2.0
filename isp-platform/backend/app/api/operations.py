from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_user_dependency as get_current_user
from ..models import BillingPayment, Client, FinancialTransaction, InventoryItem, PaymentStatus, User

router = APIRouter(tags=["Operations"])


class SiteMaintenanceEntry(BaseModel):
    id: str
    title: str
    performedAt: datetime
    engineer: str
    notes: str


class SiteManagementRecord(BaseModel):
    id: str
    name: str
    type: Literal["pop", "base_station", "cabinet", "shelter", "rack", "power_site"]
    location: dict
    serviceAreaName: str
    powerStatus: Literal["normal", "warning", "critical"]
    batteryStatus: Literal["healthy", "degraded", "offline"]
    inverterStatus: Literal["healthy", "warning", "fault"]
    uplink: str
    oltName: Optional[str] = None
    routerName: Optional[str] = None
    equipment: List[str]
    maintenanceHistory: List[SiteMaintenanceEntry]


class NocAlert(BaseModel):
    id: str
    category: Literal["customer", "optical", "latency", "packet_loss", "bandwidth", "device"]
    severity: Literal["normal", "warning", "critical"]
    title: str
    description: str
    source: str
    affectedCount: Optional[int] = None
    createdAt: datetime


class UsagePlanLine(BaseModel):
    planName: str
    averageUsageMbps: int
    subscribers: int


class UsageUserLine(BaseModel):
    customerId: str
    customerName: str
    usageGb: int
    planName: str


class UsageAnalyticsSnapshot(BaseModel):
    totalCapacityMbps: int
    peakUsageMbps: int
    averageUsageMbps: int
    peakHourWindow: str
    planUtilization: List[UsagePlanLine]
    topUsers: List[UsageUserLine]
    customerUsage: List[UsageUserLine]


class EnterpriseSlaReport(BaseModel):
    id: str
    customerName: str
    serviceWindow: str
    uptime: str
    downtimeMinutes: int
    responseMinutes: int
    resolutionMinutes: int
    breachStatus: Literal["met", "at_risk", "breached"]


class ProcurementRecord(BaseModel):
    id: str
    vendorName: str
    type: Literal["quotation", "purchase_order"]
    reference: str
    itemSummary: str
    amount: Decimal
    deliveryStatus: Literal["pending", "in_transit", "delivered"]
    paymentStatus: Literal["pending", "part_paid", "paid"]
    createdAt: datetime


class ExpenseSummaryLine(BaseModel):
    category: Literal["fuel", "contractors", "materials", "maintenance", "salaries", "site_rent", "power", "upstream"]
    amount: Decimal


class BackupStatus(BaseModel):
    lastBackupAt: datetime
    databaseStatus: Literal["healthy", "warning", "critical"]
    retentionPolicy: str
    restoreReady: bool
    securityNotes: List[str]


class IntegrationService(BaseModel):
    id: str
    name: str
    category: Literal["billing", "communication", "mapping", "ai", "network", "system"]
    status: Literal["configured", "pending", "attention"]
    envKeys: List[str]
    notes: str


class ResellerAgentRecord(BaseModel):
    id: str
    fullName: str
    role: Literal["reseller", "marketer", "agent"]
    assignedLeads: int
    convertedCustomers: int
    commissionEarned: Decimal
    payoutStatus: Literal["pending", "processing", "paid"]
    referrals: int


class SystemHealthSnapshot(BaseModel):
    serverStatus: Literal["healthy", "warning", "critical"]
    databaseStatus: Literal["healthy", "warning", "critical"]
    queueStatus: Literal["healthy", "warning", "critical"]
    apiStatus: Literal["healthy", "warning", "critical"]
    failedJobs: int
    backgroundTasks: int
    lastCheckedAt: datetime


class OnboardingChecklist(BaseModel):
    id: str
    title: str
    description: str
    completed: bool


class InstallationWorkflowRecord(BaseModel):
    id: str
    customerName: str
    stage: str
    assignedTo: Optional[str] = None
    dueDate: Optional[datetime] = None
    notes: Optional[str] = None


class SiteSurveyRecord(BaseModel):
    id: str
    leadName: str
    location: str
    buildingType: str
    distanceFromNodeMeters: int
    signalReading: Optional[str] = None
    powerReading: Optional[str] = None
    requiredMaterials: List[str]
    installationDifficulty: str
    photos: int
    recommendation: str


class FaultWorkflowTicket(BaseModel):
    id: str
    customerName: str
    category: str
    priority: str
    affectedService: str
    assignedTechnician: Optional[str] = None
    faultLocation: str
    diagnosis: Optional[str] = None
    materialsUsed: List[str]
    resolutionNote: Optional[str] = None
    customerConfirmation: str
    closureTime: Optional[datetime] = None


class OutageMaintenanceRecord(BaseModel):
    id: str
    type: str
    title: str
    affectedAreas: List[str]
    affectedCustomers: int
    startTime: datetime
    endTime: Optional[datetime] = None
    customerNotice: str
    completionReport: Optional[str] = None
    status: str


class CommunicationTemplateRecord(BaseModel):
    id: str
    channel: str
    name: str
    subject: Optional[str] = None
    message: str
    active: bool


class KnowledgeBaseArticle(BaseModel):
    id: str
    category: str
    title: str
    summary: str
    audience: str


class ApprovalWorkflowRecord(BaseModel):
    id: str
    type: str
    requester: str
    target: str
    amount: Optional[Decimal] = None
    status: str
    requestedAt: datetime


class DiscountPromoRecord(BaseModel):
    id: str
    code: str
    type: str
    amount: Decimal
    expiryDate: datetime
    eligiblePlans: List[str]
    approvalStatus: str
    usageCount: int


class CommissionRecord(BaseModel):
    id: str
    partnerName: str
    leadSource: str
    convertedCustomer: str
    planValue: Decimal
    commissionAmount: Decimal
    approvalStatus: str
    payoutStatus: str


class ChurnRetentionRecord(BaseModel):
    id: str
    customerName: str
    riskLevel: str
    cancellationRequested: bool
    reasonForLeaving: Optional[str] = None
    retentionAction: Optional[str] = None
    winBackStatus: str


class ImportValidationSummary(BaseModel):
    module: str
    totalRows: int
    validRows: int
    invalidRows: int
    sampleErrors: List[str]


class DemoModeSettings(BaseModel):
    enabled: bool
    hideSensitiveSettings: bool
    preventDestructiveActions: bool
    sampleDatasetName: str


class SecurityControlSettings(BaseModel):
    passwordResetFlow: str
    twoFactorPlaceholder: bool
    sessionTimeoutMinutes: int
    sensitiveActionConfirmation: bool
    auditTrailEnabled: bool


@router.get("/operations/sites", response_model=List[SiteManagementRecord])
async def get_site_management(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        SiteManagementRecord(
            id="site-1",
            name="Lekki POP Alpha",
            type="pop",
            location={"lat": 6.437, "lng": 3.472},
            serviceAreaName="Lekki Phase 1",
            powerStatus="normal",
            batteryStatus="healthy",
            inverterStatus="healthy",
            uplink="10G Metro Ring A",
            oltName="OLT-Lekki-01",
            routerName="CCR-Core-01",
            equipment=["Huawei OLT", "MikroTik CCR", "48V DC plant", "Battery bank"],
            maintenanceHistory=[
                SiteMaintenanceEntry(
                    id="maint-1",
                    title="Quarterly battery inspection",
                    performedAt=datetime.utcnow() - timedelta(days=20),
                    engineer="Kunle O.",
                    notes="Battery bank healthy, inverter fan cleaned.",
                )
            ],
        ),
        SiteManagementRecord(
            id="site-2",
            name="Chevron Cabinet East",
            type="cabinet",
            location={"lat": 6.451, "lng": 3.503},
            serviceAreaName="Chevron",
            powerStatus="warning",
            batteryStatus="degraded",
            inverterStatus="warning",
            uplink="1G Distribution Feed",
            oltName="OLT-Chevron-02",
            equipment=["Outdoor cabinet", "UPS", "8-port distribution tray"],
            maintenanceHistory=[
                SiteMaintenanceEntry(
                    id="maint-2",
                    title="Power-site alert response",
                    performedAt=datetime.utcnow() - timedelta(hours=12),
                    engineer="Sade A.",
                    notes="Battery runtime reduced below threshold, replacement recommended.",
                )
            ],
        ),
    ]


@router.get("/operations/noc-alerts", response_model=List[NocAlert])
async def get_noc_alerts(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    active_clients_result = await db.execute(select(func.count(Client.id)))
    active_clients = active_clients_result.scalar() or 0
    return [
        NocAlert(
            id="noc-1",
            category="optical",
            severity="critical",
            title="Weak optical power on distribution segment",
            description="RX levels dropped below threshold across customers downstream of Closure CL-17.",
            source="OLT-Lekki-01 / PON 3",
            affectedCount=min(14, active_clients),
            createdAt=datetime.utcnow() - timedelta(minutes=35),
        ),
        NocAlert(
            id="noc-2",
            category="latency",
            severity="warning",
            title="High latency on upstream path",
            description="Business customers experienced elevated latency during peak utilization window.",
            source="Metro Uplink A",
            affectedCount=min(8, active_clients),
            createdAt=datetime.utcnow() - timedelta(minutes=80),
        ),
        NocAlert(
            id="noc-3",
            category="device",
            severity="normal",
            title="Routine overnight offline customers",
            description="Offline set remains within normal overnight threshold.",
            source="Customer CPE monitoring",
            affectedCount=min(5, active_clients),
            createdAt=datetime.utcnow() - timedelta(minutes=120),
        ),
    ]


@router.get("/operations/usage", response_model=UsageAnalyticsSnapshot)
async def get_usage_analytics(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    clients_result = await db.execute(select(Client).order_by(Client.created_at.desc()).limit(3))
    clients = clients_result.scalars().all()
    customer_usage = [
        UsageUserLine(
            customerId=str(client.id),
            customerName=client.name,
            usageGb=usage,
            planName=client.assigned_plan or "Business Plan",
        )
        for client, usage in zip(clients, [387, 192, 144], strict=False)
    ]
    if not customer_usage:
      customer_usage = [
          UsageUserLine(customerId="1", customerName="Demo Customer", usageGb=120, planName="Business 50 Mbps"),
      ]
    return UsageAnalyticsSnapshot(
        totalCapacityMbps=2500,
        peakUsageMbps=1830,
        averageUsageMbps=1285,
        peakHourWindow="19:00 - 22:00",
        planUtilization=[
            UsagePlanLine(planName="20 Mbps Home", averageUsageMbps=310, subscribers=142),
            UsagePlanLine(planName="Business 50 Mbps", averageUsageMbps=420, subscribers=36),
            UsagePlanLine(planName="Dedicated 100 Mbps", averageUsageMbps=610, subscribers=8),
        ],
        topUsers=customer_usage,
        customerUsage=customer_usage,
    )


@router.get("/operations/sla-reports", response_model=List[EnterpriseSlaReport])
async def get_sla_reports(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    clients_result = await db.execute(select(Client).limit(2))
    clients = clients_result.scalars().all()
    names = [client.name for client in clients] or ["Greenwood Estate HOA", "The Annex Workspace"]
    reports = [
        EnterpriseSlaReport(
            id="sla-1",
            customerName=names[0],
            serviceWindow="July 2026",
            uptime="99.41%",
            downtimeMinutes=258,
            responseMinutes=11,
            resolutionMinutes=74,
            breachStatus="breached",
        ),
        EnterpriseSlaReport(
            id="sla-2",
            customerName=names[-1],
            serviceWindow="July 2026",
            uptime="99.82%",
            downtimeMinutes=52,
            responseMinutes=18,
            resolutionMinutes=62,
            breachStatus="met",
        ),
    ]
    return reports


@router.get("/procurement/records", response_model=List[ProcurementRecord])
async def get_procurement_records(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        ProcurementRecord(
            id="proc-1",
            vendorName="Metro Fiber Depot",
            type="purchase_order",
            reference="PO-2407-19",
            itemSummary="1x8 PLC splitters, drop cable, pigtails",
            amount=Decimal("1245000"),
            deliveryStatus="in_transit",
            paymentStatus="part_paid",
            createdAt=datetime.utcnow() - timedelta(days=3),
        ),
        ProcurementRecord(
            id="proc-2",
            vendorName="Main FTTH Supplier",
            type="quotation",
            reference="QTN-2407-44",
            itemSummary="Battery bank replacement for POP Alpha",
            amount=Decimal("880000"),
            deliveryStatus="pending",
            paymentStatus="pending",
            createdAt=datetime.utcnow() - timedelta(days=1),
        ),
    ]


@router.get("/finance/expense-breakdown", response_model=List[ExpenseSummaryLine])
async def get_expense_breakdown(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    expense_total_result = await db.execute(
        select(func.coalesce(func.sum(FinancialTransaction.amount), 0)).where(FinancialTransaction.entry_type == "expense")
    )
    base_total = Decimal(expense_total_result.scalar() or 0)
    if base_total <= 0:
        base_total = Decimal("6715000")
    return [
        ExpenseSummaryLine(category="fuel", amount=base_total * Decimal("0.0275")),
        ExpenseSummaryLine(category="contractors", amount=base_total * Decimal("0.0923")),
        ExpenseSummaryLine(category="materials", amount=base_total * Decimal("0.1370")),
        ExpenseSummaryLine(category="maintenance", amount=base_total * Decimal("0.0312")),
        ExpenseSummaryLine(category="salaries", amount=base_total * Decimal("0.2606")),
        ExpenseSummaryLine(category="site_rent", amount=base_total * Decimal("0.0506")),
        ExpenseSummaryLine(category="power", amount=base_total * Decimal("0.0431")),
        ExpenseSummaryLine(category="upstream", amount=base_total * Decimal("0.3577")),
    ]


@router.get("/system/backup-status", response_model=BackupStatus)
async def get_backup_status(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return BackupStatus(
        lastBackupAt=datetime.utcnow() - timedelta(minutes=35),
        databaseStatus="healthy",
        retentionPolicy="Daily snapshots retained for 30 days, weekly archives for 6 months.",
        restoreReady=True,
        securityNotes=[
            "Backups should be encrypted at rest using provider-managed keys or KMS.",
            "Restore actions should require privileged approval and audit logging.",
        ],
    )


@router.get("/system/integrations", response_model=List[IntegrationService])
async def get_integrations(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        IntegrationService(
            id="int-1",
            name="SmartOLT",
            category="network",
            status="pending",
            envKeys=["SMARTOLT_BASE_URL", "SMARTOLT_API_KEY"],
            notes="Use backend proxy for optical telemetry and alarm sync.",
        ),
        IntegrationService(
            id="int-2",
            name="Paystack",
            category="billing",
            status="configured",
            envKeys=["PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY", "PAYSTACK_WEBHOOK_SECRET"],
            notes="Webhook verification must remain server-side.",
        ),
        IntegrationService(
            id="int-3",
            name="WhatsApp",
            category="communication",
            status="pending",
            envKeys=["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
            notes="Template approvals still required for production rollout.",
        ),
        IntegrationService(
            id="int-4",
            name="OpenAI",
            category="ai",
            status="pending",
            envKeys=["OPENAI_API_KEY"],
            notes="Route prompts through backend guardrails and audit storage.",
        ),
    ]


@router.get("/crm/agents", response_model=List[ResellerAgentRecord])
async def get_reseller_agents(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        ResellerAgentRecord(
            id="agent-1",
            fullName="Tosin A.",
            role="marketer",
            assignedLeads=11,
            convertedCustomers=4,
            commissionEarned=Decimal("145000"),
            payoutStatus="processing",
            referrals=6,
        ),
        ResellerAgentRecord(
            id="agent-2",
            fullName="PrimeNet Reseller Desk",
            role="reseller",
            assignedLeads=8,
            convertedCustomers=3,
            commissionEarned=Decimal("280000"),
            payoutStatus="pending",
            referrals=8,
        ),
    ]


@router.get("/system/health", response_model=SystemHealthSnapshot)
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_count_result = await db.execute(select(func.count(User.id)))
    payment_failures_result = await db.execute(
        select(func.count(BillingPayment.id)).where(BillingPayment.status != PaymentStatus.PAID)
    )
    users = user_count_result.scalar() or 0
    failed_jobs = payment_failures_result.scalar() or 0
    return SystemHealthSnapshot(
        serverStatus="healthy",
        databaseStatus="healthy",
        queueStatus="warning" if failed_jobs else "healthy",
        apiStatus="healthy",
        failedJobs=failed_jobs,
        backgroundTasks=max(5, users),
        lastCheckedAt=datetime.utcnow(),
    )


@router.get("/system/onboarding", response_model=List[OnboardingChecklist])
async def get_onboarding_checklist(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    clients_result = await db.execute(select(func.count(Client.id)))
    items_result = await db.execute(select(func.count(InventoryItem.id)))
    clients_count = clients_result.scalar() or 0
    items_count = items_result.scalar() or 0
    return [
        OnboardingChecklist(
            id="ob-1",
            title="Company setup",
            description="Branding, support contacts, billing identity, and tenant profile.",
            completed=True,
        ),
        OnboardingChecklist(
            id="ob-2",
            title="Service areas",
            description="Create estates, streets, POPs, and coverage zones.",
            completed=True,
        ),
        OnboardingChecklist(
            id="ob-3",
            title="Internet plans",
            description="Publish residential, business, and dedicated packages.",
            completed=True,
        ),
        OnboardingChecklist(
            id="ob-4",
            title="Users and roles",
            description="Create admin, NOC, finance, support, and engineer accounts.",
            completed=False,
        ),
        OnboardingChecklist(
            id="ob-5",
            title="Payment settings",
            description="Configure gateway env vars and billing defaults.",
            completed=False,
        ),
        OnboardingChecklist(
            id="ob-6",
            title="Map settings",
            description="Select provider, API env vars, and asset import rules.",
            completed=items_count > 0,
        ),
        OnboardingChecklist(
            id="ob-7",
            title="First customer import",
            description="Import CRM data from CSV or Excel templates.",
            completed=clients_count > 0,
        ),
    ]


@router.get("/operations/installations", response_model=List[InstallationWorkflowRecord])
async def get_installation_workflow(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    clients_result = await db.execute(select(Client).limit(3))
    clients = clients_result.scalars().all()
    names = [client.name for client in clients] or ["Greenwood Estate HOA", "Amina Bello", "Favour Clinic"]
    return [
        InstallationWorkflowRecord(
            id="install-1",
            customerName=names[0],
            stage="quotation",
            assignedTo="Tosin A.",
            dueDate=datetime.utcnow() + timedelta(days=2),
            notes="Dedicated service quotation awaiting approval.",
        ),
        InstallationWorkflowRecord(
            id="install-2",
            customerName=names[1 if len(names) > 1 else 0],
            stage="installation_assigned",
            assignedTo="Kunle O.",
            dueDate=datetime.utcnow() + timedelta(days=1),
            notes="Materials issued and field team scheduled.",
        ),
        InstallationWorkflowRecord(
            id="install-3",
            customerName=names[-1],
            stage="testing",
            assignedTo="Musa J.",
            dueDate=datetime.utcnow() + timedelta(hours=12),
            notes="Awaiting final activation and handover.",
        ),
    ]


@router.get("/operations/site-surveys", response_model=List[SiteSurveyRecord])
async def get_site_surveys(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        SiteSurveyRecord(
            id="survey-1",
            leadName="Greenwood Estate HOA",
            location="Greenwood Estate Main Gate",
            buildingType="estate",
            distanceFromNodeMeters=180,
            signalReading="-18.2 dBm",
            powerReading="Stable mains + inverter",
            requiredMaterials=["1 Core Drop Cable", "ONU", "Router", "8 Port MST Closure"],
            installationDifficulty="medium",
            photos=6,
            recommendation="approved",
        ),
        SiteSurveyRecord(
            id="survey-2",
            leadName="Favour Clinic",
            location="3rd Avenue, Gwarinpa",
            buildingType="commercial",
            distanceFromNodeMeters=95,
            signalReading="-21.0 dBm",
            powerReading="UPS available",
            requiredMaterials=["ONU", "Router", "Patch Cord"],
            installationDifficulty="low",
            photos=4,
            recommendation="approved",
        ),
    ]


@router.get("/operations/fault-workflow", response_model=List[FaultWorkflowTicket])
async def get_fault_workflow(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        FaultWorkflowTicket(
            id="ft-1",
            customerName="The Annex Workspace",
            category="degraded_signal",
            priority="high",
            affectedService="Business 50 Mbps",
            assignedTechnician="Sade A.",
            faultLocation="Admiralty Way distribution segment",
            diagnosis="High splice loss near closure CL-17.",
            materialsUsed=["Pigtail", "Splice protector"],
            resolutionNote="Respliced affected core and restored RX levels.",
            customerConfirmation="confirmed",
            closureTime=datetime.utcnow() - timedelta(minutes=35),
        ),
        FaultWorkflowTicket(
            id="ft-2",
            customerName="Amina Bello",
            category="no_internet",
            priority="medium",
            affectedService="20 Mbps Home",
            assignedTechnician="Kunle O.",
            faultLocation="Drop cable from MST-04",
            diagnosis="Outdoor connector damaged by weather exposure.",
            materialsUsed=["Fast connector"],
            customerConfirmation="pending",
        ),
    ]


@router.get("/operations/outages", response_model=List[OutageMaintenanceRecord])
async def get_outages(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        OutageMaintenanceRecord(
            id="out-1",
            type="planned_maintenance",
            title="Lekki POP battery maintenance",
            affectedAreas=["Lekki Phase 1", "Admiralty Way"],
            affectedCustomers=48,
            startTime=datetime.utcnow() + timedelta(hours=18),
            endTime=datetime.utcnow() + timedelta(hours=20),
            customerNotice="Brief maintenance window to improve site power resilience.",
            status="scheduled",
        ),
        OutageMaintenanceRecord(
            id="out-2",
            type="unplanned_outage",
            title="Distribution fibre cut near Chevron axis",
            affectedAreas=["Chevron"],
            affectedCustomers=21,
            startTime=datetime.utcnow() - timedelta(hours=4),
            customerNotice="Emergency outage response underway.",
            completionReport="Temporary reroute restored services pending permanent civil fix.",
            status="completed",
        ),
    ]


@router.get("/operations/communication-templates", response_model=List[CommunicationTemplateRecord])
async def get_communication_templates(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        CommunicationTemplateRecord(
            id="tpl-1",
            channel="whatsapp",
            name="payment_reminder",
            message="Hello {{name}}, your invoice of {{amount}} is due on {{due_date}}.",
            active=True,
        ),
        CommunicationTemplateRecord(
            id="tpl-2",
            channel="email",
            name="welcome_message",
            subject="Welcome to {{isp_name}}",
            message="Your service is now active. Plan: {{plan}}, username: {{username}}.",
            active=True,
        ),
        CommunicationTemplateRecord(
            id="tpl-3",
            channel="sms",
            name="outage_notice",
            message="We are working on a service issue in your area. Updates will follow shortly.",
            active=True,
        ),
    ]


@router.get("/operations/knowledge-base", response_model=List[KnowledgeBaseArticle])
async def get_knowledge_base(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        KnowledgeBaseArticle(
            id="kb-1",
            category="troubleshooting",
            title="Weak optical power triage checklist",
            summary="Validate ONU levels, inspect closure splices, check bends, and compare recent degradation pattern before dispatch.",
            audience="noc",
        ),
        KnowledgeBaseArticle(
            id="kb-2",
            category="installation",
            title="Standard FTTH installation handover procedure",
            summary="Verify light levels, document router and ONU assets, confirm Wi-Fi, and collect signed completion acknowledgment.",
            audience="engineer",
        ),
        KnowledgeBaseArticle(
            id="kb-3",
            category="responses",
            title="Customer outage response script",
            summary="Acknowledge complaints professionally, explain outage context, and set expectation on the next update window.",
            audience="support",
        ),
    ]


@router.get("/operations/approvals", response_model=List[ApprovalWorkflowRecord])
async def get_approval_requests(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        ApprovalWorkflowRecord(
            id="apr-1",
            type="discount",
            requester="Finance Desk",
            target="Greenwood Estate HOA onboarding discount",
            amount=Decimal("150000"),
            status="pending",
            requestedAt=datetime.utcnow() - timedelta(hours=3),
        ),
        ApprovalWorkflowRecord(
            id="apr-2",
            type="large_expense",
            requester="Operations Manager",
            target="POP Alpha battery replacement",
            amount=Decimal("880000"),
            status="approved",
            requestedAt=datetime.utcnow() - timedelta(hours=12),
        ),
    ]


@router.get("/operations/promos", response_model=List[DiscountPromoRecord])
async def get_discount_promos(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        DiscountPromoRecord(
            id="promo-1",
            code="ESTATE100",
            type="fixed",
            amount=Decimal("100000"),
            expiryDate=datetime.utcnow() + timedelta(days=21),
            eligiblePlans=["Dedicated 100 Mbps", "Business 50 Mbps"],
            approvalStatus="approved",
            usageCount=3,
        ),
        DiscountPromoRecord(
            id="promo-2",
            code="WELCOME10",
            type="percentage",
            amount=Decimal("10"),
            expiryDate=datetime.utcnow() + timedelta(days=14),
            eligiblePlans=["20 Mbps Home", "25 Mbps Home"],
            approvalStatus="pending",
            usageCount=0,
        ),
    ]


@router.get("/operations/commissions", response_model=List[CommissionRecord])
async def get_commissions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        CommissionRecord(
            id="com-1",
            partnerName="Tosin A.",
            leadSource="Referral",
            convertedCustomer="Favour Clinic",
            planValue=Decimal("125000"),
            commissionAmount=Decimal("25000"),
            approvalStatus="approved",
            payoutStatus="processing",
        ),
        CommissionRecord(
            id="com-2",
            partnerName="PrimeNet Reseller Desk",
            leadSource="Estate campaign",
            convertedCustomer="Greenwood Estate HOA",
            planValue=Decimal("850000"),
            commissionAmount=Decimal("95000"),
            approvalStatus="pending",
            payoutStatus="pending",
        ),
    ]


@router.get("/operations/churn-retention", response_model=List[ChurnRetentionRecord])
async def get_churn_retention(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        ChurnRetentionRecord(
            id="ch-1",
            customerName="Amina Bello",
            riskLevel="high",
            cancellationRequested=False,
            reasonForLeaving="Repeated service instability",
            retentionAction="Offer temporary service credit and fast-track field intervention.",
            winBackStatus="in_progress",
        ),
        ChurnRetentionRecord(
            id="ch-2",
            customerName="Legacy Prints",
            riskLevel="medium",
            cancellationRequested=True,
            reasonForLeaving="Budget pressure",
            retentionAction="Proposed downgrade with promo support.",
            winBackStatus="in_progress",
        ),
    ]


@router.get("/operations/import-validation", response_model=List[ImportValidationSummary])
async def get_import_validation(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        ImportValidationSummary(
            module="customers",
            totalRows=120,
            validRows=114,
            invalidRows=6,
            sampleErrors=["Duplicate PPPoE username on row 17", "Missing phone number on row 43"],
        ),
        ImportValidationSummary(
            module="inventory",
            totalRows=42,
            validRows=39,
            invalidRows=3,
            sampleErrors=["Negative stock value on row 9", "Unknown supplier code on row 16"],
        ),
    ]


@router.get("/operations/demo-mode", response_model=DemoModeSettings)
async def get_demo_mode(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return DemoModeSettings(
        enabled=True,
        hideSensitiveSettings=True,
        preventDestructiveActions=True,
        sampleDatasetName="WestLink Commercial Demo Pack",
    )


@router.get("/operations/security-controls", response_model=SecurityControlSettings)
async def get_security_controls(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return SecurityControlSettings(
        passwordResetFlow="email_link",
        twoFactorPlaceholder=True,
        sessionTimeoutMinutes=30,
        sensitiveActionConfirmation=True,
        auditTrailEnabled=True,
    )
