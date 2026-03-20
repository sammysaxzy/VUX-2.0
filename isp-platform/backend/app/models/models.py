from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, 
    ForeignKey, Enum as SQLEnum, JSON, Numeric
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from datetime import datetime
import enum
import json

from ..core.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ISP_ADMIN = "isp_admin"
    FIELD_ENGINEER = "field_engineer"
    NOC_VIEWER = "noc_viewer"


class ClientStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    DISCONNECTED = "disconnected"


class FibreCoreStatus(str, enum.Enum):
    FREE = "free"
    USED = "used"
    FAULTY = "faulty"
    RESERVED = "reserved"


class InfrastructureType(str, enum.Enum):
    MST = "mst"
    FAT = "fat"
    FDB = "fdb"
    POLE = "pole"
    MANHOLE = "manhole"
    HANDHOLE = "handhole"
    CLIENT_PREMISE = "client_premise"


class SplitterType(str, enum.Enum):
    SPLITTER_1_2 = "1/2"
    SPLITTER_1_4 = "1/4"
    SPLITTER_1_8 = "1/8"
    SPLITTER_1_16 = "1/16"
    SPLITTER_1_32 = "1/32"
    SPLITTER_1_64 = "1/64"


class NetworkNodeType(str, enum.Enum):
    OLT = "olt"
    CLOSURE = "closure"
    MST = "mst"
    CLIENT = "client"


class CableType(str, enum.Enum):
    FEEDER = "feeder"
    DISTRIBUTION = "distribution"
    DROP = "drop"


class LinkHealthStatus(str, enum.Enum):
    HEALTHY = "healthy"
    HIGH_LOSS = "high_loss"
    CUT = "cut"


