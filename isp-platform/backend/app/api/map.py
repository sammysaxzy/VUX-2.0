from collections import deque
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..core.security import get_current_user
from ..models import (
    ActivityLog,
    Client,
    Closure,
    FibreCore,
    FibreCoreStatus,
    FibreRoute,
    LinkHealthStatus,
    MSTBox,
    NetworkAlert,
    NetworkLink,
    NetworkNodeType,
    OLTOffice,
)
from ..schemas import (
    Closure as ClosureSchema,
    ClosureCreate,
    ClosureUpdate,
    FaultDetectionResponse,
    MapTopologyData,
    NetworkLink as NetworkLinkSchema,
    NetworkLinkCreate,
    NetworkLinkUpdate,
    OLTOffice as OLTOfficeSchema,
    OLTOfficeCreate,
    OLTOfficeUpdate,
    TracePathResponse,
)

router = APIRouter(prefix="/map", tags=["Map"])


class DisablePortRequest(BaseModel):
    port_number: int
    reason: Optional[str] = None


class ConnectClientRequest(BaseModel):
    client_id: int
    splitter_port: int


def _enum_value(value):
    if hasattr(value, "value"):
        return value.value
    return value


def _node_key(node_type: NetworkNodeType, node_id: int) -> str:
    return f"{_enum_value(node_type)}:{node_id}"


def _core_color_hex(core_color: Optional[str], fallback_status: Optional[str]) -> str:
    palette = {
        "Blue": "#3b82f6",
        "Orange": "#f97316",
        "Green": "#22c55e",
        "Brown": "#a16207",
        "Slate": "#64748b",
        "White": "#f8fafc",
        "Red": "#ef4444",
        "Black": "#171717",
        "Yellow": "#eab308",
        "Violet": "#8b5cf6",
        "Rose": "#f43f5e",
        "Aqua": "#06b6d4",
    }

    if core_color and core_color in palette:
        return palette[core_color]

    if fallback_status == "faulty":
        return "#ef4444"
    if fallback_status == "used":
        return "#22c55e"
    if fallback_status == "reserved":
        return "#f59e0b"
    return "#64748b"


def _as_float(value: Optional[Decimal]) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def _coords_for_node(
    node_type: NetworkNodeType,
    node_id: int,
    olts: Dict[int, OLTOffice],
    closures: Dict[int, Closure],
    msts: Dict[int, MSTBox],
    clients: Dict[int, Client],
) -> Optional[Tuple[float, float]]:
    if node_type == NetworkNodeType.OLT and node_id in olts:
        o = olts[node_id]
        return float(o.latitude), float(o.longitude)
    if node_type == NetworkNodeType.CLOSURE and node_id in closures:
        c = closures[node_id]
        return float(c.latitude), float(c.longitude)
    if node_type == NetworkNodeType.MST and node_id in msts:
        m = msts[node_id]
        return float(m.latitude), float(m.longitude)
    if node_type == NetworkNodeType.CLIENT and node_id in clients:
        c = clients[node_id]
        return float(c.latitude), float(c.longitude)
    return None


