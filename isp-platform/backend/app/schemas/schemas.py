from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal
from enum import Enum


# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ISP_ADMIN = "isp_admin"
    FIELD_ENGINEER = "field_engineer"
    NOC_VIEWER = "noc_viewer"


class ClientStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    DISCONNECTED = "disconnected"


class FibreCoreStatus(str, Enum):
    FREE = "free"
    USED = "used"
    FAULTY = "faulty"
    RESERVED = "reserved"


class SplitterType(str, Enum):
    SPLITTER_1_2 = "1/2"
    SPLITTER_1_4 = "1/4"
    SPLITTER_1_8 = "1/8"
    SPLITTER_1_16 = "1/16"
    SPLITTER_1_32 = "1/32"
    SPLITTER_1_64 = "1/64"


class NetworkNodeType(str, Enum):
    OLT = "olt"
    CLOSURE = "closure"
    MST = "mst"
    CLIENT = "client"


class CableType(str, Enum):
    FEEDER = "feeder"
    DISTRIBUTION = "distribution"
    DROP = "drop"


class LinkHealthStatus(str, Enum):
    HEALTHY = "healthy"
    HIGH_LOSS = "high_loss"
    CUT = "cut"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DeviceStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"


class TicketStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Base schemas
class TimestampMixin(BaseModel):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.FIELD_ENGINEER


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class User(UserBase, TimestampMixin):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User


# Client Schemas
class ClientBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    latitude: Decimal
    longitude: Decimal


class ClientCreate(ClientBase):
    client_id: str
    pppoe_username: Optional[str] = None
    pppoe_password: Optional[str] = None
    vlan_id: Optional[int] = None
    service_id: Optional[str] = None
    assigned_plan: Optional[str] = None
    speed_download: Optional[int] = None
    speed_upload: Optional[int] = None
    olt_name: Optional[str] = None
    pon_port: Optional[str] = None
    onu_serial: Optional[str] = None
    mst_id: Optional[int] = None
    splitter_port: Optional[int] = None
    drop_cable_length: Optional[Decimal] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: Optional[ClientStatus] = None
    pppoe_username: Optional[str] = None
    pppoe_password: Optional[str] = None
    vlan_id: Optional[int] = None
    service_id: Optional[str] = None
    assigned_plan: Optional[str] = None
    speed_download: Optional[int] = None
    speed_upload: Optional[int] = None
    olt_name: Optional[str] = None
    pon_port: Optional[str] = None
    onu_serial: Optional[str] = None
    rx_power: Optional[Decimal] = None
    tx_power: Optional[Decimal] = None
    mst_id: Optional[int] = None
    splitter_port: Optional[int] = None
    drop_cable_length: Optional[Decimal] = None


class Client(ClientBase, TimestampMixin):
    id: int
    client_id: str
    status: ClientStatus
    latitude: Decimal
    longitude: Decimal
    
    # Network Info
    pppoe_username: Optional[str] = None
    pppoe_password: Optional[str] = None
    vlan_id: Optional[int] = None
    service_id: Optional[str] = None
    assigned_plan: Optional[str] = None
    speed_download: Optional[int] = None
    speed_upload: Optional[int] = None
    
    # OLT/PON Info
    olt_name: Optional[str] = None
    pon_port: Optional[str] = None
    onu_serial: Optional[str] = None
    onu_mac: Optional[str] = None
    
    # Optical Power
    rx_power: Optional[Decimal] = None
    tx_power: Optional[Decimal] = None
    
    # Status
    last_seen: Optional[datetime] = None
    uptime_seconds: Optional[int] = None
    is_online: Optional[bool] = None
    
    # Linking
    mst_id: Optional[int] = None
    splitter_port: Optional[int] = None
    fibre_core_id: Optional[int] = None
    drop_cable_length: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


class ClientWithMST(Client):
    mst_name: Optional[str] = None
    mst_latitude: Optional[Decimal] = None
    mst_longitude: Optional[Decimal] = None
    fibre_core_color: Optional[str] = None


