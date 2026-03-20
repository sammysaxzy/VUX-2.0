from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
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


# Dashboard Schemas
class DashboardStats(BaseModel):
    total_clients: int
    active_clients: int
    suspended_clients: int
    total_mst_boxes: int
    total_fibre_km: Decimal
    active_users: int
    recent_activities: List[ActivityLog]


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