"""Tenant-scoped NOC inventory and evidence-based monitoring endpoints.

Only ICMP is currently executable. Other methods are retained as explicit
integration configuration and report unconfigured until an adapter is added.
"""
import asyncio
import ipaddress
import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_tenant_id, get_current_user_dependency, require_roles
from ..models import MonitoredDevice, MonitoringObservation, NetworkEvent, NetworkIncident, UserRole

router = APIRouter(prefix="/noc", tags=["Network Operations"])
WRITE_ROLES = (UserRole.SUPER_ADMIN, UserRole.ISP_ADMIN, UserRole.FIELD_ENGINEER)


class DeviceInput(BaseModel):
    device_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    device_type: str = Field(min_length=1, max_length=50)
    management_ip: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    monitoring_method: str = "icmp"
    monitoring_interval_seconds: int = Field(default=60, ge=30, le=86400)
    timeout_seconds: int = Field(default=3, ge=1, le=10)
    dependency_device_ids: list[str] = Field(default_factory=list)
    credential_reference: Optional[str] = Field(default=None, max_length=255)

    @field_validator("management_ip")
    @classmethod
    def validate_ip(cls, value: str) -> str:
        try:
            return str(ipaddress.ip_address(value.strip()))
        except ValueError as exc:
            raise ValueError("Management address must be a literal IPv4 or IPv6 address") from exc

    @field_validator("monitoring_method")
    @classmethod
    def validate_method(cls, value: str) -> str:
        allowed = {"icmp", "snmp", "api", "webhook", "manual"}
        if value not in allowed:
            raise ValueError(f"Monitoring method must be one of: {', '.join(sorted(allowed))}")
        return value

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, value: Optional[float]) -> Optional[float]:
        if value is not None and not -90 <= value <= 90:
            raise ValueError("Latitude must be between -90 and 90")
        return value

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, value: Optional[float]) -> Optional[float]:
        if value is not None and not -180 <= value <= 180:
            raise ValueError("Longitude must be between -180 and 180")
        return value


class IncidentUpdate(BaseModel):
    status: str
    assigned_team: Optional[str] = None
    resolution_notes: Optional[str] = None


def device_json(device: MonitoredDevice) -> dict[str, Any]:
    return {
        "id": device.id, "device_id": device.device_id, "name": device.name,
        "device_type": device.device_type, "management_ip": device.management_ip,
        "latitude": float(device.latitude) if device.latitude is not None else None,
        "longitude": float(device.longitude) if device.longitude is not None else None,
        "location_name": device.location_name, "monitoring_method": device.monitoring_method,
        "monitoring_interval_seconds": device.monitoring_interval_seconds,
        "timeout_seconds": device.timeout_seconds,
        "dependency_device_ids": device.dependency_device_ids or [],
        "credential_reference": device.credential_reference, "status": device.status,
        "last_success_at": device.last_success_at.isoformat() if device.last_success_at else None,
        "last_failure_at": device.last_failure_at.isoformat() if device.last_failure_at else None,
        "last_checked_at": device.last_checked_at.isoformat() if device.last_checked_at else None,
    }


def event_json(event: NetworkEvent, device: Optional[MonitoredDevice] = None) -> dict[str, Any]:
    return {
        "id": event.id, "device_id": event.device_id,
        "asset": device.name if device else None, "event_type": event.event_type,
        "severity": event.severity, "status": event.status,
        "confidence": event.confidence, "evidence": event.evidence or {},
        "incident_id": event.incident_id,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def incident_json(incident: NetworkIncident) -> dict[str, Any]:
    return {
        "id": incident.id, "incident_code": incident.incident_code,
        "title": incident.title, "category": incident.category,
        "severity": incident.severity, "status": incident.status,
        "confidence": incident.confidence,
        "affected_device_ids": incident.affected_device_ids or [],
        "affected_customer_ids": incident.affected_customer_ids or [],
        "affected_customers_count": len(set(incident.affected_customer_ids or [])),
        "assigned_team": incident.assigned_team,
        "resolution_notes": incident.resolution_notes,
        "first_observed_at": incident.first_observed_at.isoformat() if incident.first_observed_at else None,
        "last_updated_at": incident.last_updated_at.isoformat() if incident.last_updated_at else None,
    }


@router.get("/devices")
async def list_monitored_devices(
    db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_current_tenant_id),
    _user=Depends(get_current_user_dependency),
):
    rows = (await db.execute(select(MonitoredDevice).where(
        MonitoredDevice.tenant_id == tenant_id).order_by(MonitoredDevice.name))).scalars().all()
    return {"items": [device_json(row) for row in rows], "monitoring_worker": "not_configured"}