# MST Box Schemas
class MSTBoxBase(BaseModel):
    mst_id: str
    name: str
    location_name: Optional[str] = None
    latitude: Decimal
    longitude: Decimal


class MSTBoxCreate(MSTBoxBase):
    splitter_type: SplitterType = SplitterType.SPLITTER_1_8
    port_details: Optional[List[dict]] = None


class MSTBoxUpdate(BaseModel):
    name: Optional[str] = None
    location_name: Optional[str] = None
    splitter_type: Optional[SplitterType] = None
    port_details: Optional[List[dict]] = None


class MSTBox(MSTBoxBase, TimestampMixin):
    id: int
    splitter_type: SplitterType
    total_ports: int
    used_ports: int
    port_details: Optional[List[dict]] = None
    capacity_status: str
    
    class Config:
        from_attributes = True


class MSTBoxWithClients(MSTBox):
    clients: List[Client] = []
    available_ports: int = 0


class MSTBoxResponse(MSTBox):
    pass


class MSTBoxDetail(MSTBoxWithClients):
    pass


# Fibre Route Schemas
class FibreRouteBase(BaseModel):
    route_id: str
    name: str
    start_mst_id: int
    fibre_type: int  # 1, 2, 4, 8, 12, 24, 48 cores
    installation_type: str = "underground"


class FibreRouteCreate(FibreRouteBase):
    end_mst_id: Optional[int] = None
    end_client_id: Optional[int] = None
    route_coordinates: Optional[List[tuple]] = None  # List of (lat, lng) pairs


class FibreRouteUpdate(BaseModel):
    name: Optional[str] = None
    fibre_type: Optional[int] = None
    installation_type: Optional[str] = None


class FibreRoute(FibreRouteBase, TimestampMixin):
    id: int
    end_mst_id: Optional[int] = None
    end_client_id: Optional[int] = None
    total_cores: int
    distance_meters: Optional[Decimal] = None
    installed_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Fibre Core Schemas
class FibreCoreBase(BaseModel):
    route_id: int
    core_number: int
    color: str
    status: FibreCoreStatus = FibreCoreStatus.FREE


class FibreCoreCreate(FibreCoreBase):
    pass


class FibreCoreUpdate(BaseModel):
    status: Optional[FibreCoreStatus] = None
    client_id: Optional[int] = None
    reserved_for: Optional[str] = None


class FibreCore(FibreCoreBase, TimestampMixin):
    id: int
    client_id: Optional[int] = None
    reserved_for: Optional[str] = None
    
    class Config:
        from_attributes = True


# Splicing Record Schemas
class SplicingRecordBase(BaseModel):
    core_id: int
    target_core_color: Optional[str] = None
    target_route_name: Optional[str] = None
    splice_location: Optional[str] = None
    splice_latitude: Optional[Decimal] = None
    splice_longitude: Optional[Decimal] = None
    engineer_name: str
    notes: Optional[str] = None


class SplicingRecordCreate(SplicingRecordBase):
    target_core_id: Optional[int] = None


class SplicingRecord(SplicingRecordBase, TimestampMixin):
    id: int
    target_core_id: Optional[int] = None
    spliced_at: datetime
    
    class Config:
        from_attributes = True


# Activity Log Schemas
class ActivityLogBase(BaseModel):
    action_type: str
    action_description: str


class ActivityLogCreate(ActivityLogBase):
    client_id: Optional[int] = None
    mst_id: Optional[int] = None
    fibre_route_id: Optional[int] = None
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class ActivityLog(ActivityLogBase, TimestampMixin):
    id: int
    user_id: int
    client_id: Optional[int] = None
    mst_id: Optional[int] = None
    fibre_route_id: Optional[int] = None
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    
    class Config:
        from_attributes = True


class ActivityLogResponse(ActivityLog):
    pass


# Dashboard Schemas
class DashboardStats(BaseModel):
    total_clients: int
    active_clients: int
    suspended_clients: int = 0
    pending_clients: int = 0
    total_mst_boxes: int
    total_fibre_km: Decimal
    total_fibre_length_km: Decimal
    revenue_total: Decimal = Decimal("0")
    offline_devices: int = 0
    open_tickets: int = 0
    active_users: int = 0
    average_utilization: float = 0.0
    client_status_distribution: Dict[str, int] = {}
    recent_activities: List[ActivityLog] = []


