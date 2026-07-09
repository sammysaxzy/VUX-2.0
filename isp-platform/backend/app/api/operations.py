from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, List, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_tenant_id, get_current_user_dependency as get_current_user
from ..models import (
    ActivityLog,
    BillingPayment,
    Client,
    FinancialTransaction,
    InventoryItem,
    OperationRecord,
    OperationSetting,
    PaymentStatus,
    User,
)

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
    customerId: Optional[str] = None
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


class NetworkTopologyNode(BaseModel):
    id: str
    label: str
    layer: str
    status: str
    linkedTo: list[str] = []
    metric: Optional[str] = None


class NetworkTopologySnapshot(BaseModel):
    faultDomain: Optional[str] = None
    impactedCustomers: int
    path: list[NetworkTopologyNode]


class CapacityResource(BaseModel):
    id: str
    name: str
    type: str
    utilizationPercent: int
    thresholdPercent: int
    availableUnits: int
    forecastDaysToExhaustion: int
    recommendation: str


class GisDistanceEstimate(BaseModel):
    customerName: str
    closureName: str
    mstName: str
    distanceClosureToMstMeters: int
    distanceMstToCustomerMeters: int
    estimatedCableMeters: int
    estimatedInstallationCost: Decimal
    nearestAvailableMst: str


class FiberCoreManagementSnapshot(BaseModel):
    cableName: str
    coreCount: int
    usedCores: int
    spareCores: int
    reservedCores: int
    damagedCores: int
    spliceHistoryCount: int


class IpamSubnetRecord(BaseModel):
    id: str
    segment: str
    type: str
    vlanId: Optional[int] = None
    subnet: str
    allocated: int
    available: int
    status: str


class EquipmentLifecycleRecord(BaseModel):
    id: str
    assetName: str
    assetType: str
    purchaseDate: datetime
    installationDate: Optional[datetime] = None
    warrantyEndDate: Optional[datetime] = None
    depreciationStatus: str
    maintenanceHistory: list[str]
    replacementSchedule: str


class CustomerTimelineEvent(BaseModel):
    id: str
    type: str
    title: str
    description: str
    createdAt: datetime
    actor: Optional[str] = None
    status: Optional[str] = None


class BusinessIntelligenceSnapshot(BaseModel):
    mrr: Decimal
    arr: Decimal
    churnRate: Decimal
    customerGrowthPercent: Decimal
    arpu: Decimal
    ltv: Decimal
    ticketTrendPercent: Decimal
    technicianPerformancePercent: Decimal
    revenueByArea: list[dict[str, Any]]


class DisasterRecoverySnapshot(BaseModel):
    backupHealth: str
    failoverReadiness: str
    restoreTestedAt: Optional[datetime] = None
    recoveryStatus: str
    notes: list[str]


class DeveloperPortalSnapshot(BaseModel):
    apiBaseUrl: str
    authentication: list[str]
    docsStatus: str
    exampleCollections: list[str]


class PluginCatalogEntry(BaseModel):
    id: str
    name: str
    category: str
    status: str
    description: str


class LocalizationSettings(BaseModel):
    currencies: list[str]
    timezones: list[str]
    languages: list[str]
    taxMode: str
    regionalFormats: list[str]


class LicenseSubscriptionSnapshot(BaseModel):
    tenantName: str
    licenseTier: str
    billingCycle: str
    activeSeats: int
    seatLimit: int
    storageUsedGb: int
    storageLimitGb: int
    enabledModules: list[str]


class LaunchReadinessChecklist(BaseModel):
    score: int
    completed: list[str]
    remaining: list[str]
    securityRisks: list[str]
    performanceNotes: list[str]


MODULE_INSTALLATIONS = "installations"
MODULE_SITE_SURVEYS = "site_surveys"
MODULE_FAULT_WORKFLOW = "fault_workflow"
MODULE_OUTAGES = "outages"
MODULE_COMMUNICATION_TEMPLATES = "communication_templates"
MODULE_KNOWLEDGE_BASE = "knowledge_base"
MODULE_APPROVALS = "approvals"
MODULE_PROMOS = "promos"
MODULE_COMMISSIONS = "commissions"
MODULE_CHURN_RETENTION = "churn_retention"
MODULE_IMPORT_VALIDATION = "import_validation"
SETTING_DEMO_MODE = "demo_mode"
SETTING_SECURITY_CONTROLS = "security_controls"


def _record_key(module: str, record_id: str) -> str:
    return f"{module}:{record_id}"


def _tenant_module_key(tenant_id: str, module: str) -> str:
    return f"{tenant_id}:{module}"