@router.post("/devices", status_code=201)
async def create_monitored_device(
    payload: DeviceInput, db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id), _user=Depends(require_roles(*WRITE_ROLES)),
):
    existing = await db.execute(select(MonitoredDevice).where(
        MonitoredDevice.tenant_id == tenant_id, MonitoredDevice.device_id == payload.device_id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Device ID already exists in this ISP")
    if payload.monitoring_method == "icmp" and not payload.management_ip:
        raise HTTPException(422, "ICMP monitoring requires a management IP")
    known = (await db.execute(select(MonitoredDevice.device_id).where(
        MonitoredDevice.tenant_id == tenant_id))).scalars().all()
    if set(payload.dependency_device_ids) - set(known):
        raise HTTPException(422, "Dependencies must refer to devices in this ISP")
    device = MonitoredDevice(tenant_id=tenant_id, **payload.model_dump())
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device_json(device)


@router.put("/devices/{device_id}")
async def update_monitored_device(
    device_id: int, payload: DeviceInput, db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id), _user=Depends(require_roles(*WRITE_ROLES)),
):
    device = await db.scalar(select(MonitoredDevice).where(
        MonitoredDevice.id == device_id, MonitoredDevice.tenant_id == tenant_id))
    if not device:
        raise HTTPException(404, "Device not found")
    duplicate = await db.scalar(select(MonitoredDevice).where(
        MonitoredDevice.tenant_id == tenant_id,
        MonitoredDevice.device_id == payload.device_id,
        MonitoredDevice.id != device_id))
    if duplicate:
        raise HTTPException(409, "Device ID already exists in this ISP")
    known = (await db.execute(select(MonitoredDevice.device_id).where(
        MonitoredDevice.tenant_id == tenant_id, MonitoredDevice.id != device_id))).scalars().all()
    if set(payload.dependency_device_ids) - set(known):
        raise HTTPException(422, "Dependencies must refer to other devices in this ISP")
    for key, value in payload.model_dump().items():
        setattr(device, key, value)
    device.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(device)
    return device_json(device)


async def _icmp_check(device: MonitoredDevice) -> tuple[str, dict[str, Any]]:
    """Run one bounded ping against a validated literal IP; no power inference."""
    address = ipaddress.ip_address(device.management_ip)
    timeout_ms = max(1000, device.timeout_seconds * 1000)
    if os.name == "nt":
        args = ["ping", "-n", "1", "-w", str(timeout_ms), str(address)]
    else:
        args = ["ping", "-n", "-c", "1", "-W", str(device.timeout_seconds), str(address)]
    try:
        process = await asyncio.create_subprocess_exec(
            *args, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
        await asyncio.wait_for(process.wait(), timeout=device.timeout_seconds + 2)
        result = "reachable" if process.returncode == 0 else "unreachable"
        return result, {"method": "icmp", "target": str(address), "response_received": process.returncode == 0}
    except (FileNotFoundError, asyncio.TimeoutError) as exc:
        return "monitoring_unavailable", {"method": "icmp", "target": str(address),
                                           "response_received": False, "check_error": type(exc).__name__}


async def poll_one(db: AsyncSession, tenant_id: str, device: MonitoredDevice) -> dict[str, Any]:
    now = datetime.utcnow()
    if device.monitoring_method != "icmp":
        result, evidence = "unconfigured", {"method": device.monitoring_method,
                                             "reason": "No adapter is configured for this method"}
    else:
        result, evidence = await _icmp_check(device)
    previous = device.status
    device.last_checked_at = now
    if result == "reachable":
        device.status = "online"
        device.last_success_at = now
    elif result == "unreachable":
        device.status = "unreachable"
        device.last_failure_at = now
    elif result == "monitoring_unavailable":
        device.status = "monitoring_unavailable"
    else:
        device.status = "unconfigured"
    db.add(MonitoringObservation(tenant_id=tenant_id, device_id=device.id,
                                 method=device.monitoring_method, result=result, evidence=evidence,
                                 observed_at=now))

    open_event = await db.scalar(select(NetworkEvent).where(
        NetworkEvent.tenant_id == tenant_id, NetworkEvent.device_id == device.id,
        NetworkEvent.event_type == "device_unreachable", NetworkEvent.status == "open"))
    if result == "unreachable" and not open_event:
        downstream = await _dependent_devices(db, tenant_id, device)
        incident = NetworkIncident(
            tenant_id=tenant_id, incident_code=f"INC-{secrets.token_hex(5).upper()}",
            title=f"Device unreachable — {device.name}", category="device_unreachable",
            severity="major" if device.device_type in {"router", "olt", "core_router"} else "warning",
            status="new", confidence="suspected",
            affected_device_ids=[device.id, *downstream], affected_customer_ids=[],
            first_observed_at=now, last_updated_at=now)
        db.add(incident)
        await db.flush()
        db.add(NetworkEvent(tenant_id=tenant_id, device_id=device.id,
                            event_type="device_unreachable", severity=incident.severity,
                            status="open", confidence="suspected", evidence=evidence,
                            incident_id=incident.id, created_at=now))
    elif result == "reachable" and open_event:
        open_event.status = "recovered"
        open_event.updated_at = now
        incident = await db.scalar(select(NetworkIncident).where(
            NetworkIncident.id == open_event.incident_id,
            NetworkIncident.tenant_id == tenant_id))
        if incident and incident.status not in {"closed", "resolved"}:
            incident.status = "monitoring_recovery"
            incident.last_updated_at = now
    return {"device_id": device.id, "previous_status": previous,
            "status": device.status, "result": result, "evidence": evidence,
            "checked_at": now.isoformat()}


async def _dependent_devices(db: AsyncSession, tenant_id: str, root: MonitoredDevice) -> list[int]:
    devices = (await db.execute(select(MonitoredDevice).where(
        MonitoredDevice.tenant_id == tenant_id))).scalars().all()
    known = {device.device_id: device for device in devices}
    affected: set[int] = set()
    frontier = {root.device_id}
    while frontier:
        next_frontier: set[str] = set()
        for device in devices:
            if device.device_id in affected or device.device_id in frontier:
                continue
            if set(device.dependency_device_ids or []) & frontier:
                affected.add(device.device_id)
                next_frontier.add(device.device_id)
        frontier = next_frontier
    return [known[key].id for key in affected]


@router.post("/devices/{device_id}/check")
async def check_device(
    device_id: int, db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id), _user=Depends(require_roles(*WRITE_ROLES)),
):
    device = await db.scalar(select(MonitoredDevice).where(
        MonitoredDevice.id == device_id, MonitoredDevice.tenant_id == tenant_id))
    if not device:
        raise HTTPException(404, "Device not found")
    result = await poll_one(db, tenant_id, device)
    await db.commit()
    return result


@router.post("/check")
async def check_all_devices(
    db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_current_tenant_id),
    _user=Depends(require_roles(*WRITE_ROLES)),
):
    devices = (await db.execute(select(MonitoredDevice).where(
        MonitoredDevice.tenant_id == tenant_id).order_by(MonitoredDevice.id))).scalars().all()
    results = []
    # Cap simultaneous probes, but serialize ORM writes through the session.
    semaphore = asyncio.Semaphore(8)
    async def probe(device: MonitoredDevice):
        async with semaphore:
            if device.monitoring_method != "icmp":
                return "unconfigured", {"method": device.monitoring_method,
                                         "reason": "No adapter is configured for this method"}
            return await _icmp_check(device)
    probe_results = await asyncio.gather(*(probe(device) for device in devices))
    for device, (result, evidence) in zip(devices, probe_results):
        # Reuse poll_one's event/observation logic without making another probe.
        device.last_checked_at = datetime.utcnow()
        if result == "reachable":
            device.status, device.last_success_at = "online", device.last_checked_at
        elif result == "unreachable":
            device.status, device.last_failure_at = "unreachable", device.last_checked_at
        elif result == "monitoring_unavailable":
            device.status = "monitoring_unavailable"
        else:
            device.status = "unconfigured"
        db.add(MonitoringObservation(tenant_id=tenant_id, device_id=device.id,
                                     method=device.monitoring_method, result=result,
                                     evidence=evidence, observed_at=device.last_checked_at))
        open_event = await db.scalar(select(NetworkEvent).where(
            NetworkEvent.tenant_id == tenant_id, NetworkEvent.device_id == device.id,
            NetworkEvent.event_type == "device_unreachable", NetworkEvent.status == "open"))
        if result == "unreachable" and not open_event:
            downstream = await _dependent_devices(db, tenant_id, device)
            incident = NetworkIncident(
                tenant_id=tenant_id, incident_code=f"INC-{secrets.token_hex(5).upper()}",
                title=f"Device unreachable — {device.name}", category="device_unreachable",
                severity="major" if device.device_type in {"router", "olt", "core_router"} else "warning",
                status="new", confidence="suspected", affected_device_ids=[device.id, *downstream],
                affected_customer_ids=[], first_observed_at=device.last_checked_at,
                last_updated_at=device.last_checked_at)
            db.add(incident)
            await db.flush()
            db.add(NetworkEvent(tenant_id=tenant_id, device_id=device.id,
                                event_type="device_unreachable", severity=incident.severity,
                                status="open", confidence="suspected", evidence=evidence,
                                incident_id=incident.id, created_at=device.last_checked_at))
        elif result == "reachable" and open_event:
            open_event.status = "recovered"
            open_event.updated_at = device.last_checked_at
            incident = await db.scalar(select(NetworkIncident).where(
                NetworkIncident.id == open_event.incident_id,
                NetworkIncident.tenant_id == tenant_id))
            if incident and incident.status not in {"closed", "resolved"}:
                incident.status = "monitoring_recovery"
                incident.last_updated_at = device.last_checked_at
        results.append({"device_id": device.id, "status": device.status,
                        "result": result, "evidence": evidence,
                        "checked_at": device.last_checked_at.isoformat()})
    await db.commit()
    return {"checked": len(results), "results": results,
            "worker": "manual_check_only", "note": "Scheduled polling worker is not configured."}