# Map Feature Schemas
class MapMarker(BaseModel):
    id: int
    type: str  # client, mst, pole, manhole
    latitude: Decimal
    longitude: Decimal
    name: str
    status: Optional[str] = None
    details: Optional[dict] = None


class MapFibreRoute(BaseModel):
    id: int
    start_lat: Decimal
    start_lng: Decimal
    end_lat: Decimal
    end_lng: Decimal
    fibre_type: int
    distance_meters: Decimal
    cores_used: int
    cores_free: int
    route_coordinates: Optional[List[tuple]] = None


class OLTOfficeBase(BaseModel):
    olt_id: str
    name: str
    location_name: Optional[str] = None
    latitude: Decimal
    longitude: Decimal
    pon_power_dbm: Optional[Decimal] = None
    status: str = "active"
    notes: Optional[str] = None


class OLTOfficeCreate(OLTOfficeBase):
    pass


class OLTOfficeUpdate(BaseModel):
    name: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    pon_power_dbm: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class OLTOffice(OLTOfficeBase, TimestampMixin):
    id: int

    class Config:
        from_attributes = True


class ClosureSpliceRow(BaseModel):
    incoming_buffer: str
    incoming_core_color: str
    outgoing_buffer: str
    outgoing_core_color: str
    splice_loss_db: Decimal = Decimal("0")


class ClosureBase(BaseModel):
    closure_id: str
    name: str
    location_name: Optional[str] = None
    latitude: Decimal
    longitude: Decimal
    incoming_cable_size: int = 24
    outgoing_cable_size: int = 24
    incoming_source_type: Optional[NetworkNodeType] = None
    incoming_source_id: Optional[int] = None
    outgoing_destination_type: Optional[NetworkNodeType] = None
    outgoing_destination_id: Optional[int] = None
    splice_matrix: List[ClosureSpliceRow] = []
    signal_dbm: Optional[Decimal] = None
    notes: Optional[str] = None


class ClosureCreate(ClosureBase):
    pass


class ClosureUpdate(BaseModel):
    name: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    incoming_cable_size: Optional[int] = None
    outgoing_cable_size: Optional[int] = None
    incoming_source_type: Optional[NetworkNodeType] = None
    incoming_source_id: Optional[int] = None
    outgoing_destination_type: Optional[NetworkNodeType] = None
    outgoing_destination_id: Optional[int] = None
    splice_matrix: Optional[List[ClosureSpliceRow]] = None
    signal_dbm: Optional[Decimal] = None
    notes: Optional[str] = None


class Closure(ClosureBase, TimestampMixin):
    id: int

    class Config:
        from_attributes = True


class NetworkLinkBase(BaseModel):
    link_id: str
    name: str
    source_type: NetworkNodeType
    source_id: int
    destination_type: NetworkNodeType
    destination_id: int
    route_id: Optional[int] = None
    cable_type: CableType = CableType.DISTRIBUTION
    core_count: int = 12
    buffer_group: Optional[str] = None
    active_core_number: Optional[int] = None
    active_core_color: Optional[str] = None
    core_status: FibreCoreStatus = FibreCoreStatus.FREE
    distance_meters: Optional[Decimal] = None
    coordinates: List[dict] = []
    signal_dbm: Optional[Decimal] = None
    splice_loss_db: Decimal = Decimal("0")
    distance_loss_db: Decimal = Decimal("0")
    total_loss_db: Decimal = Decimal("0")
    is_active: bool = True
    health_status: LinkHealthStatus = LinkHealthStatus.HEALTHY


class NetworkLinkCreate(NetworkLinkBase):
    pass