def _tenant_setting_key(tenant_id: str, setting_key: str) -> str:
    return f"{tenant_id}:{setting_key}"


def _activity_payload(payload: BaseModel | dict[str, Any]) -> dict[str, Any]:
    if isinstance(payload, BaseModel):
        return payload.model_dump(mode="json")
    return payload


async def _log_activity(
    db: AsyncSession,
    *,
    user_id: int,
    action_type: str,
    description: str,
    after_state: Optional[dict[str, Any]] = None,
):
    db.add(
        ActivityLog(
            user_id=user_id,
            action_type=action_type,
            action_description=description,
            after_state=after_state,
        )
    )


async def _seed_module_records(
    db: AsyncSession,
    *,
    tenant_id: str,
    module: str,
    model_cls,
    defaults: list[BaseModel],
):
    scoped_module = _tenant_module_key(tenant_id, module)
    existing = await db.execute(select(func.count(OperationRecord.id)).where(OperationRecord.module == scoped_module))
    if (existing.scalar() or 0) > 0:
        return
    for default in defaults:
        payload = default.model_dump(mode="json")
        record_id = str(payload["id"])
        db.add(
            OperationRecord(
                module=scoped_module,
                record_key=_record_key(scoped_module, record_id),
                title=payload.get("title") or payload.get("name") or payload.get("customerName"),
                status=payload.get("status") or payload.get("approvalStatus") or payload.get("active"),
                payload={"tenantId": tenant_id, **payload},
            )
        )
    await db.flush()


async def _list_module_records(
    db: AsyncSession,
    *,
    tenant_id: str,
    module: str,
    model_cls,
    defaults: list[BaseModel],
):
    scoped_module = _tenant_module_key(tenant_id, module)
    await _seed_module_records(db, tenant_id=tenant_id, module=module, model_cls=model_cls, defaults=defaults)
    result = await db.execute(select(OperationRecord).where(OperationRecord.module == scoped_module).order_by(OperationRecord.created_at.desc()))
    rows = result.scalars().all()
    return [model_cls.model_validate({key: value for key, value in row.payload.items() if key != "tenantId"}) for row in rows]