@router.get("/dashboard")
async def dashboard(
    stale_after_seconds: int = Query(300, ge=60, le=86400),
    db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_current_tenant_id),
    _user=Depends(get_current_user_dependency),
):
    devices = (await db.execute(select(MonitoredDevice).where(
        MonitoredDevice.tenant_id == tenant_id))).scalars().all()
    events = (await db.execute(select(NetworkEvent).where(
        NetworkEvent.tenant_id == tenant_id, NetworkEvent.status == "open"))).scalars().all()
    incidents = (await db.execute(select(NetworkIncident).where(
        NetworkIncident.tenant_id == tenant_id,
        NetworkIncident.status.notin_(["resolved", "closed"])))).scalars().all()
    now = datetime.utcnow()
    stale = [d for d in devices if not d.last_checked_at or d.last_checked_at < now - timedelta(seconds=stale_after_seconds)]
    healthy = sum(d.status == "online" for d in devices)
    unreachable = sum(d.status == "unreachable" for d in devices)
    checked_at = max((d.last_checked_at for d in devices if d.last_checked_at), default=None)
    return {
        "counts": {"devices_total": len(devices), "healthy_devices": healthy,
                   "unreachable_devices": unreachable, "unconfigured_devices": sum(d.status in {"unconfigured", "monitoring_unavailable"} for d in devices),
                   "stale_devices": len(stale), "open_events": len(events),
                   "active_incidents": len(incidents), "major_incidents": sum(i.severity in {"major", "critical"} for i in incidents),
                   "affected_customers": len({customer_id for incident in incidents for customer_id in (incident.affected_customer_ids or [])})},
        "last_successful_check": max((d.last_success_at for d in devices if d.last_success_at), default=None).isoformat()
          if any(d.last_success_at for d in devices) else None,
        "latest_check": checked_at.isoformat() if checked_at else None,
        "telemetry_status": "stale" if devices and len(stale) == len(devices) else "partial" if stale else "current" if devices else "not_configured",
        "stale_after_seconds": stale_after_seconds,
        "limitations": ["No scheduled monitoring worker is configured.",
                        "Only ICMP checks are implemented; SNMP, API, traps and webhook adapters require configuration.",
                        "ICMP unreachability does not establish device power loss or a fibre fault.",
                        "Customer impact is unknown until customer topology is linked to monitored devices."],
    }