def _serialize_link(
    link: NetworkLink,
    olts: Dict[int, OLTOffice],
    closures: Dict[int, Closure],
    msts: Dict[int, MSTBox],
    clients: Dict[int, Client],
) -> dict:
    source_type = _enum_value(link.source_type)
    destination_type = _enum_value(link.destination_type)
    core_status = _enum_value(link.core_status)
    health_status = _enum_value(link.health_status)
    cable_type = _enum_value(link.cable_type)

    coordinates = list(link.coordinates or [])
    if len(coordinates) < 2:
        start = _coords_for_node(link.source_type, link.source_id, olts, closures, msts, clients)
        end = _coords_for_node(link.destination_type, link.destination_id, olts, closures, msts, clients)
        if start and end:
            coordinates = [{"lat": start[0], "lng": start[1]}, {"lat": end[0], "lng": end[1]}]

    return {
        "id": link.id,
        "link_id": link.link_id,
        "name": link.name,
        "source_type": source_type,
        "source_id": link.source_id,
        "destination_type": destination_type,
        "destination_id": link.destination_id,
        "route_id": link.route_id,
        "cable_type": cable_type,
        "core_count": link.core_count,
        "buffer_group": link.buffer_group,
        "active_core_number": link.active_core_number,
        "active_core_color": link.active_core_color,
        "core_status": core_status,
        "color_hex": _core_color_hex(link.active_core_color, core_status),
        "distance_meters": float(link.distance_meters or 0),
        "coordinates": coordinates,
        "signal_dbm": _as_float(link.signal_dbm),
        "splice_loss_db": float(link.splice_loss_db or 0),
        "distance_loss_db": float(link.distance_loss_db or 0),
        "total_loss_db": float(link.total_loss_db or 0),
        "is_active": bool(link.is_active),
        "health_status": health_status,
        "type": "link",
    }


def _serialize_mst(mst: MSTBox) -> dict:
    return {
        "id": mst.id,
        "mst_id": mst.mst_id,
        "name": mst.name,
        "location_name": mst.location_name,
        "latitude": float(mst.latitude),
        "longitude": float(mst.longitude),
        "capacity_status": mst.capacity_status,
        "total_ports": mst.total_ports,
        "used_ports": mst.used_ports,
        "free_ports": max((mst.total_ports or 0) - (mst.used_ports or 0), 0),
        "splitter_type": _enum_value(mst.splitter_type),
        "signal_dbm": None,
        "port_details": mst.port_details or [],
        "connected_customers": 0,
        "type": "mst",
    }


def _serialize_client(client: Client) -> dict:
    return {
        "id": client.id,
        "client_id": client.client_id,
        "name": client.name,
        "latitude": float(client.latitude),
        "longitude": float(client.longitude),
        "status": _enum_value(client.status),
        "service_type": client.assigned_plan or "N/A",
        "mst_id": client.mst_id,
        "rx_power": _as_float(client.rx_power),
        "tx_power": _as_float(client.tx_power),
        "is_online": bool(client.is_online),
        "pppoe_username": client.pppoe_username,
        "type": "client",
    }


def _serialize_closure(closure: Closure) -> dict:
    return {
        "id": closure.id,
        "closure_id": closure.closure_id,
        "name": closure.name,
        "location_name": closure.location_name,
        "latitude": float(closure.latitude),
        "longitude": float(closure.longitude),
        "incoming_cable_size": closure.incoming_cable_size,
        "outgoing_cable_size": closure.outgoing_cable_size,
        "incoming_source_type": _enum_value(closure.incoming_source_type),
        "incoming_source_id": closure.incoming_source_id,
        "outgoing_destination_type": _enum_value(closure.outgoing_destination_type),
        "outgoing_destination_id": closure.outgoing_destination_id,
        "splice_matrix": closure.splice_matrix or [],
        "signal_dbm": _as_float(closure.signal_dbm),
        "notes": closure.notes,
        "type": "closure",
    }


def _serialize_olt(olt: OLTOffice) -> dict:
    return {
        "id": olt.id,
        "olt_id": olt.olt_id,
        "name": olt.name,
        "location_name": olt.location_name,
        "latitude": float(olt.latitude),
        "longitude": float(olt.longitude),
        "pon_power_dbm": _as_float(olt.pon_power_dbm),
        "status": olt.status,
        "notes": olt.notes,
        "type": "olt",
    }