async def _create_module_record(
    db: AsyncSession,
    *,
    tenant_id: str,
    module: str,
    payload: BaseModel,
    current_user_id: int,
    action_type: str,
    description: str,
):
    data = payload.model_dump(mode="json")
    record_id = str(data["id"])
    scoped_module = _tenant_module_key(tenant_id, module)
    existing = await db.execute(select(OperationRecord).where(OperationRecord.record_key == _record_key(scoped_module, record_id)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Record ID already exists")
    record = OperationRecord(
        module=scoped_module,
        record_key=_record_key(scoped_module, record_id),
        title=data.get("title") or data.get("name") or data.get("customerName"),
        status=str(data.get("status") or data.get("approvalStatus") or data.get("active") or ""),
        payload={"tenantId": tenant_id, **data},
        created_by_user_id=current_user_id,
        updated_by_user_id=current_user_id,
    )
    db.add(record)
    await db.flush()
    await _log_activity(
        db,
        user_id=current_user_id,
        action_type=action_type,
        description=description,
        after_state=data,
    )
    return payload


async def _update_module_record(
    db: AsyncSession,
    *,
    tenant_id: str,
    module: str,
    record_id: str,
    payload: BaseModel,
    current_user_id: int,
    action_type: str,
    description: str,
):
    scoped_module = _tenant_module_key(tenant_id, module)
    result = await db.execute(select(OperationRecord).where(OperationRecord.record_key == _record_key(scoped_module, record_id)))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    data = payload.model_dump(mode="json")
    data["id"] = record_id
    record.title = data.get("title") or data.get("name") or data.get("customerName")
    record.status = str(data.get("status") or data.get("approvalStatus") or data.get("active") or "")
    record.payload = {"tenantId": tenant_id, **data}
    record.updated_by_user_id = current_user_id
    record.updated_at = datetime.utcnow()
    await db.flush()
    await _log_activity(
        db,
        user_id=current_user_id,
        action_type=action_type,
        description=description,
        after_state=data,
    )
    return payload.__class__.model_validate(data)


async def _get_or_seed_setting(
    db: AsyncSession,
    *,
    tenant_id: str,
    setting_key: str,
    model_cls,
    default_payload: BaseModel,
):
    scoped_key = _tenant_setting_key(tenant_id, setting_key)
    result = await db.execute(select(OperationSetting).where(OperationSetting.setting_key == scoped_key))
    setting = result.scalar_one_or_none()
    if not setting:
        setting = OperationSetting(setting_key=scoped_key, payload={"tenantId": tenant_id, **default_payload.model_dump(mode="json")})
        db.add(setting)
        await db.flush()
    return model_cls.model_validate({key: value for key, value in setting.payload.items() if key != "tenantId"})


async def _update_setting(
    db: AsyncSession,
    *,
    tenant_id: str,
    setting_key: str,
    payload: BaseModel,
    current_user_id: int,
    action_type: str,
    description: str,
):
    scoped_key = _tenant_setting_key(tenant_id, setting_key)
    result = await db.execute(select(OperationSetting).where(OperationSetting.setting_key == scoped_key))
    setting = result.scalar_one_or_none()
    if not setting:
        setting = OperationSetting(setting_key=scoped_key, payload={})
        db.add(setting)
        await db.flush()
    data = payload.model_dump(mode="json")
    setting.payload = {"tenantId": tenant_id, **data}
    setting.updated_by_user_id = current_user_id
    setting.updated_at = datetime.utcnow()
    await db.flush()
    await _log_activity(db, user_id=current_user_id, action_type=action_type, description=description, after_state=data)
    return payload


def _default_installations() -> list[InstallationWorkflowRecord]:
    return [
        InstallationWorkflowRecord(
            id="install-1",
            customerName="Greenwood Estate HOA",
            stage="quotation",
            assignedTo="Tosin A.",
            dueDate=datetime.utcnow() + timedelta(days=2),
            notes="Dedicated service quotation awaiting approval.",
        ),
        InstallationWorkflowRecord(
            id="install-2",
            customerName="Amina Bello",
            stage="installation_assigned",
            assignedTo="Kunle O.",
            dueDate=datetime.utcnow() + timedelta(days=1),
            notes="Materials issued and field team scheduled.",
        ),
        InstallationWorkflowRecord(
            id="install-3",
            customerName="Favour Clinic",
            stage="testing",
            assignedTo="Musa J.",
            dueDate=datetime.utcnow() + timedelta(hours=12),
            notes="Awaiting final activation and handover.",
        ),
    ]


def _default_site_surveys() -> list[SiteSurveyRecord]:
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


def _default_fault_workflow() -> list[FaultWorkflowTicket]:
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


def _default_outages() -> list[OutageMaintenanceRecord]:
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


def _default_communication_templates() -> list[CommunicationTemplateRecord]:
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


def _default_knowledge_base() -> list[KnowledgeBaseArticle]:
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


def _default_approvals() -> list[ApprovalWorkflowRecord]:
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


def _default_promos() -> list[DiscountPromoRecord]:
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


def _default_commissions() -> list[CommissionRecord]:
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


def _default_churn_retention() -> list[ChurnRetentionRecord]:
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


def _default_import_validation() -> list[ImportValidationSummary]:
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


def _default_demo_mode() -> DemoModeSettings:
    return DemoModeSettings(
        enabled=True,
        hideSensitiveSettings=True,
        preventDestructiveActions=True,
        sampleDatasetName="WestLink Commercial Demo Pack",
    )


def _default_security_controls() -> SecurityControlSettings:
    return SecurityControlSettings(
        passwordResetFlow="email_link",
        twoFactorPlaceholder=True,
        sessionTimeoutMinutes=30,
        sensitiveActionConfirmation=True,
        auditTrailEnabled=True,
    )


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
    _ = current_user
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
    _ = current_user
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
        customer_usage = [UsageUserLine(customerId="1", customerName="Demo Customer", usageGb=120, planName="Business 50 Mbps")]
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
    _ = current_user
    clients_result = await db.execute(select(Client).limit(2))
    clients = clients_result.scalars().all()
    names = [client.name for client in clients] or ["Greenwood Estate HOA", "The Annex Workspace"]
    return [
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
    _ = current_user
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
    _ = current_user
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
    _ = current_user
    clients_result = await db.execute(select(func.count(Client.id)))
    items_result = await db.execute(select(func.count(InventoryItem.id)))
    clients_count = clients_result.scalar() or 0
    items_count = items_result.scalar() or 0
    return [
        OnboardingChecklist(id="ob-1", title="Company setup", description="Branding, support contacts, billing identity, and tenant profile.", completed=True),
        OnboardingChecklist(id="ob-2", title="Service areas", description="Create estates, streets, POPs, and coverage zones.", completed=True),
        OnboardingChecklist(id="ob-3", title="Internet plans", description="Publish residential, business, and dedicated packages.", completed=True),
        OnboardingChecklist(id="ob-4", title="Users and roles", description="Create admin, NOC, finance, support, and engineer accounts.", completed=False),
        OnboardingChecklist(id="ob-5", title="Payment settings", description="Configure gateway env vars and billing defaults.", completed=False),
        OnboardingChecklist(id="ob-6", title="Map settings", description="Select provider, API env vars, and asset import rules.", completed=items_count > 0),
        OnboardingChecklist(id="ob-7", title="First customer import", description="Import CRM data from CSV or Excel templates.", completed=clients_count > 0),
    ]


@router.get("/operations/installations", response_model=List[InstallationWorkflowRecord])
async def get_installation_workflow(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_INSTALLATIONS,
        model_cls=InstallationWorkflowRecord,
        defaults=_default_installations(),
    )


@router.get("/operations/site-surveys", response_model=List[SiteSurveyRecord])
async def get_site_surveys(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_SITE_SURVEYS,
        model_cls=SiteSurveyRecord,
        defaults=_default_site_surveys(),
    )


@router.get("/operations/fault-workflow", response_model=List[FaultWorkflowTicket])
async def get_fault_workflow(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_FAULT_WORKFLOW,
        model_cls=FaultWorkflowTicket,
        defaults=_default_fault_workflow(),
    )


@router.get("/operations/outages", response_model=List[OutageMaintenanceRecord])
async def get_outages(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_OUTAGES,
        model_cls=OutageMaintenanceRecord,
        defaults=_default_outages(),
    )


@router.post("/operations/outages", response_model=OutageMaintenanceRecord, status_code=status.HTTP_201_CREATED)
async def create_outage(
    payload: OutageMaintenanceRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    if not payload.id:
        payload.id = f"out-{uuid4().hex[:8]}"
    return await _create_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_OUTAGES,
        payload=payload,
        current_user_id=current_user.id,
        action_type="outage_created",
        description=f"Created outage or maintenance record '{payload.title}'.",
    )


@router.patch("/operations/outages/{record_id}", response_model=OutageMaintenanceRecord)
async def update_outage(
    record_id: str,
    payload: OutageMaintenanceRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await _update_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_OUTAGES,
        record_id=record_id,
        payload=payload,
        current_user_id=current_user.id,
        action_type="outage_updated",
        description=f"Updated outage or maintenance record '{payload.title}'.",
    )


@router.get("/operations/communication-templates", response_model=List[CommunicationTemplateRecord])
async def get_communication_templates(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_COMMUNICATION_TEMPLATES,
        model_cls=CommunicationTemplateRecord,
        defaults=_default_communication_templates(),
    )


@router.post("/operations/communication-templates", response_model=CommunicationTemplateRecord, status_code=status.HTTP_201_CREATED)
async def create_communication_template(
    payload: CommunicationTemplateRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    if not payload.id:
        payload.id = f"tpl-{uuid4().hex[:8]}"
    return await _create_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_COMMUNICATION_TEMPLATES,
        payload=payload,
        current_user_id=current_user.id,
        action_type="communication_template_created",
        description=f"Created communication template '{payload.name}'.",
    )


@router.patch("/operations/communication-templates/{record_id}", response_model=CommunicationTemplateRecord)
async def update_communication_template(
    record_id: str,
    payload: CommunicationTemplateRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await _update_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_COMMUNICATION_TEMPLATES,
        record_id=record_id,
        payload=payload,
        current_user_id=current_user.id,
        action_type="communication_template_updated",
        description=f"Updated communication template '{payload.name}'.",
    )


@router.get("/operations/knowledge-base", response_model=List[KnowledgeBaseArticle])
async def get_knowledge_base(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_KNOWLEDGE_BASE,
        model_cls=KnowledgeBaseArticle,
        defaults=_default_knowledge_base(),
    )


@router.post("/operations/knowledge-base", response_model=KnowledgeBaseArticle, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base_article(
    payload: KnowledgeBaseArticle,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    if not payload.id:
        payload.id = f"kb-{uuid4().hex[:8]}"
    return await _create_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_KNOWLEDGE_BASE,
        payload=payload,
        current_user_id=current_user.id,
        action_type="knowledge_base_article_created",
        description=f"Created knowledge base article '{payload.title}'.",
    )


@router.patch("/operations/knowledge-base/{record_id}", response_model=KnowledgeBaseArticle)
async def update_knowledge_base_article(
    record_id: str,
    payload: KnowledgeBaseArticle,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await _update_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_KNOWLEDGE_BASE,
        record_id=record_id,
        payload=payload,
        current_user_id=current_user.id,
        action_type="knowledge_base_article_updated",
        description=f"Updated knowledge base article '{payload.title}'.",
    )


@router.get("/operations/approvals", response_model=List[ApprovalWorkflowRecord])
async def get_approval_requests(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_APPROVALS,
        model_cls=ApprovalWorkflowRecord,
        defaults=_default_approvals(),
    )


@router.post("/operations/approvals", response_model=ApprovalWorkflowRecord, status_code=status.HTTP_201_CREATED)
async def create_approval_request(
    payload: ApprovalWorkflowRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    if not payload.id:
        payload.id = f"apr-{uuid4().hex[:8]}"
    return await _create_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_APPROVALS,
        payload=payload,
        current_user_id=current_user.id,
        action_type="approval_request_created",
        description=f"Created approval request for '{payload.target}'.",
    )


@router.patch("/operations/approvals/{record_id}", response_model=ApprovalWorkflowRecord)
async def update_approval_request(
    record_id: str,
    payload: ApprovalWorkflowRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await _update_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_APPROVALS,
        record_id=record_id,
        payload=payload,
        current_user_id=current_user.id,
        action_type="approval_request_updated",
        description=f"Updated approval request for '{payload.target}'.",
    )


@router.get("/operations/promos", response_model=List[DiscountPromoRecord])
async def get_discount_promos(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_PROMOS,
        model_cls=DiscountPromoRecord,
        defaults=_default_promos(),
    )


@router.post("/operations/promos", response_model=DiscountPromoRecord, status_code=status.HTTP_201_CREATED)
async def create_discount_promo(
    payload: DiscountPromoRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    if not payload.id:
        payload.id = f"promo-{uuid4().hex[:8]}"
    return await _create_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_PROMOS,
        payload=payload,
        current_user_id=current_user.id,
        action_type="promo_created",
        description=f"Created promo '{payload.code}'.",
    )


@router.patch("/operations/promos/{record_id}", response_model=DiscountPromoRecord)
async def update_discount_promo(
    record_id: str,
    payload: DiscountPromoRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await _update_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_PROMOS,
        record_id=record_id,
        payload=payload,
        current_user_id=current_user.id,
        action_type="promo_updated",
        description=f"Updated promo '{payload.code}'.",
    )


@router.get("/operations/commissions", response_model=List[CommissionRecord])
async def get_commissions(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_COMMISSIONS,
        model_cls=CommissionRecord,
        defaults=_default_commissions(),
    )


@router.post("/operations/commissions", response_model=CommissionRecord, status_code=status.HTTP_201_CREATED)
async def create_commission_record(
    payload: CommissionRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    if not payload.id:
        payload.id = f"com-{uuid4().hex[:8]}"
    return await _create_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_COMMISSIONS,
        payload=payload,
        current_user_id=current_user.id,
        action_type="commission_created",
        description=f"Created commission record for '{payload.partnerName}'.",
    )


@router.patch("/operations/commissions/{record_id}", response_model=CommissionRecord)
async def update_commission_record(
    record_id: str,
    payload: CommissionRecord,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await _update_module_record(
        db,
        tenant_id=tenant_id,
        module=MODULE_COMMISSIONS,
        record_id=record_id,
        payload=payload,
        current_user_id=current_user.id,
        action_type="commission_updated",
        description=f"Updated commission record for '{payload.partnerName}'.",
    )


@router.get("/operations/churn-retention", response_model=List[ChurnRetentionRecord])
async def get_churn_retention(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_CHURN_RETENTION,
        model_cls=ChurnRetentionRecord,
        defaults=_default_churn_retention(),
    )


@router.get("/operations/import-validation", response_model=List[ImportValidationSummary])
async def get_import_validation(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _list_module_records(
        db,
        tenant_id=tenant_id,
        module=MODULE_IMPORT_VALIDATION,
        model_cls=ImportValidationSummary,
        defaults=_default_import_validation(),
    )


@router.get("/operations/demo-mode", response_model=DemoModeSettings)
async def get_demo_mode(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _get_or_seed_setting(
        db,
        tenant_id=tenant_id,
        setting_key=SETTING_DEMO_MODE,
        model_cls=DemoModeSettings,
        default_payload=_default_demo_mode(),
    )


@router.put("/operations/demo-mode", response_model=DemoModeSettings)
async def update_demo_mode(
    payload: DemoModeSettings,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await _update_setting(
        db,
        tenant_id=tenant_id,
        setting_key=SETTING_DEMO_MODE,
        payload=payload,
        current_user_id=current_user.id,
        action_type="demo_mode_updated",
        description="Updated demo mode controls.",
    )


@router.get("/operations/security-controls", response_model=SecurityControlSettings)
async def get_security_controls(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    _ = current_user
    return await _get_or_seed_setting(
        db,
        tenant_id=tenant_id,
        setting_key=SETTING_SECURITY_CONTROLS,
        model_cls=SecurityControlSettings,
        default_payload=_default_security_controls(),
    )


@router.put("/operations/security-controls", response_model=SecurityControlSettings)
async def update_security_controls(
    payload: SecurityControlSettings,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
):
    return await _update_setting(
        db,
        tenant_id=tenant_id,
        setting_key=SETTING_SECURITY_CONTROLS,
        payload=payload,
        current_user_id=current_user.id,
        action_type="security_controls_updated",
        description="Updated security control settings.",
    )


@router.get("/operations/topology", response_model=NetworkTopologySnapshot)
async def get_network_topology(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return NetworkTopologySnapshot(
        faultDomain="Distribution Router DR-Lekki-02 to OLT-Lekki-01",
        impactedCustomers=21,
        path=[
            NetworkTopologyNode(id="top-1", label="Main Upstream Provider", layer="provider", status="healthy", linkedTo=["top-2"], metric="10 Gbps"),
            NetworkTopologyNode(id="top-2", label="CCR-Core-01", layer="core_router", status="healthy", linkedTo=["top-3"], metric="4.3 Gbps"),
            NetworkTopologyNode(id="top-3", label="DR-Lekki-02", layer="distribution_router", status="warning", linkedTo=["top-4"], metric="82% utilized"),
            NetworkTopologyNode(id="top-4", label="OLT-Lekki-01", layer="olt", status="warning", linkedTo=["top-5"], metric="PON 3 degraded"),
            NetworkTopologyNode(id="top-5", label="1:8 Splitter A", layer="splitter", status="fault", linkedTo=["top-6"], metric="High loss"),
            NetworkTopologyNode(id="top-6", label="MST-04 Admiralty", layer="mst", status="fault", linkedTo=["top-7"], metric="21 customers"),
            NetworkTopologyNode(id="top-7", label="Customer Cluster", layer="customer", status="warning", metric="Affected"),
        ],
    )


@router.get("/operations/capacity-planning", response_model=list[CapacityResource])
async def get_capacity_planning(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        CapacityResource(id="cap-1", name="OLT-Lekki-01 / PON 3", type="pon_port", utilizationPercent=86, thresholdPercent=80, availableUnits=12, forecastDaysToExhaustion=42, recommendation="Plan split ratio reduction or new PON card."),
        CapacityResource(id="cap-2", name="MST-04 Splitter", type="splitter", utilizationPercent=88, thresholdPercent=75, availableUnits=1, forecastDaysToExhaustion=18, recommendation="Install additional 1:8 splitter in this estate."),
        CapacityResource(id="cap-3", name="Metro Uplink A", type="uplink", utilizationPercent=78, thresholdPercent=70, availableUnits=220, forecastDaysToExhaustion=65, recommendation="Prepare uplink burst upgrade before next quarter."),
        CapacityResource(id="cap-4", name="Lekki POP Alpha", type="pop", utilizationPercent=73, thresholdPercent=70, availableUnits=4, forecastDaysToExhaustion=90, recommendation="Reserve rack and power expansion capacity."),
        CapacityResource(id="cap-5", name="Retail Bandwidth Pool", type="bandwidth", utilizationPercent=81, thresholdPercent=75, availableUnits=450, forecastDaysToExhaustion=54, recommendation="Increase upstream commit and review peak-hour shaping."),
    ]


@router.get("/operations/gis-distance", response_model=list[GisDistanceEstimate])
async def get_gis_distance_estimates(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        GisDistanceEstimate(
            customerName="Amina Bello",
            closureName="Closure CL-17",
            mstName="MST-04 Admiralty",
            distanceClosureToMstMeters=310,
            distanceMstToCustomerMeters=86,
            estimatedCableMeters=430,
            estimatedInstallationCost=Decimal("185000"),
            nearestAvailableMst="MST-04 Admiralty",
        ),
        GisDistanceEstimate(
            customerName="Favour Clinic",
            closureName="Closure GW-03",
            mstName="MST-11 Gwarinpa",
            distanceClosureToMstMeters=420,
            distanceMstToCustomerMeters=95,
            estimatedCableMeters=560,
            estimatedInstallationCost=Decimal("228000"),
            nearestAvailableMst="MST-11 Gwarinpa",
        ),
    ]


@router.get("/operations/fiber-core-management", response_model=list[FiberCoreManagementSnapshot])
async def get_fiber_core_management(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = current_user
    return [
        FiberCoreManagementSnapshot(cableName="Lekki Backbone 48F", coreCount=48, usedCores=31, spareCores=11, reservedCores=4, damagedCores=2, spliceHistoryCount=18),
        FiberCoreManagementSnapshot(cableName="Chevron Distribution 24F", coreCount=24, usedCores=16, spareCores=5, reservedCores=2, damagedCores=1, spliceHistoryCount=9),
        FiberCoreManagementSnapshot(cableName="Admiralty Drop Bundle 12F", coreCount=12, usedCores=8, spareCores=3, reservedCores=1, damagedCores=0, spliceHistoryCount=4),
    ]


@router.get("/operations/ipam", response_model=list[IpamSubnetRecord])
async def get_ipam_overview(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        IpamSubnetRecord(id="ipam-1", segment="Core public pool", type="public", subnet="102.89.16.0/28", allocated=10, available=4, status="warning"),
        IpamSubnetRecord(id="ipam-2", segment="Residential PPPoE VLAN 120", type="vlan", vlanId=120, subnet="10.120.0.0/22", allocated=702, available=322, status="healthy"),
        IpamSubnetRecord(id="ipam-3", segment="Business static pool", type="private", subnet="10.50.8.0/24", allocated=181, available=73, status="healthy"),
        IpamSubnetRecord(id="ipam-4", segment="CGNAT pool A", type="cgnat", subnet="100.64.0.0/18", allocated=14320, available=2064, status="critical"),
        IpamSubnetRecord(id="ipam-5", segment="DHCP Router Pool", type="dhcp_pool", subnet="192.168.10.0/24", allocated=188, available=54, status="warning"),
    ]


@router.get("/operations/equipment-lifecycle", response_model=list[EquipmentLifecycleRecord])
async def get_equipment_lifecycle(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        EquipmentLifecycleRecord(
            id="life-1",
            assetName="OLT-Lekki-01",
            assetType="olt",
            purchaseDate=datetime.utcnow() - timedelta(days=920),
            installationDate=datetime.utcnow() - timedelta(days=870),
            warrantyEndDate=datetime.utcnow() + timedelta(days=175),
            depreciationStatus="mid_life",
            maintenanceHistory=["Fan replacement - Jan 2026", "Optics health check - Apr 2026"],
            replacementSchedule="Review for refresh in Q2 2027",
        ),
        EquipmentLifecycleRecord(
            id="life-2",
            assetName="Battery Bank POP Alpha",
            assetType="battery",
            purchaseDate=datetime.utcnow() - timedelta(days=1280),
            installationDate=datetime.utcnow() - timedelta(days=1260),
            warrantyEndDate=datetime.utcnow() - timedelta(days=220),
            depreciationStatus="end_of_life",
            maintenanceHistory=["Voltage balancing - Dec 2025", "Capacity drop alert - Jul 2026"],
            replacementSchedule="Immediate replacement recommended",
        ),
    ]


@router.get("/operations/customer-timeline/{customer_id}", response_model=list[CustomerTimelineEvent])
async def get_customer_timeline(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = current_user
    client = await db.get(Client, customer_id)
    customer_name = client.name if client else f"Customer {customer_id}"
    base_date = datetime.utcnow()
    return [
        CustomerTimelineEvent(id=f"tl-{customer_id}-1", type="registration", title=f"{customer_name} registered", description="Initial CRM record created.", createdAt=base_date - timedelta(days=120), actor="Customer Care", status="completed"),
        CustomerTimelineEvent(id=f"tl-{customer_id}-2", type="survey", title="Site survey completed", description="Nearest MST and route length confirmed.", createdAt=base_date - timedelta(days=115), actor="Field Engineer", status="approved"),
        CustomerTimelineEvent(id=f"tl-{customer_id}-3", type="installation", title="Installation completed", description="ONU and router installed with light level acceptance.", createdAt=base_date - timedelta(days=110), actor="Installation Team", status="completed"),
        CustomerTimelineEvent(id=f"tl-{customer_id}-4", type="activation", title="Service activated", description="PPPoE profile provisioned and service handed over.", createdAt=base_date - timedelta(days=109), actor="NOC", status="active"),
        CustomerTimelineEvent(id=f"tl-{customer_id}-5", type="payment", title="Subscription payment received", description="Monthly service invoice settled.", createdAt=base_date - timedelta(days=30), actor="Finance", status="paid"),
        CustomerTimelineEvent(id=f"tl-{customer_id}-6", type="ticket", title="Fault ticket resolved", description="Weak optical power issue restored after splice correction.", createdAt=base_date - timedelta(days=8), actor="Support", status="resolved"),
    ]


@router.get("/operations/business-intelligence", response_model=BusinessIntelligenceSnapshot)
async def get_business_intelligence(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return BusinessIntelligenceSnapshot(
        mrr=Decimal("18450000"),
        arr=Decimal("221400000"),
        churnRate=Decimal("2.7"),
        customerGrowthPercent=Decimal("14.8"),
        arpu=Decimal("27850"),
        ltv=Decimal("334200"),
        ticketTrendPercent=Decimal("-6.4"),
        technicianPerformancePercent=Decimal("91.0"),
        revenueByArea=[
            {"area": "Lekki Phase 1", "revenue": 6200000},
            {"area": "Chevron", "revenue": 4100000},
            {"area": "Gwarinpa Central", "revenue": 3250000},
        ],
    )


@router.get("/operations/disaster-recovery", response_model=DisasterRecoverySnapshot)
async def get_disaster_recovery(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return DisasterRecoverySnapshot(
        backupHealth="healthy",
        failoverReadiness="partial",
        restoreTestedAt=datetime.utcnow() - timedelta(days=21),
        recoveryStatus="documented",
        notes=[
            "Daily backups healthy and replicated to secondary region.",
            "Quarterly restore testing exists but application failover is still partial.",
            "Runbook for major outage response has been documented for operations leadership.",
        ],
    )


@router.get("/operations/developer-portal", response_model=DeveloperPortalSnapshot)
async def get_developer_portal(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return DeveloperPortalSnapshot(
        apiBaseUrl="https://api.vux.example/v1",
        authentication=["api_key", "oauth2", "webhooks", "rate_limiting"],
        docsStatus="draft",
        exampleCollections=["Postman collection", "Webhook signing example", "OAuth client walkthrough"],
    )


@router.get("/operations/plugins", response_model=list[PluginCatalogEntry])
async def get_plugin_catalog(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return [
        PluginCatalogEntry(id="plug-1", name="Paystack Billing Connector", category="payment", status="installed", description="Extends invoice collection and webhook handling."),
        PluginCatalogEntry(id="plug-2", name="SmartOLT Telemetry Adapter", category="network", status="beta", description="Imports optical alarms and device metrics."),
        PluginCatalogEntry(id="plug-3", name="WhatsApp Broadcast Add-on", category="communication", status="available", description="Adds message templates and campaign dispatching."),
    ]


@router.get("/operations/localization", response_model=LocalizationSettings)
async def get_localization_settings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return LocalizationSettings(
        currencies=["NGN", "USD", "KES"],
        timezones=["Africa/Lagos", "Africa/Nairobi", "UTC"],
        languages=["English", "French", "Swahili"],
        taxMode="per-tenant regional rules",
        regionalFormats=["en-NG", "en-KE", "fr-FR"],
    )


@router.get("/operations/license-subscription", response_model=LicenseSubscriptionSnapshot)
async def get_license_subscription(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    tenant_name = current_user.full_name if getattr(current_user, "full_name", None) else "WestLink Fibre"
    return LicenseSubscriptionSnapshot(
        tenantName=tenant_name,
        licenseTier="enterprise",
        billingCycle="annually",
        activeSeats=26,
        seatLimit=40,
        storageUsedGb=182,
        storageLimitGb=500,
        enabledModules=[
            "CRM",
            "Billing",
            "Inventory",
            "Field Ops",
            "Maps",
            "AI NOC",
            "Customer Portal",
        ],
    )


@router.get("/operations/launch-readiness", response_model=LaunchReadinessChecklist)
async def get_launch_readiness(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ = db
    _ = current_user
    return LaunchReadinessChecklist(
        score=86,
        completed=[
            "Commercial CRM, billing, inventory, support, and technician modules are present.",
            "Enterprise operations workflows now have backend-ready persistence structure.",
            "Multi-tenant brand and settings experience is demo-ready.",
        ],
        remaining=[
            "Move remaining mock analytics and portal workflows to live backend persistence.",
            "Add tenant-level backend isolation to all new operations records.",
            "Finalize production API gateway, rate limiting, and webhook security.",
        ],
        securityRisks=[
            "2FA is still a placeholder and should be implemented before production launch.",
            "Some integration modules are API-ready but still awaiting secret management and webhook verification.",
        ],
        performanceNotes=[
            "Introduce pagination and server-side filtering for large CRM and inventory datasets.",
            "Add caching and background aggregation for BI metrics above 100k customers.",
            "Index operation_records by tenant/module/status before production-scale rollout.",
        ],
    )
