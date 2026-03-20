from datetime import datetime
from decimal import Decimal
from math import atan2, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..models import (
    ActivityLog,
    BillingPayment,
    CableType,
    Client,
    ClientStatus,
    Closure,
    DeviceStatus,
    FibreCore,
    FibreCoreStatus,
    FibreRoute,
    LinkHealthStatus,
    MSTBox,
    NetworkAlert,
    NetworkDevice,
    NetworkLink,
    NetworkNodeType,
    OLTOffice,
    PaymentStatus,
    SplitterType,
    Ticket,
    TicketPriority,
    TicketStatus,
    User,
    UserRole,
    get_fiber_color,
)

router = APIRouter(prefix="/seed", tags=["Seed Data"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> Decimal:
    r = 6371000
    phi1, phi2 = radians(lat1), radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)
    a = sin(delta_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return Decimal(r * c)


def _capacity_status(used_ports: int, total_ports: int) -> str:
    if total_ports <= 0:
        return "available"
    ratio = used_ports / total_ports
    if ratio >= 1:
        return "full"
    if ratio >= 0.8:
        return "nearly_full"
    return "available"


async def _seed_enhanced_mvp_data(
    db: AsyncSession,
    users: list[User] | None = None,
    msts: list[MSTBox] | None = None,
    clients: list[Client] | None = None,
    routes: list[FibreRoute] | None = None,
):
    if users is None:
        users = (await db.execute(select(User).order_by(User.id.asc()))).scalars().all()
    if msts is None:
        msts = (await db.execute(select(MSTBox).order_by(MSTBox.id.asc()))).scalars().all()
    if clients is None:
        clients = (await db.execute(select(Client).order_by(Client.id.asc()))).scalars().all()
    if routes is None:
        routes = (await db.execute(select(FibreRoute).order_by(FibreRoute.id.asc()))).scalars().all()

    if not users or not msts:
        return {
            "enhanced_seed_message": "Skipped enhanced seed: base users/MST data missing",
            "olt_offices": 0,
            "closures": 0,
            "network_links": 0,
            "network_alerts": 0,
            "network_devices": 0,
            "billing_payments": 0,
            "tickets": 0,
        }

    existing_olt = (await db.execute(select(OLTOffice).limit(1))).scalar_one_or_none()
    existing_closure = (await db.execute(select(Closure).limit(1))).scalar_one_or_none()
    existing_link = (await db.execute(select(NetworkLink).limit(1))).scalar_one_or_none()
    existing_alert = (await db.execute(select(NetworkAlert).limit(1))).scalar_one_or_none()
    existing_device = (await db.execute(select(NetworkDevice).limit(1))).scalar_one_or_none()
    existing_payment = (await db.execute(select(BillingPayment).limit(1))).scalar_one_or_none()
    existing_ticket = (await db.execute(select(Ticket).limit(1))).scalar_one_or_none()

    olt_rows = []
    if not existing_olt:
        olt_rows = [
            OLTOffice(
                olt_id="OLT-CORE-01",
                name="Lagos Core OLT",
                location_name="HQ Datacenter",
                latitude=Decimal("6.58000000"),
                longitude=Decimal("3.36000000"),
                pon_power_dbm=Decimal("3.50"),
                status="active",
                notes="Primary feeder origin",
            )
        ]
        db.add_all(olt_rows)
        await db.flush()
    else:
        olt_rows = (await db.execute(select(OLTOffice).order_by(OLTOffice.id.asc()))).scalars().all()

    closure_rows = []
    if not existing_closure:
        closure_rows = [
            Closure(
                closure_id="CLO-001",
                name="Closure A - Allen Backbone",
                location_name="Allen Junction",
                latitude=Decimal("6.58760000"),
                longitude=Decimal("3.34790000"),
                incoming_cable_size=24,
                outgoing_cable_size=24,
                incoming_source_type=NetworkNodeType.OLT,
                incoming_source_id=olt_rows[0].id,
                outgoing_destination_type=NetworkNodeType.CLOSURE,
                outgoing_destination_id=None,
                signal_dbm=Decimal("2.10"),
                splice_matrix=[
                    {
                        "incoming_buffer": "Blue Buffer",
                        "incoming_core_color": "Orange",
                        "outgoing_buffer": "Blue Buffer",
                        "outgoing_core_color": "Blue",
                        "splice_loss_db": 0.08,
                    },
                    {
                        "incoming_buffer": "Green Buffer",
                        "incoming_core_color": "White",
                        "outgoing_buffer": "Green Buffer",
                        "outgoing_core_color": "Black",
                        "splice_loss_db": 0.09,
                    },
                ],
            ),
            Closure(
                closure_id="CLO-002",
                name="Closure B - Yaba Split",
                location_name="Sabo, Yaba",
                latitude=Decimal("6.53100000"),
                longitude=Decimal("3.36500000"),
                incoming_cable_size=24,
                outgoing_cable_size=12,
                incoming_source_type=NetworkNodeType.CLOSURE,
                incoming_source_id=None,
                outgoing_destination_type=NetworkNodeType.MST,
                outgoing_destination_id=msts[0].id,
                signal_dbm=Decimal("0.40"),
                splice_matrix=[
                    {
                        "incoming_buffer": "Blue Buffer",
                        "incoming_core_color": "Blue",
                        "outgoing_buffer": "Blue Buffer",
                        "outgoing_core_color": "Blue",
                        "splice_loss_db": 0.11,
                    },
                    {
                        "incoming_buffer": "Orange Buffer",
                        "incoming_core_color": "Orange",
                        "outgoing_buffer": "Orange Buffer",
                        "outgoing_core_color": "Orange",
                        "splice_loss_db": 0.12,
                    },
                ],
            ),
        ]
        db.add_all(closure_rows)
        await db.flush()
        closure_rows[0].outgoing_destination_id = closure_rows[1].id
        closure_rows[1].incoming_source_id = closure_rows[0].id
    else:
        closure_rows = (await db.execute(select(Closure).order_by(Closure.id.asc()))).scalars().all()

    route_by_name = {route.route_id: route for route in routes}

    link_rows = []
    if not existing_link and olt_rows and len(closure_rows) >= 2:
        c_a, c_b = closure_rows[0], closure_rows[1]
        m1 = msts[0] if len(msts) > 0 else None
        m2 = msts[1] if len(msts) > 1 else None
        m3 = msts[2] if len(msts) > 2 else None
        cli1 = clients[0] if len(clients) > 0 else None
        cli2 = clients[1] if len(clients) > 1 else None
        cli3 = clients[2] if len(clients) > 2 else None

        link_rows = [
            NetworkLink(
                link_id="LNK-001",
                name="OLT to Closure A",
                source_type=NetworkNodeType.OLT,
                source_id=olt_rows[0].id,
                destination_type=NetworkNodeType.CLOSURE,
                destination_id=c_a.id,
                route_id=route_by_name.get("FR-001").id if route_by_name.get("FR-001") else None,
                cable_type=CableType.FEEDER,
                core_count=24,
                buffer_group="Blue Buffer",
                active_core_number=2,
                active_core_color="Orange",
                core_status=FibreCoreStatus.USED,
                distance_meters=_distance_meters(
                    float(olt_rows[0].latitude),
                    float(olt_rows[0].longitude),
                    float(c_a.latitude),
                    float(c_a.longitude),
                ),
                coordinates=[
                    {"lat": float(olt_rows[0].latitude), "lng": float(olt_rows[0].longitude)},
                    {"lat": float(c_a.latitude), "lng": float(c_a.longitude)},
                ],
                signal_dbm=Decimal("2.10"),
                splice_loss_db=Decimal("0.08"),
                distance_loss_db=Decimal("0.32"),
                total_loss_db=Decimal("0.40"),
                is_active=True,
                health_status=LinkHealthStatus.HEALTHY,
            ),
            NetworkLink(
                link_id="LNK-002",
                name="Closure A to Closure B",
                source_type=NetworkNodeType.CLOSURE,
                source_id=c_a.id,
                destination_type=NetworkNodeType.CLOSURE,
                destination_id=c_b.id,
                route_id=route_by_name.get("FR-001").id if route_by_name.get("FR-001") else None,
                cable_type=CableType.FEEDER,
                core_count=24,
                buffer_group="Blue Buffer",
                active_core_number=1,
                active_core_color="Blue",
                core_status=FibreCoreStatus.USED,
                distance_meters=_distance_meters(
                    float(c_a.latitude),
                    float(c_a.longitude),
                    float(c_b.latitude),
                    float(c_b.longitude),
                ),
                coordinates=[
                    {"lat": float(c_a.latitude), "lng": float(c_a.longitude)},
                    {"lat": float(c_b.latitude), "lng": float(c_b.longitude)},
                ],
                signal_dbm=Decimal("1.70"),
                splice_loss_db=Decimal("0.11"),
                distance_loss_db=Decimal("0.41"),
                total_loss_db=Decimal("0.52"),
                is_active=True,
                health_status=LinkHealthStatus.HEALTHY,
            ),
        ]

        if m1:
            link_rows.append(
                NetworkLink(
                    link_id="LNK-003",
                    name="Closure B to MST-001",
                    source_type=NetworkNodeType.CLOSURE,
                    source_id=c_b.id,
                    destination_type=NetworkNodeType.MST,
                    destination_id=m1.id,
                    route_id=route_by_name.get("FR-001").id if route_by_name.get("FR-001") else None,
                    cable_type=CableType.DISTRIBUTION,
                    core_count=12,
                    buffer_group="Orange Buffer",
                    active_core_number=2,
                    active_core_color="Orange",
                    core_status=FibreCoreStatus.USED,
                    distance_meters=_distance_meters(
                        float(c_b.latitude),
                        float(c_b.longitude),
                        float(m1.latitude),
                        float(m1.longitude),
                    ),
                    coordinates=[
                        {"lat": float(c_b.latitude), "lng": float(c_b.longitude)},
                        {"lat": float(m1.latitude), "lng": float(m1.longitude)},
                    ],
                    signal_dbm=Decimal("-15.30"),
                    splice_loss_db=Decimal("0.10"),
                    distance_loss_db=Decimal("0.48"),
                    total_loss_db=Decimal("0.58"),
                    is_active=True,
                    health_status=LinkHealthStatus.HEALTHY,
                )
            )

        if m2:
            link_rows.append(
                NetworkLink(
                    link_id="LNK-004",
                    name="Closure B to MST-002",
                    source_type=NetworkNodeType.CLOSURE,
                    source_id=c_b.id,
                    destination_type=NetworkNodeType.MST,
                    destination_id=m2.id,
                    route_id=route_by_name.get("FR-002").id if route_by_name.get("FR-002") else None,
                    cable_type=CableType.DISTRIBUTION,
                    core_count=12,
                    buffer_group="Green Buffer",
                    active_core_number=3,
                    active_core_color="Green",
                    core_status=FibreCoreStatus.USED,
                    distance_meters=_distance_meters(
                        float(c_b.latitude),
                        float(c_b.longitude),
                        float(m2.latitude),
                        float(m2.longitude),
                    ),
                    coordinates=[
                        {"lat": float(c_b.latitude), "lng": float(c_b.longitude)},
                        {"lat": float(m2.latitude), "lng": float(m2.longitude)},
                    ],
                    signal_dbm=Decimal("-16.10"),
                    splice_loss_db=Decimal("0.09"),
                    distance_loss_db=Decimal("0.52"),
                    total_loss_db=Decimal("0.61"),
                    is_active=True,
                    health_status=LinkHealthStatus.HEALTHY,
                )
            )

        if m3:
            link_rows.append(
                NetworkLink(
                    link_id="LNK-005",
                    name="Closure B to MST-003",
                    source_type=NetworkNodeType.CLOSURE,
                    source_id=c_b.id,
                    destination_type=NetworkNodeType.MST,
                    destination_id=m3.id,
                    route_id=route_by_name.get("FR-002").id if route_by_name.get("FR-002") else None,
                    cable_type=CableType.DISTRIBUTION,
                    core_count=12,
                    buffer_group="Brown Buffer",
                    active_core_number=4,
                    active_core_color="Brown",
                    core_status=FibreCoreStatus.FAULTY,
                    distance_meters=_distance_meters(
                        float(c_b.latitude),
                        float(c_b.longitude),
                        float(m3.latitude),
                        float(m3.longitude),
                    ),
                    coordinates=[
                        {"lat": float(c_b.latitude), "lng": float(c_b.longitude)},
                        {"lat": float(m3.latitude), "lng": float(m3.longitude)},
                    ],
                    signal_dbm=Decimal("-27.20"),
                    splice_loss_db=Decimal("0.35"),
                    distance_loss_db=Decimal("1.10"),
                    total_loss_db=Decimal("1.45"),
                    is_active=False,
                    health_status=LinkHealthStatus.HIGH_LOSS,
                )
            )

        if m1 and cli1:
            link_rows.append(
                NetworkLink(
                    link_id="LNK-006",
                    name="MST-001 to Client CLI-001",
                    source_type=NetworkNodeType.MST,
                    source_id=m1.id,
                    destination_type=NetworkNodeType.CLIENT,
                    destination_id=cli1.id,
                    route_id=route_by_name.get("FR-003").id if route_by_name.get("FR-003") else None,
                    cable_type=CableType.DROP,
                    core_count=1,
                    buffer_group="Drop",
                    active_core_number=1,
                    active_core_color="Blue",
                    core_status=FibreCoreStatus.USED,
                    distance_meters=_distance_meters(
                        float(m1.latitude),
                        float(m1.longitude),
                        float(cli1.latitude),
                        float(cli1.longitude),
                    ),
                    coordinates=[
                        {"lat": float(m1.latitude), "lng": float(m1.longitude)},
                        {"lat": float(cli1.latitude), "lng": float(cli1.longitude)},
                    ],
                    signal_dbm=Decimal("-18.20"),
                    splice_loss_db=Decimal("0.02"),
                    distance_loss_db=Decimal("0.22"),
                    total_loss_db=Decimal("0.24"),
                    is_active=True,
                    health_status=LinkHealthStatus.HEALTHY,
                )
            )

        if m2 and cli2:
            link_rows.append(
                NetworkLink(
                    link_id="LNK-007",
                    name="MST-002 to Client CLI-002",
                    source_type=NetworkNodeType.MST,
                    source_id=m2.id,
                    destination_type=NetworkNodeType.CLIENT,
                    destination_id=cli2.id,
                    cable_type=CableType.DROP,
                    core_count=1,
                    buffer_group="Drop",
                    active_core_number=1,
                    active_core_color="Orange",
                    core_status=FibreCoreStatus.USED,
                    distance_meters=_distance_meters(
                        float(m2.latitude),
                        float(m2.longitude),
                        float(cli2.latitude),
                        float(cli2.longitude),
                    ),
                    coordinates=[
                        {"lat": float(m2.latitude), "lng": float(m2.longitude)},
                        {"lat": float(cli2.latitude), "lng": float(cli2.longitude)},
                    ],
                    signal_dbm=Decimal("-16.50"),
                    splice_loss_db=Decimal("0.03"),
                    distance_loss_db=Decimal("0.25"),
                    total_loss_db=Decimal("0.28"),
                    is_active=True,
                    health_status=LinkHealthStatus.HEALTHY,
                )
            )

        if m3 and cli3:
            link_rows.append(
                NetworkLink(
                    link_id="LNK-008",
                    name="MST-003 to Client CLI-003",
                    source_type=NetworkNodeType.MST,
                    source_id=m3.id,
                    destination_type=NetworkNodeType.CLIENT,
                    destination_id=cli3.id,
                    cable_type=CableType.DROP,
                    core_count=1,
                    buffer_group="Drop",
                    active_core_number=1,
                    active_core_color="Green",
                    core_status=FibreCoreStatus.FAULTY,
                    distance_meters=_distance_meters(
                        float(m3.latitude),
                        float(m3.longitude),
                        float(cli3.latitude),
                        float(cli3.longitude),
                    ),
                    coordinates=[
                        {"lat": float(m3.latitude), "lng": float(m3.longitude)},
                        {"lat": float(cli3.latitude), "lng": float(cli3.longitude)},
                    ],
                    signal_dbm=Decimal("-29.10"),
                    splice_loss_db=Decimal("0.08"),
                    distance_loss_db=Decimal("0.41"),
                    total_loss_db=Decimal("0.49"),
                    is_active=False,
                    health_status=LinkHealthStatus.CUT,
                )
            )

        db.add_all(link_rows)

    alert_rows = []
    if not existing_alert:
        mst_for_alert = msts[2] if len(msts) > 2 else msts[0]
        client_for_alert = clients[2] if len(clients) > 2 else clients[0]
        alert_rows = [
            NetworkAlert(
                alert_code="ALT-HIGHLOSS-001",
                alert_type="high_loss",
                severity="warning",
                message=f"High splice loss detected towards {mst_for_alert.mst_id}",
                node_type=NetworkNodeType.MST,
                node_id=mst_for_alert.id,
                is_resolved=False,
            ),
            NetworkAlert(
                alert_code="ALT-CUT-001",
                alert_type="fiber_cut",
                severity="critical",
                message=f"Possible fiber cut affecting client {client_for_alert.client_id}",
                node_type=NetworkNodeType.CLIENT,
                node_id=client_for_alert.id,
                client_id=client_for_alert.id,
                is_resolved=False,
            ),
            NetworkAlert(
                alert_code="ALT-MST-OFFLINE-001",
                alert_type="offline_mst",
                severity="warning",
                message=f"{mst_for_alert.mst_id} appears degraded",
                node_type=NetworkNodeType.MST,
                node_id=mst_for_alert.id,
                is_resolved=False,
            ),
        ]
        db.add_all(alert_rows)

    device_rows = []
    if not existing_device:
        device_rows = [
            NetworkDevice(
                device_id="DEV-OLT-001",
                name="Core OLT Chassis",
                device_type="olt",
                vendor="Huawei",
                ip_address="10.0.0.10",
                location_name="HQ Datacenter",
                latitude=Decimal("6.58000000"),
                longitude=Decimal("3.36000000"),
                status=DeviceStatus.ONLINE,
                uplink_mbps=8200,
                downlink_mbps=7900,
                cpu_percent=Decimal("34.20"),
                memory_percent=Decimal("58.50"),
            ),
            NetworkDevice(
                device_id="DEV-AGG-001",
                name="Yaba Aggregation Switch",
                device_type="switch",
                vendor="MikroTik",
                ip_address="10.0.1.20",
                location_name="Yaba PoP",
                latitude=Decimal("6.52900000"),
                longitude=Decimal("3.37000000"),
                status=DeviceStatus.DEGRADED,
                uplink_mbps=2400,
                downlink_mbps=2280,
                cpu_percent=Decimal("72.40"),
                memory_percent=Decimal("81.10"),
            ),
            NetworkDevice(
                device_id="DEV-EDGE-001",
                name="Lekki Edge Router",
                device_type="router",
                vendor="Cisco",
                ip_address="10.0.2.30",
                location_name="Lekki PoP",
                latitude=Decimal("6.44600000"),
                longitude=Decimal("3.47100000"),
                status=DeviceStatus.OFFLINE,
                uplink_mbps=0,
                downlink_mbps=0,
                cpu_percent=Decimal("0.00"),
                memory_percent=Decimal("0.00"),
            ),
        ]
        db.add_all(device_rows)

    payment_rows = []
    if not existing_payment and clients:
        payment_rows = [
            BillingPayment(
                payment_id="INV-2026-0001",
                client_id=clients[0].id,
                amount=Decimal("250000.00"),
                status=PaymentStatus.PAID,
                payment_method="bank_transfer",
                due_date=datetime.utcnow(),
                paid_at=datetime.utcnow(),
                invoice_reference="JAN-2026-PRIMETECH",
            ),
            BillingPayment(
                payment_id="INV-2026-0002",
                client_id=clients[1].id if len(clients) > 1 else clients[0].id,
                amount=Decimal("310000.00"),
                status=PaymentStatus.PENDING,
                payment_method="card",
                due_date=datetime.utcnow(),
                invoice_reference="JAN-2026-MEDICS",
            ),
            BillingPayment(
                payment_id="INV-2026-0003",
                client_id=clients[2].id if len(clients) > 2 else clients[0].id,
                amount=Decimal("95000.00"),
                status=PaymentStatus.OVERDUE,
                payment_method="cash",
                due_date=datetime.utcnow(),
                invoice_reference="JAN-2026-OCEANVIEW",
            ),
        ]
        db.add_all(payment_rows)

    ticket_rows = []
    if not existing_ticket and clients:
        assignee = users[1] if len(users) > 1 else users[0]
        ticket_rows = [
            Ticket(
                ticket_id="TKT-2026-0001",
                title="Low optical signal at Oceanview",
                description="Customer reports unstable link, likely cut on distribution segment",
                category="fault",
                priority=TicketPriority.CRITICAL,
                status=TicketStatus.IN_PROGRESS,
                client_id=clients[2].id if len(clients) > 2 else clients[0].id,
                assigned_to_user_id=assignee.id,
            ),
            Ticket(
                ticket_id="TKT-2026-0002",
                title="Invoice dispute for Lagos Medics",
                description="Client requested invoice itemization",
                category="billing",
                priority=TicketPriority.MEDIUM,
                status=TicketStatus.OPEN,
                client_id=clients[1].id if len(clients) > 1 else clients[0].id,
            ),
        ]
        db.add_all(ticket_rows)

    await db.flush()

    return {
        "enhanced_seed_message": "Enhanced MVP map/network modules seeded",
        "olt_offices": len(olt_rows) if not existing_olt else 0,
        "closures": len(closure_rows) if not existing_closure else 0,
        "network_links": len(link_rows) if not existing_link else 0,
        "network_alerts": len(alert_rows) if not existing_alert else 0,
        "network_devices": len(device_rows) if not existing_device else 0,
        "billing_payments": len(payment_rows) if not existing_payment else 0,
        "tickets": len(ticket_rows) if not existing_ticket else 0,
    }


@router.post("/demo")
async def seed_demo_data(db: AsyncSession = Depends(get_db)):
    """Seed demo data that matches current database models."""
    existing_user = await db.execute(select(User.id).limit(1))
    if existing_user.scalar_one_or_none():
        enhanced = await _seed_enhanced_mvp_data(db)
        await db.commit()
        return {"message": "Base data already exists. Enhanced MVP data synced.", **enhanced}

    users = [
        User(
            email="admin@isp.com",
            username="admin",
            hashed_password=pwd_context.hash("admin123"),
            full_name="System Admin",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        ),
        User(
            email="engineer@isp.com",
            username="engineer",
            hashed_password=pwd_context.hash("engineer123"),
            full_name="Field Engineer",
            role=UserRole.FIELD_ENGINEER,
            is_active=True,
        ),
        User(
            email="noc@isp.com",
            username="noc",
            hashed_password=pwd_context.hash("noc123"),
            full_name="NOC Viewer",
            role=UserRole.NOC_VIEWER,
            is_active=True,
        ),
    ]
    db.add_all(users)
    await db.flush()

    msts = [
        MSTBox(
            mst_id="MST-001",
            name="Ikeja Central MST",
            location_name="Ikeja GRA",
            latitude=Decimal("6.59431000"),
            longitude=Decimal("3.33742000"),
            splitter_type=SplitterType.SPLITTER_1_16,
            total_ports=16,
            used_ports=0,
            capacity_status="available",
        ),
        MSTBox(
            mst_id="MST-002",
            name="Yaba Distribution MST",
            location_name="Yaba",
            latitude=Decimal("6.50910000"),
            longitude=Decimal("3.37480000"),
            splitter_type=SplitterType.SPLITTER_1_16,
            total_ports=16,
            used_ports=0,
            capacity_status="available",
        ),
        MSTBox(
            mst_id="MST-003",
            name="Lekki Phase 1 MST",
            location_name="Lekki Phase 1",
            latitude=Decimal("6.44740000"),
            longitude=Decimal("3.47380000"),
            splitter_type=SplitterType.SPLITTER_1_8,
            total_ports=8,
            used_ports=0,
            capacity_status="available",
        ),
    ]
    db.add_all(msts)
    await db.flush()

    clients = [
        Client(
            client_id="CLI-001",
            name="PrimeTech Hub",
            phone="+2348010000001",
            email="ops@primetech.ng",
            address="Allen Avenue, Ikeja",
            status=ClientStatus.ACTIVE,
            latitude=Decimal("6.60230000"),
            longitude=Decimal("3.35110000"),
            pppoe_username="primetech_pppoe",
            pppoe_password="secret123",
            vlan_id=210,
            service_id="SRV-210",
            assigned_plan="Business 300Mbps",
            speed_download=300,
            speed_upload=300,
            olt_name="OLT-IKEJA-01",
            pon_port="PON 1/1/2",
            onu_serial="ONU-PT-001",
            rx_power=Decimal("-18.20"),
            tx_power=Decimal("2.10"),
            is_online=True,
            mst_id=msts[0].id,
            splitter_port=1,
        ),
        Client(
            client_id="CLI-002",
            name="Lagos Medics Clinic",
            phone="+2348010000002",
            email="it@lagosmedics.ng",
            address="Herbert Macaulay, Yaba",
            status=ClientStatus.ACTIVE,
            latitude=Decimal("6.51540000"),
            longitude=Decimal("3.37380000"),
            pppoe_username="medics_pppoe",
            pppoe_password="secret123",
            vlan_id=211,
            service_id="SRV-211",
            assigned_plan="Enterprise 500Mbps",
            speed_download=500,
            speed_upload=500,
            olt_name="OLT-YABA-01",
            pon_port="PON 1/2/1",
            onu_serial="ONU-LM-002",
            rx_power=Decimal("-16.50"),
            tx_power=Decimal("2.40"),
            is_online=True,
            mst_id=msts[1].id,
            splitter_port=1,
        ),
        Client(
            client_id="CLI-003",
            name="Oceanview Apartments",
            phone="+2348010000003",
            email="manager@oceanview.ng",
            address="Admiralty Way, Lekki",
            status=ClientStatus.PENDING,
            latitude=Decimal("6.43500000"),
            longitude=Decimal("3.45680000"),
            pppoe_username="oceanview_pppoe",
            pppoe_password="secret123",
            vlan_id=212,
            service_id="SRV-212",
            assigned_plan="Home 100Mbps",
            speed_download=100,
            speed_upload=50,
            olt_name="OLT-LEKKI-01",
            pon_port="PON 1/3/4",
            onu_serial="ONU-OV-003",
            rx_power=Decimal("-21.20"),
            tx_power=Decimal("1.80"),
            is_online=False,
            mst_id=msts[2].id,
            splitter_port=1,
        ),
    ]
    db.add_all(clients)
    await db.flush()

    for mst in msts:
        used = sum(1 for c in clients if c.mst_id == mst.id)
        mst.used_ports = used
        mst.capacity_status = _capacity_status(used, mst.total_ports)

    routes = [
        FibreRoute(
            route_id="FR-001",
            name="Ikeja-Yaba Backbone",
            start_mst_id=msts[0].id,
            end_mst_id=msts[1].id,
            fibre_type=24,
            total_cores=24,
            installation_type="underground",
            distance_meters=_distance_meters(
                float(msts[0].latitude),
                float(msts[0].longitude),
                float(msts[1].latitude),
                float(msts[1].longitude),
            ),
            route_path=f"LINESTRING({msts[0].longitude} {msts[0].latitude}, {msts[1].longitude} {msts[1].latitude})",
        ),
        FibreRoute(
            route_id="FR-002",
            name="Yaba-Lekki Feeder",
            start_mst_id=msts[1].id,
            end_mst_id=msts[2].id,
            fibre_type=12,
            total_cores=12,
            installation_type="aerial",
            distance_meters=_distance_meters(
                float(msts[1].latitude),
                float(msts[1].longitude),
                float(msts[2].latitude),
                float(msts[2].longitude),
            ),
            route_path=f"LINESTRING({msts[1].longitude} {msts[1].latitude}, {msts[2].longitude} {msts[2].latitude})",
        ),
        FibreRoute(
            route_id="FR-003",
            name="Ikeja Drop to PrimeTech",
            start_mst_id=msts[0].id,
            end_client_id=clients[0].id,
            fibre_type=1,
            total_cores=1,
            installation_type="aerial",
            distance_meters=_distance_meters(
                float(msts[0].latitude),
                float(msts[0].longitude),
                float(clients[0].latitude),
                float(clients[0].longitude),
            ),
            route_path=f"LINESTRING({msts[0].longitude} {msts[0].latitude}, {clients[0].longitude} {clients[0].latitude})",
        ),
    ]
    db.add_all(routes)
    await db.flush()

    cores = []
    for route in routes:
        for core_number in range(1, route.fibre_type + 1):
            core = FibreCore(
                route_id=route.id,
                core_number=core_number,
                color=get_fiber_color(core_number),
                status=FibreCoreStatus.FREE,
            )
            cores.append(core)
    db.add_all(cores)
    await db.flush()

    # Assign first core on the drop route to client 1
    drop_core = next(c for c in cores if c.route_id == routes[2].id and c.core_number == 1)
    drop_core.status = FibreCoreStatus.USED
    drop_core.client_id = clients[0].id
    clients[0].fibre_core_id = drop_core.id
    clients[0].drop_cable_length = routes[2].distance_meters

    activities = [
        ActivityLog(
            action_type="client_created",
            action_description=f"Client '{clients[0].name}' added",
            user_id=users[0].id,
            client_id=clients[0].id,
            mst_id=clients[0].mst_id,
        ),
        ActivityLog(
            action_type="mst_created",
            action_description=f"MST '{msts[0].name}' commissioned",
            user_id=users[1].id,
            mst_id=msts[0].id,
        ),
        ActivityLog(
            action_type="fibre_route_created",
            action_description=f"Route '{routes[0].name}' installed",
            user_id=users[1].id,
            fibre_route_id=routes[0].id,
        ),
        ActivityLog(
            action_type="client_connected",
            action_description=f"Client '{clients[0].name}' connected on splitter port 1",
            user_id=users[1].id,
            client_id=clients[0].id,
            mst_id=clients[0].mst_id,
            after_state={"splitter_port": 1, "core_color": drop_core.color},
        ),
    ]
    db.add_all(activities)

    enhanced = await _seed_enhanced_mvp_data(
        db=db,
        users=users,
        msts=msts,
        clients=clients,
        routes=routes,
    )

    await db.commit()

    return {
        "message": "Demo data seeded successfully",
        "users": len(users),
        "mst_boxes": len(msts),
        "clients": len(clients),
        "fibre_routes": len(routes),
        "fibre_cores": len(cores),
        "activities": len(activities),
        **enhanced,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.post("/enhanced-mvp")
async def seed_enhanced_mvp_only(db: AsyncSession = Depends(get_db)):
    """Seed only the enhanced topology/network/billing/tickets modules."""
    enhanced = await _seed_enhanced_mvp_data(db)
    await db.commit()
    return {
        "message": "Enhanced MVP seed completed",
        **enhanced,
        "generated_at": datetime.utcnow().isoformat(),
    }