@router.get("/events")
async def list_events(
    limit: int = Query(100, ge=1, le=500), status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_current_tenant_id),
    _user=Depends(get_current_user_dependency),
):
    query = select(NetworkEvent).where(NetworkEvent.tenant_id == tenant_id)
    if status_filter:
        query = query.where(NetworkEvent.status == status_filter)
    rows = (await db.execute(query.order_by(NetworkEvent.created_at.desc()).limit(limit))).scalars().all()
    device_ids = {event.device_id for event in rows if event.device_id is not None}
    devices = (await db.execute(select(MonitoredDevice).where(
        MonitoredDevice.tenant_id == tenant_id, MonitoredDevice.id.in_(device_ids)))).scalars().all() if device_ids else []
    device_map = {device.id: device for device in devices}
    return {"items": [event_json(event, device_map.get(event.device_id)) for event in rows], "limit": limit}


@router.get("/incidents")
async def list_incidents(
    limit: int = Query(100, ge=1, le=500), db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id), _user=Depends(get_current_user_dependency),
):
    rows = (await db.execute(select(NetworkIncident).where(
        NetworkIncident.tenant_id == tenant_id).order_by(NetworkIncident.last_updated_at.desc()).limit(limit))).scalars().all()
    return {"items": [incident_json(row) for row in rows], "limit": limit}


@router.patch("/incidents/{incident_id}")
async def update_incident(
    incident_id: int, payload: IncidentUpdate, db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id), _user=Depends(require_roles(*WRITE_ROLES)),
):
    allowed = {"new", "investigating", "suspected_fault", "confirmed_fault", "engineer_assigned",
               "repair_in_progress", "monitoring_recovery", "resolved", "closed", "reopened"}
    if payload.status not in allowed:
        raise HTTPException(422, f"Status must be one of: {', '.join(sorted(allowed))}")
    incident = await db.scalar(select(NetworkIncident).where(
        NetworkIncident.id == incident_id, NetworkIncident.tenant_id == tenant_id))
    if not incident:
        raise HTTPException(404, "Incident not found")
    incident.status = payload.status
    incident.assigned_team = payload.assigned_team
    incident.resolution_notes = payload.resolution_notes
    incident.last_updated_at = datetime.utcnow()
    incident.closed_at = datetime.utcnow() if payload.status == "closed" else None
    await db.commit()
    await db.refresh(incident)
    return incident_json(incident)