class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DeviceStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(SQLEnum(UserRole), default=UserRole.FIELD_ENGINEER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    activity_logs = relationship("ActivityLog", back_populates="user")


class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    status = Column(SQLEnum(ClientStatus), default=ClientStatus.PENDING)
    
    # Location
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    geom = Column(Geometry('POINT', srid=4326))
    
    # Network Info
    pppoe_username = Column(String(100), unique=True, index=True)
    pppoe_password = Column(String(255))
    vlan_id = Column(Integer)
    service_id = Column(String(50))
    assigned_plan = Column(String(100))
    speed_download = Column(Integer)  # Mbps
    speed_upload = Column(Integer)  # Mbps
    
    # OLT/PON Info
    olt_name = Column(String(100))
    pon_port = Column(String(50))
    onu_serial = Column(String(100))
    onu_mac = Column(String(50))
    
    # Optical Power
    rx_power = Column(Numeric(6, 2))
    tx_power = Column(Numeric(6, 2))
    
    # Status
    last_seen = Column(DateTime)
    uptime_seconds = Column(Integer, default=0)
    is_online = Column(Boolean, default=False)
    
    # Linking
    mst_id = Column(Integer, ForeignKey("mst_boxes.id"), nullable=True)
    splitter_port = Column(Integer)
    fibre_core_id = Column(Integer, ForeignKey("fibre_cores.id"), nullable=True)
    drop_cable_length = Column(Numeric(8, 2))  # meters
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mst = relationship("MSTBox", back_populates="clients")
    fibre_core = relationship("FibreCore", foreign_keys=[fibre_core_id])
    activity_logs = relationship("ActivityLog", back_populates="client")


class MSTBox(Base):
    __tablename__ = "mst_boxes"
    
    id = Column(Integer, primary_key=True, index=True)
    mst_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location_name = Column(String(255))
    
    # Location
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    geom = Column(Geometry('POINT', srid=4326))
    
    # Splitter Configuration
    splitter_type = Column(SQLEnum(SplitterType), default=SplitterType.SPLITTER_1_8)
    total_ports = Column(Integer, default=8)
    used_ports = Column(Integer, default=0)
    
    # Port Details (JSON)
    port_details = Column(JSON, default=list)
    
    # Capacity
    capacity_status = Column(String(20), default="available")  # available, nearly_full, full
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    clients = relationship("Client", back_populates="mst")
    fibre_routes_from = relationship("FibreRoute", foreign_keys="FibreRoute.start_mst_id", back_populates="start_mst")
    fibre_routes_to = relationship("FibreRoute", foreign_keys="FibreRoute.end_mst_id", back_populates="end_mst")
    activity_logs = relationship("ActivityLog", back_populates="mst")


class OLTOffice(Base):
    __tablename__ = "olt_offices"

    id = Column(Integer, primary_key=True, index=True)
    olt_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location_name = Column(String(255))
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    geom = Column(Geometry("POINT", srid=4326))
    pon_power_dbm = Column(Numeric(6, 2))
    status = Column(String(20), default="active")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Closure(Base):
    __tablename__ = "closures"

    id = Column(Integer, primary_key=True, index=True)
    closure_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location_name = Column(String(255))
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    geom = Column(Geometry("POINT", srid=4326))
    incoming_cable_size = Column(Integer, default=24)
    outgoing_cable_size = Column(Integer, default=24)
    incoming_source_type = Column(SQLEnum(NetworkNodeType), nullable=True)
    incoming_source_id = Column(Integer, nullable=True)
    outgoing_destination_type = Column(SQLEnum(NetworkNodeType), nullable=True)
    outgoing_destination_id = Column(Integer, nullable=True)
    splice_matrix = Column(JSON, default=list)
    signal_dbm = Column(Numeric(6, 2))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FibreRoute(Base):
    __tablename__ = "fibre_routes"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    
    # Start and End Points
    start_mst_id = Column(Integer, ForeignKey("mst_boxes.id"), nullable=False)
    end_mst_id = Column(Integer, ForeignKey("mst_boxes.id"), nullable=True)
    end_client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    # Fibre Type
    fibre_type = Column(Integer, nullable=False)  # 1, 2, 4, 8, 12, 24, 48 cores
    total_cores = Column(Integer, nullable=False)
    
    # Route Geometry
    route_path = Column(Geometry('LINESTRING', srid=4326))
    distance_meters = Column(Numeric(10, 2))
    
    # Installation Type
    installation_type = Column(String(20), default="underground")  # aerial, underground
    
    # Timestamps
    installed_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    start_mst = relationship("MSTBox", foreign_keys=[start_mst_id], back_populates="fibre_routes_from")
    end_mst = relationship("MSTBox", foreign_keys=[end_mst_id], back_populates="fibre_routes_to")
    cores = relationship("FibreCore", back_populates="route")
    network_links = relationship("NetworkLink", back_populates="route")


class NetworkLink(Base):
    __tablename__ = "network_links"

    id = Column(Integer, primary_key=True, index=True)
    link_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    source_type = Column(SQLEnum(NetworkNodeType), nullable=False)
    source_id = Column(Integer, nullable=False)
    destination_type = Column(SQLEnum(NetworkNodeType), nullable=False)
    destination_id = Column(Integer, nullable=False)
    route_id = Column(Integer, ForeignKey("fibre_routes.id"), nullable=True)
    cable_type = Column(SQLEnum(CableType), default=CableType.DISTRIBUTION)
    core_count = Column(Integer, default=12)
    buffer_group = Column(String(50))
    active_core_number = Column(Integer)
    active_core_color = Column(String(50))
    core_status = Column(SQLEnum(FibreCoreStatus), default=FibreCoreStatus.FREE)
    distance_meters = Column(Numeric(10, 2))
    coordinates = Column(JSON, default=list)
    signal_dbm = Column(Numeric(6, 2))
    splice_loss_db = Column(Numeric(6, 3), default=0)
    distance_loss_db = Column(Numeric(6, 3), default=0)
    total_loss_db = Column(Numeric(6, 3), default=0)
    is_active = Column(Boolean, default=True)
    health_status = Column(SQLEnum(LinkHealthStatus), default=LinkHealthStatus.HEALTHY)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    route = relationship("FibreRoute", back_populates="network_links")


class FibreCore(Base):
    __tablename__ = "fibre_cores"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("fibre_routes.id"), nullable=False)
    core_number = Column(Integer, nullable=False)  # 1-48
    color = Column(String(50), nullable=False)  # Standard fiber color
    status = Column(SQLEnum(FibreCoreStatus), default=FibreCoreStatus.FREE)
    
    # Usage
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    reserved_for = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    route = relationship("FibreRoute", back_populates="cores")
    client = relationship("Client", foreign_keys=[client_id])
    splicing_records = relationship(
        "SplicingRecord",
        back_populates="core",
        foreign_keys="SplicingRecord.core_id",
    )