class NetworkLinkUpdate(BaseModel):
    name: Optional[str] = None
    cable_type: Optional[CableType] = None
    core_count: Optional[int] = None
    buffer_group: Optional[str] = None
    active_core_number: Optional[int] = None
    active_core_color: Optional[str] = None
    core_status: Optional[FibreCoreStatus] = None
    distance_meters: Optional[Decimal] = None
    coordinates: Optional[List[dict]] = None
    signal_dbm: Optional[Decimal] = None
    splice_loss_db: Optional[Decimal] = None
    distance_loss_db: Optional[Decimal] = None
    total_loss_db: Optional[Decimal] = None
    is_active: Optional[bool] = None
    health_status: Optional[LinkHealthStatus] = None


class NetworkLink(NetworkLinkBase, TimestampMixin):
    id: int

    class Config:
        from_attributes = True


class NetworkAlert(BaseModel):
    id: int
    alert_code: str
    alert_type: str
    severity: AlertSeverity
    message: str
    node_type: Optional[NetworkNodeType] = None
    node_id: Optional[int] = None
    link_id: Optional[int] = None
    client_id: Optional[int] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MapTopologyData(BaseModel):
    olt_offices: List[dict]
    closures: List[dict]
    mst_boxes: List[dict]
    clients: List[dict]
    links: List[dict]
    fibre_routes: List[dict]
    alerts: List[dict]
    summary: dict


class TracePathResponse(BaseModel):
    target_type: NetworkNodeType
    target_id: int
    found: bool
    nodes: List[dict] = []
    links: List[dict] = []
    total_loss_db: float = 0.0
    fault_detected: bool = False
    fault_at: Optional[dict] = None


class FaultDetectionResponse(BaseModel):
    customer_id: int
    trace: TracePathResponse
    break_detected: bool
    probable_fault: Optional[dict] = None


class NetworkDeviceBase(BaseModel):
    device_id: str
    name: str
    device_type: str
    vendor: Optional[str] = None
    ip_address: str
    location_name: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    status: DeviceStatus = DeviceStatus.ONLINE
    uplink_mbps: int = 0
    downlink_mbps: int = 0
    cpu_percent: Decimal = Decimal("0")
    memory_percent: Decimal = Decimal("0")
    notes: Optional[str] = None


class NetworkDeviceCreate(NetworkDeviceBase):
    pass


class NetworkDeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    vendor: Optional[str] = None
    ip_address: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    status: Optional[DeviceStatus] = None
    uplink_mbps: Optional[int] = None
    downlink_mbps: Optional[int] = None
    cpu_percent: Optional[Decimal] = None
    memory_percent: Optional[Decimal] = None
    notes: Optional[str] = None


class NetworkDevice(NetworkDeviceBase, TimestampMixin):
    id: int
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True


class BillingPaymentBase(BaseModel):
    payment_id: str
    client_id: int
    amount: Decimal
    currency: str = "NGN"
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: str = "bank_transfer"
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    invoice_reference: Optional[str] = None
    notes: Optional[str] = None


class BillingPaymentCreate(BillingPaymentBase):
    pass


class BillingPaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    payment_method: Optional[str] = None
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    invoice_reference: Optional[str] = None
    notes: Optional[str] = None


class BillingPayment(BillingPaymentBase, TimestampMixin):
    id: int

    class Config:
        from_attributes = True


class TicketBase(BaseModel):
    ticket_id: str
    title: str
    description: str
    category: str = "fault"
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus = TicketStatus.OPEN
    client_id: Optional[int] = None
    assigned_to_user_id: Optional[int] = None
    resolution_notes: Optional[str] = None


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[TicketPriority] = None
    status: Optional[TicketStatus] = None
    client_id: Optional[int] = None
    assigned_to_user_id: Optional[int] = None
    resolution_notes: Optional[str] = None


class Ticket(TicketBase, TimestampMixin):
    id: int
    opened_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# WebSocket Message Schemas
class WSMessage(BaseModel):
    type: str
    data: dict
    timestamp: datetime = datetime.utcnow()


class WSClientUpdate(WSMessage):
    type: str = "client_update"


class WSMSTUpdate(WSMessage):
    type: str = "mst_update"


class WSFibreUpdate(WSMessage):
    type: str = "fibre_update"


class WSActivityLog(WSMessage):
    type: str = "activity_log"