def _trace_to_target(
    target_type: NetworkNodeType,
    target_id: int,
    links: List[NetworkLink],
    olts: List[OLTOffice],
) -> Tuple[List[NetworkLink], bool]:
    target_key = _node_key(target_type, target_id)
    starts = [_node_key(NetworkNodeType.OLT, olt.id) for olt in olts]
    if not starts:
        return [], False

    graph: Dict[str, List[NetworkLink]] = {}
    for link in links:
        graph.setdefault(_node_key(link.source_type, link.source_id), []).append(link)

    parent_node: Dict[str, str] = {}
    parent_link: Dict[str, NetworkLink] = {}
    queue = deque(starts)
    visited = set(starts)

    found = False
    while queue:
        current = queue.popleft()
        if current == target_key:
            found = True
            break

        for link in graph.get(current, []):
            next_key = _node_key(link.destination_type, link.destination_id)
            if next_key in visited:
                continue
            visited.add(next_key)
            parent_node[next_key] = current
            parent_link[next_key] = link
            queue.append(next_key)

    if not found:
        return [], False

    path_links: List[NetworkLink] = []
    cursor = target_key
    while cursor not in starts:
        link = parent_link.get(cursor)
        if not link:
            break
        path_links.append(link)
        cursor = parent_node[cursor]

    path_links.reverse()
    return path_links, True


def _build_trace_response(
    target_type: NetworkNodeType,
    target_id: int,
    links: List[NetworkLink],
    olts: List[OLTOffice],
    olt_map: Dict[int, OLTOffice],
    closure_map: Dict[int, Closure],
    mst_map: Dict[int, MSTBox],
    client_map: Dict[int, Client],
) -> TracePathResponse:
    path_links, found = _trace_to_target(target_type, target_id, links, olts)
    if not found:
        return TracePathResponse(
            target_type=target_type,
            target_id=target_id,
            found=False,
            nodes=[],
            links=[],
            total_loss_db=0.0,
            fault_detected=True,
            fault_at={"reason": "No connected path found from any OLT to target"},
        )

    serialized_links = [
        _serialize_link(link, olt_map, closure_map, mst_map, client_map) for link in path_links
    ]
    node_sequence: List[dict] = []

    if path_links:
        first = path_links[0]
        start_coords = _coords_for_node(
            first.source_type, first.source_id, olt_map, closure_map, mst_map, client_map
        )
        node_sequence.append(
            {
                "node_type": _enum_value(first.source_type),
                "node_id": first.source_id,
                "coordinates": {"lat": start_coords[0], "lng": start_coords[1]} if start_coords else None,
            }
        )

    for link in path_links:
        end_coords = _coords_for_node(
            link.destination_type, link.destination_id, olt_map, closure_map, mst_map, client_map
        )
        node_sequence.append(
            {
                "node_type": _enum_value(link.destination_type),
                "node_id": link.destination_id,
                "coordinates": {"lat": end_coords[0], "lng": end_coords[1]} if end_coords else None,
            }
        )

    total_loss = sum(float(link.total_loss_db or 0) for link in path_links)
    faulty_link = next(
        (
            link
            for link in path_links
            if (not bool(link.is_active)) or link.health_status != LinkHealthStatus.HEALTHY
        ),
        None,
    )

    fault_at = None
    if faulty_link:
        fault_at = {
            "link_id": faulty_link.link_id,
            "health_status": _enum_value(faulty_link.health_status),
            "is_active": bool(faulty_link.is_active),
            "source_type": _enum_value(faulty_link.source_type),
            "source_id": faulty_link.source_id,
            "destination_type": _enum_value(faulty_link.destination_type),
            "destination_id": faulty_link.destination_id,
        }

    return TracePathResponse(
        target_type=target_type,
        target_id=target_id,
        found=True,
        nodes=node_sequence,
        links=serialized_links,
        total_loss_db=round(total_loss, 3),
        fault_detected=fault_at is not None,
        fault_at=fault_at,
    )


