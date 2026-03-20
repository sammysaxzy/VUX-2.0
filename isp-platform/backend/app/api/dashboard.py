from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal
from datetime import datetime, timedelta

from ..core.database import get_db
from ..models import (
    BillingPayment,
    Client,
    ClientStatus,
    DeviceStatus,
    FibreCore,
    FibreRoute,
    MSTBox,
    NetworkDevice,
    PaymentStatus,
    Ticket,
    TicketStatus,
    User,
    ActivityLog,
)
from ..schemas import DashboardStats, ActivityLog as ActivityLogSchema
from ..core.security import get_current_user_dependency as get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get dashboard statistics"""
    # Client stats
    total_clients = await db.execute(select(func.count(Client.id)))
    active_clients = await db.execute(
        select(func.count(Client.id)).where(Client.status == ClientStatus.ACTIVE)
    )
    suspended_clients = await db.execute(
        select(func.count(Client.id)).where(Client.status == ClientStatus.SUSPENDED)
    )
    pending_clients = await db.execute(
        select(func.count(Client.id)).where(Client.status == ClientStatus.PENDING)
    )
    
    # MST stats
    total_mst = await db.execute(select(func.count(MSTBox.id)))
    
    # Fibre stats
    total_fibre = await db.execute(select(func.sum(FibreRoute.distance_meters)))
    
    # Active users (logged in within 24 hours)
    active_users = await db.execute(
        select(func.count(User.id)).where(User.last_login >= datetime.utcnow() - timedelta(hours=24))
    )

    # Revenue and operations health
    revenue_total = await db.execute(
        select(func.sum(BillingPayment.amount)).where(BillingPayment.status == PaymentStatus.PAID)
    )
    offline_devices = await db.execute(
        select(func.count(NetworkDevice.id)).where(NetworkDevice.status == DeviceStatus.OFFLINE)
    )
    open_tickets = await db.execute(
        select(func.count(Ticket.id)).where(Ticket.status != TicketStatus.RESOLVED)
    )
    
    # Recent activities
    recent_result = await db.execute(
        select(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(10)
    )
    recent_activities = recent_result.scalars().all()

    # Client status distribution
    status_distribution_result = await db.execute(
        select(Client.status, func.count(Client.id)).group_by(Client.status)
    )
    client_status_distribution = {
        status.value if hasattr(status, "value") else str(status): count
        for status, count in status_distribution_result.all()
    }

    # Average port utilization (MST boxes)
    port_totals_result = await db.execute(
        select(func.sum(MSTBox.total_ports), func.sum(MSTBox.used_ports))
    )
    total_ports, used_ports = port_totals_result.one()
    if total_ports and total_ports > 0:
        average_utilization = float((used_ports or 0) / total_ports) * 100
    else:
        average_utilization = 0.0

    total_fibre_km = Decimal((total_fibre.scalar() or 0) / 1000)
    
    return DashboardStats(
        total_clients=total_clients.scalar() or 0,
        active_clients=active_clients.scalar() or 0,
        suspended_clients=suspended_clients.scalar() or 0,
        pending_clients=pending_clients.scalar() or 0,
        total_mst_boxes=total_mst.scalar() or 0,
        total_fibre_km=total_fibre_km,
        total_fibre_length_km=total_fibre_km,
        revenue_total=Decimal(revenue_total.scalar() or 0),
        offline_devices=offline_devices.scalar() or 0,
        open_tickets=open_tickets.scalar() or 0,
        active_users=active_users.scalar() or 0,
        average_utilization=average_utilization,
        client_status_distribution=client_status_distribution,
        recent_activities=[ActivityLogSchema.model_validate(a) for a in recent_activities]
    )


@router.get("/network-summary", response_model=dict)
async def get_network_summary(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get network summary for dashboard"""
    # Online/offline clients
    online = await db.execute(
        select(func.count(Client.id)).where(Client.is_online == True)
    )
    offline = await db.execute(
        select(func.count(Client.id)).where(Client.is_online == False)
    )
    
    # MST capacity
    mst_available = await db.execute(
        select(func.count(MSTBox.id)).where(MSTBox.capacity_status == "available")
    )
    mst_nearly_full = await db.execute(
        select(func.count(MSTBox.id)).where(MSTBox.capacity_status == "nearly_full")
    )
    mst_full = await db.execute(
        select(func.count(MSTBox.id)).where(MSTBox.capacity_status == "full")
    )
    
    # Fibre core utilization
    cores_used = await db.execute(
        select(func.count(FibreCore.id)).where(FibreCore.status == "used")
    )
    cores_free = await db.execute(
        select(func.count(FibreCore.id)).where(FibreCore.status == "free")
    )
    cores_faulty = await db.execute(
        select(func.count(FibreCore.id)).where(FibreCore.status == "faulty")
    )
    
    # Total ports
    total_ports = await db.execute(select(func.sum(MSTBox.total_ports)))
    used_ports = await db.execute(select(func.sum(MSTBox.used_ports)))
    
    return {
        "clients": {
            "online": online.scalar() or 0,
            "offline": offline.scalar() or 0
        },
        "mst_capacity": {
            "available": mst_available.scalar() or 0,
            "nearly_full": mst_nearly_full.scalar() or 0,
            "full": mst_full.scalar() or 0
        },
        "fibre_cores": {
            "used": cores_used.scalar() or 0,
            "free": cores_free.scalar() or 0,
            "faulty": cores_faulty.scalar() or 0
        },
        "ports": {
            "total": total_ports.scalar() or 0,
            "used": used_ports.scalar() or 0,
            "available": (total_ports.scalar() or 0) - (used_ports.scalar() or 0)
        }
    }


@router.get("/alerts")
async def get_alerts(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get system alerts"""
    alerts = []
    
    # Check for offline clients
    offline_clients = await db.execute(
        select(Client).where(Client.is_online == False, Client.status == ClientStatus.ACTIVE).limit(10)
    )
    for client in offline_clients.scalars().all():
        alerts.append({
            "type": "client_offline",
            "severity": "warning",
            "message": f"Client '{client.name}' is offline",
            "client_id": client.id,
            "timestamp": client.last_seen
        })
    
    # Check for full MST boxes
    full_mst = await db.execute(
        select(MSTBox).where(MSTBox.capacity_status == "full")
    )
    for mst in full_mst.scalars().all():
        alerts.append({
            "type": "mst_full",
            "severity": "warning",
            "message": f"MST '{mst.name}' is at full capacity",
            "mst_id": mst.id
        })
    
    # Check for faulty cores
    faulty_cores = await db.execute(
        select(FibreCore).where(FibreCore.status == "faulty").limit(10)
    )
    for core in faulty_cores.scalars().all():
        alerts.append({
            "type": "faulty_core",
            "severity": "error",
            "message": f"Fibre core {core.core_number} ({core.color}) is faulty",
            "core_id": core.id,
            "route_id": core.route_id
        })
    
    # Check for low optical power
    low_power_clients = await db.execute(
        select(Client).where(Client.rx_power < -25).limit(10)
    )
    for client in low_power_clients.scalars().all():
        alerts.append({
            "type": "low_optical_power",
            "severity": "warning",
            "message": f"Client '{client.name}' has low optical power ({client.rx_power} dBm)",
            "client_id": client.id
        })
    
    return {"alerts": alerts, "total": len(alerts)}