class SplicingRecord(Base):
    __tablename__ = "splicing_records"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Core being spliced
    core_id = Column(Integer, ForeignKey("fibre_cores.id"), nullable=False)
    
    # Target core (what it's spliced to)
    target_core_id = Column(Integer, ForeignKey("fibre_cores.id"), nullable=True)
    target_route_name = Column(String(255))
    target_core_color = Column(String(50))
    
    # Location
    splice_location = Column(String(255))
    splice_latitude = Column(Numeric(10, 8))
    splice_longitude = Column(Numeric(11, 8))
    
    # Engineer
    engineer_name = Column(String(255), nullable=False)
    engineer_id = Column(Integer, ForeignKey("users.id"))
    
    # Notes
    notes = Column(Text)
    
    # Timestamp
    spliced_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    core = relationship("FibreCore", foreign_keys=[core_id], back_populates="splicing_records")


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Action Details
    action_type = Column(String(50), nullable=False)  # client_created, fibre_installed, core_spliced, etc.
    action_description = Column(Text, nullable=False)
    
    # Related Entities
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    mst_id = Column(Integer, ForeignKey("mst_boxes.id"), nullable=True)
    fibre_route_id = Column(Integer, ForeignKey("fibre_routes.id"), nullable=True)
    
    # State Change
    before_state = Column(JSON)
    after_state = Column(JSON)
    
    # Location
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="activity_logs")
    client = relationship("Client", back_populates="activity_logs")
    mst = relationship("MSTBox", back_populates="activity_logs")


class NetworkAlert(Base):
    __tablename__ = "network_alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_code = Column(String(50), unique=True, index=True, nullable=False)
    alert_type = Column(String(50), nullable=False)
    severity = Column(SQLEnum(AlertSeverity), default=AlertSeverity.WARNING)
    message = Column(Text, nullable=False)
    node_type = Column(SQLEnum(NetworkNodeType), nullable=True)
    node_id = Column(Integer, nullable=True)
    link_id = Column(Integer, ForeignKey("network_links.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class NetworkDevice(Base):
    __tablename__ = "network_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    device_type = Column(String(50), nullable=False)
    vendor = Column(String(100))
    ip_address = Column(String(100), nullable=False)
    location_name = Column(String(255))
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    status = Column(SQLEnum(DeviceStatus), default=DeviceStatus.ONLINE)
    uplink_mbps = Column(Integer, default=0)
    downlink_mbps = Column(Integer, default=0)
    cpu_percent = Column(Numeric(5, 2), default=0)
    memory_percent = Column(Numeric(5, 2), default=0)
    last_seen = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BillingPayment(Base):
    __tablename__ = "billing_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(50), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="NGN")
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), default="bank_transfer")
    due_date = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    invoice_reference = Column(String(100), nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default="fault")
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    opened_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client")
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id])


# Standard Fiber Color Codes
FIBER_COLORS = {
    1: "Blue",
    2: "Orange",
    3: "Green",
    4: "Brown",
    5: "Slate",
    6: "White",
    7: "Red",
    8: "Black",
    9: "Yellow",
    10: "Violet",
    11: "Rose",
    12: "Aqua",
    # Repeat for 13-24, 25-36, 37-48
}

def get_fiber_color(core_number: int) -> str:
    """Get standard fiber color for core number"""
    if core_number < 1:
        return "Unknown"
    color_index = ((core_number - 1) % 12) + 1
    return FIBER_COLORS.get(color_index, "Unknown")