@router.get("/data", response_model=MapTopologyData)
async def get_map_data(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return complete topology payload for advanced map rendering."""
    olt_rows = (await db.execute(select(OLTOffice))).scalars().all()
    closure_rows = (await db.execute(select(Closure))).scalars().all()
    mst_rows = (
        await db.execute(select(MSTBox).where(MSTBox.latitude.isnot(None), MSTBox.longitude.isnot(None)))
    ).scalars().all()
    client_rows = (
        await db.execute(select(Client).where(Client.latitude.isnot(None), Client.longitude.isnot(None)))
    ).scalars().all()
    route_rows = (await db.execute(select(FibreRoute))).scalars().all()
    link_rows = (await db.execute(select(NetworkLink))).scalars().all()
    alert_rows = (
        await db.execute(
            select(NetworkAlert).where(NetworkAlert.is_resolved == False).order_by(NetworkAlert.created_at.desc())
        )
    ).scalars().all()

    olt_map = {o.id: o for o in olt_rows}
    closure_map = {c.id: c for c in closure_rows}
    mst_map = {m.id: m for m in mst_rows}
    client_map = {c.id: c for c in client_rows}

    links = [_serialize_link(link, olt_map, closure_map, mst_map, client_map) for link in link_rows]
    connected_by_mst: Dict[int, int] = {}
    for client in client_rows:
        if client.mst_id:
            connected_by_mst[client.mst_id] = connected_by_mst.get(client.mst_id, 0) + 1

    # Keep this for backwards-compatibility with the existing frontend shape.
    fibre_routes = []
    for route in route_rows:
        linked = next((l for l in links if l["route_id"] == route.id), None)
        if linked:
            coords = linked["coordinates"]
        else:
            start = mst_map.get(route.start_mst_id)
            end = mst_map.get(route.end_mst_id) if route.end_mst_id else client_map.get(route.end_client_id)
            if not start or not end:
                continue
            coords = [
                {"lat": float(start.latitude), "lng": float(start.longitude)},
                {"lat": float(end.latitude), "lng": float(end.longitude)},
            ]

        fibre_routes.append(
            {
                "id": route.id,
                "route_id": route.route_id,
                "name": route.name,
                "fibre_type": route.fibre_type,
                "total_cores": route.total_cores,
                "installation_type": route.installation_type,
                "distance_meters": float(route.distance_meters or 0),
                "start_mst_id": route.start_mst_id,
                "end_mst_id": route.end_mst_id,
                "end_client_id": route.end_client_id,
                "coordinates": coords,
                "type": "route",
            }
        )

    alerts = [
        {
            "id": alert.id,
            "alert_code": alert.alert_code,
            "alert_type": alert.alert_type,
            "severity": _enum_value(alert.severity),
            "message": alert.message,
            "node_type": _enum_value(alert.node_type),
            "node_id": alert.node_id,
            "link_id": alert.link_id,
            "client_id": alert.client_id,
            "is_resolved": bool(alert.is_resolved),
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        }
        for alert in alert_rows
    ]

    return MapTopologyData(
        olt_offices=[_serialize_olt(o) for o in olt_rows],
        closures=[_serialize_closure(c) for c in closure_rows],
        mst_boxes=[
            {**_serialize_mst(m), "connected_customers": connected_by_mst.get(m.id, 0)} for m in mst_rows
        ],
        clients=[_serialize_client(c) for c in client_rows],
        links=links,
        fibre_routes=fibre_routes,
        alerts=alerts,
        summary={
            "total_olts": len(olt_rows),
            "total_closures": len(closure_rows),
            "total_msts": len(mst_rows),
            "total_clients": len(client_rows),
            "total_links": len(link_rows),
            "active_links": len([l for l in link_rows if l.is_active]),
            "faulty_links": len([l for l in link_rows if l.health_status != LinkHealthStatus.HEALTHY]),
            "open_alerts": len(alert_rows),
        },
    )


@router.get("/trace/customer/{customer_id}", response_model=TracePathResponse)
async def trace_customer_path(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    client = await db.get(Client, customer_id)
    if not client:
        raise HTTPException(status_code=404, detail="Customer not found")

    olt_rows = (await db.execute(select(OLTOffice))).scalars().all()
    closure_rows = (await db.execute(select(Closure))).scalars().all()
    mst_rows = (await db.execute(select(MSTBox))).scalars().all()
    client_rows = (await db.execute(select(Client))).scalars().all()
    link_rows = (await db.execute(select(NetworkLink))).scalars().all()

    return _build_trace_response(
        target_type=NetworkNodeType.CLIENT,
        target_id=customer_id,
        links=link_rows,
        olts=olt_rows,
        olt_map={o.id: o for o in olt_rows},
        closure_map={c.id: c for c in closure_rows},
        mst_map={m.id: m for m in mst_rows},
        client_map={c.id: c for c in client_rows},
    )


@router.get("/trace/mst/{mst_id}", response_model=TracePathResponse)
async def trace_mst_path(
    mst_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(status_code=404, detail="MST not found")

    olt_rows = (await db.execute(select(OLTOffice))).scalars().all()
    closure_rows = (await db.execute(select(Closure))).scalars().all()
    mst_rows = (await db.execute(select(MSTBox))).scalars().all()
    client_rows = (await db.execute(select(Client))).scalars().all()
    link_rows = (await db.execute(select(NetworkLink))).scalars().all()

    return _build_trace_response(
        target_type=NetworkNodeType.MST,
        target_id=mst_id,
        links=link_rows,
        olts=olt_rows,
        olt_map={o.id: o for o in olt_rows},
        closure_map={c.id: c for c in closure_rows},
        mst_map={m.id: m for m in mst_rows},
        client_map={c.id: c for c in client_rows},
    )


@router.get("/trace/link/{link_id}", response_model=TracePathResponse)
async def trace_link_path(
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    link = await db.get(NetworkLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Network link not found")

    olt_rows = (await db.execute(select(OLTOffice))).scalars().all()
    closure_rows = (await db.execute(select(Closure))).scalars().all()
    mst_rows = (await db.execute(select(MSTBox))).scalars().all()
    client_rows = (await db.execute(select(Client))).scalars().all()
    link_rows = (await db.execute(select(NetworkLink))).scalars().all()

    return _build_trace_response(
        target_type=link.destination_type,
        target_id=link.destination_id,
        links=link_rows,
        olts=olt_rows,
        olt_map={o.id: o for o in olt_rows},
        closure_map={c.id: c for c in closure_rows},
        mst_map={m.id: m for m in mst_rows},
        client_map={c.id: c for c in client_rows},
    )


@router.get("/fault/customer/{customer_id}", response_model=FaultDetectionResponse)
async def detect_fault_for_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    trace = await trace_customer_path(customer_id=customer_id, db=db, current_user=current_user)
    probable_fault = trace.fault_at
    break_detected = trace.fault_detected or not trace.found
    if not probable_fault and break_detected:
        probable_fault = {"reason": "Signal path could not be completed from OLT to customer"}

    return FaultDetectionResponse(
        customer_id=customer_id,
        trace=trace,
        break_detected=break_detected,
        probable_fault=probable_fault,
    )


@router.get("/loss/customer/{customer_id}")
async def get_customer_loss_breakdown(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    trace = await trace_customer_path(customer_id=customer_id, db=db, current_user=current_user)
    if not trace.found:
        return {
            "customer_id": customer_id,
            "found": False,
            "total_loss_db": 0,
            "splice_loss_db": 0,
            "distance_loss_db": 0,
            "signal_estimate_dbm": None,
        }

    splice_loss = sum(float(link.get("splice_loss_db") or 0) for link in trace.links)
    distance_loss = sum(float(link.get("distance_loss_db") or 0) for link in trace.links)
    total_loss = round(splice_loss + distance_loss, 3)

    # Basic estimate from first OLT power in path if available.
    signal_start = None
    if trace.nodes:
        first = trace.nodes[0]
        if first.get("node_type") == "olt":
            olt = await db.get(OLTOffice, first.get("node_id"))
            signal_start = float(olt.pon_power_dbm) if olt and olt.pon_power_dbm is not None else None

    signal_estimate = None
    if signal_start is not None:
        signal_estimate = round(signal_start - total_loss, 2)

    return {
        "customer_id": customer_id,
        "found": True,
        "total_loss_db": total_loss,
        "splice_loss_db": round(splice_loss, 3),
        "distance_loss_db": round(distance_loss, 3),
        "signal_estimate_dbm": signal_estimate,
    }


@router.post("/mst/{mst_id}/disable-port")
async def disable_mst_port(
    mst_id: int,
    payload: DisablePortRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(status_code=404, detail="MST not found")

    if payload.port_number < 1 or payload.port_number > (mst.total_ports or 0):
        raise HTTPException(status_code=400, detail=f"Port must be in range 1-{mst.total_ports}")

    details = list(mst.port_details or [])
    updated = False
    for idx, entry in enumerate(details):
        if int(entry.get("port", 0)) == payload.port_number:
            details[idx] = {
                **entry,
                "status": "disabled",
                "disabled_reason": payload.reason,
                "disabled_at": datetime.utcnow().isoformat(),
            }
            updated = True
            break

    if not updated:
        details.append(
            {
                "port": payload.port_number,
                "status": "disabled",
                "disabled_reason": payload.reason,
                "disabled_at": datetime.utcnow().isoformat(),
            }
        )

    mst.port_details = details
    db.add(
        ActivityLog(
            action_type="mst_port_disabled",
            action_description=f"MST {mst.mst_id} port {payload.port_number} disabled",
            user_id=current_user.id,
            mst_id=mst.id,
            after_state={"port": payload.port_number, "reason": payload.reason},
        )
    )
    await db.commit()
    await db.refresh(mst)

    return {
        "mst_id": mst.id,
        "port_number": payload.port_number,
        "status": "disabled",
        "reason": payload.reason,
    }


@router.post("/mst/{mst_id}/connect-client")
async def connect_client_to_mst_from_map(
    mst_id: int,
    payload: ConnectClientRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    mst = await db.get(MSTBox, mst_id)
    if not mst:
        raise HTTPException(status_code=404, detail="MST not found")

    client = await db.get(Client, payload.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if payload.splitter_port < 1 or payload.splitter_port > (mst.total_ports or 0):
        raise HTTPException(status_code=400, detail=f"Port must be in range 1-{mst.total_ports}")

    used_port = await db.execute(
        select(Client).where(Client.mst_id == mst.id, Client.splitter_port == payload.splitter_port)
    )
    existing = used_port.scalar_one_or_none()
    if existing and existing.id != client.id:
        raise HTTPException(status_code=400, detail="Splitter port already used")

    previous_mst_id = client.mst_id
    client.mst_id = mst.id
    client.splitter_port = payload.splitter_port

    if previous_mst_id and previous_mst_id != mst.id:
        prev_mst = await db.get(MSTBox, previous_mst_id)
        if prev_mst and (prev_mst.used_ports or 0) > 0:
            prev_mst.used_ports = max(prev_mst.used_ports - 1, 0)

    assigned_count = (
        await db.execute(select(Client).where(Client.mst_id == mst.id, Client.splitter_port.isnot(None)))
    ).scalars().all()
    mst.used_ports = len(assigned_count)
    ratio = (mst.used_ports / mst.total_ports) if mst.total_ports else 0
    if ratio >= 1:
        mst.capacity_status = "full"
    elif ratio >= 0.8:
        mst.capacity_status = "nearly_full"
    else:
        mst.capacity_status = "available"

    db.add(
        ActivityLog(
            action_type="client_connected",
            action_description=f"Client '{client.name}' connected to MST '{mst.name}' on port {payload.splitter_port}",
            user_id=current_user.id,
            client_id=client.id,
            mst_id=mst.id,
            after_state={"splitter_port": payload.splitter_port},
        )
    )
    await db.commit()
    await db.refresh(client)

    return {
        "client_id": client.id,
        "mst_id": mst.id,
        "splitter_port": payload.splitter_port,
        "status": "connected",
    }


@router.get("/route/{route_id}/cores")
async def get_route_cores(
    route_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get all fibre cores for one route."""
    cores_result = await db.execute(select(FibreCore).where(FibreCore.route_id == route_id))
    cores = cores_result.scalars().all()

    return [
        {
            "id": core.id,
            "core_number": core.core_number,
            "color_name": core.color,
            "color_code": _core_color_hex(core.color, _enum_value(core.status)),
            "status": _enum_value(core.status),
            "connected_to_client_id": core.client_id,
        }
        for core in cores
    ]


@router.get("/closures", response_model=List[ClosureSchema])
async def list_closures(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(Closure).offset(skip).limit(limit).order_by(Closure.created_at.desc()))
    return result.scalars().all()


@router.post("/closures", response_model=ClosureSchema, status_code=status.HTTP_201_CREATED)
async def create_closure(
    closure_data: ClosureCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = await db.execute(select(Closure).where(Closure.closure_id == closure_data.closure_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Closure ID already exists")

    payload = closure_data.model_dump()
    closure = Closure(**payload)
    db.add(closure)
    await db.commit()
    await db.refresh(closure)
    return closure


@router.put("/closures/{closure_id}", response_model=ClosureSchema)
async def update_closure(
    closure_id: int,
    closure_data: ClosureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    closure = await db.get(Closure, closure_id)
    if not closure:
        raise HTTPException(status_code=404, detail="Closure not found")

    update_data = closure_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(closure, key, value)

    await db.commit()
    await db.refresh(closure)
    return closure


@router.get("/olts", response_model=List[OLTOfficeSchema])
async def list_olts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(OLTOffice).offset(skip).limit(limit).order_by(OLTOffice.created_at.desc()))
    return result.scalars().all()


@router.post("/olts", response_model=OLTOfficeSchema, status_code=status.HTTP_201_CREATED)
async def create_olt(
    olt_data: OLTOfficeCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = await db.execute(select(OLTOffice).where(OLTOffice.olt_id == olt_data.olt_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="OLT ID already exists")

    olt = OLTOffice(**olt_data.model_dump())
    db.add(olt)
    await db.commit()
    await db.refresh(olt)
    return olt


@router.put("/olts/{olt_id}", response_model=OLTOfficeSchema)
async def update_olt(
    olt_id: int,
    olt_data: OLTOfficeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    olt = await db.get(OLTOffice, olt_id)
    if not olt:
        raise HTTPException(status_code=404, detail="OLT not found")

    for key, value in olt_data.model_dump(exclude_unset=True).items():
        setattr(olt, key, value)

    await db.commit()
    await db.refresh(olt)
    return olt


@router.get("/links", response_model=List[NetworkLinkSchema])
async def list_links(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(NetworkLink).offset(skip).limit(limit).order_by(NetworkLink.created_at.desc()))
    return result.scalars().all()


@router.post("/links", response_model=NetworkLinkSchema, status_code=status.HTTP_201_CREATED)
async def create_link(
    link_data: NetworkLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = await db.execute(select(NetworkLink).where(NetworkLink.link_id == link_data.link_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Link ID already exists")

    link = NetworkLink(**link_data.model_dump())
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.put("/links/{link_id}", response_model=NetworkLinkSchema)
async def update_link(
    link_id: int,
    link_data: NetworkLinkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    link = await db.get(NetworkLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Network link not found")

    for key, value in link_data.model_dump(exclude_unset=True).items():
        setattr(link, key, value)

    await db.commit()
    await db.refresh(link)
    return link
