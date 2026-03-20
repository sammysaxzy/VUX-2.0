from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..core.database import get_db
from ..models.models import MSTBox, FibreRoute, FibreCore, Client
from pydantic import BaseModel

router = APIRouter(prefix="/map", tags=["Map"])


class MapData(BaseModel):
    mst_boxes: List[dict]
    fibre_routes: List[dict]
    clients: List[dict]


@router.get("/data", response_model=MapData)
async def get_map_data(db: AsyncSession = Depends(get_db)):
    """Get all map data: MST boxes, fibre routes, and clients"""
    
    # Get all MST boxes with coordinates
    mst_query = select(MSTBox).where(
        MSTBox.latitude.isnot(None),
        MSTBox.longitude.isnot(None)
    )
    mst_result = await db.execute(mst_query)
    mst_boxes = [
        {
            "id": m.id,
            "mst_id": m.mst_id,
            "name": m.name,
            "location": m.location,
            "latitude": float(m.latitude) if m.latitude else None,
            "longitude": float(m.longitude) if m.longitude else None,
            "status": m.status,
            "total_cores": m.total_cores,
            "used_cores": m.used_cores,
            "splitter_type": m.splitter_type,
            "type": "mst"
        }
        for m in mst_result.scalars().all()
    ]
    
    # Get all fibre routes
    routes_query = select(FibreRoute)
    routes_result = await db.execute(routes_query)
    fibre_routes = [
        {
            "id": r.id,
            "name": r.name,
            "route_type": r.route_type,
            "total_cores": r.total_cores,
            "status": r.status,
            "type": "route"
        }
        for r in routes_result.scalars().all()
    ]
    
    # Get all clients with coordinates
    clients_query = select(Client).where(
        Client.latitude.isnot(None),
        Client.longitude.isnot(None)
    )
    clients_result = await db.execute(clients_query)
    clients = [
        {
            "id": c.id,
            "client_id": c.client_id,
            "name": c.name,
            "latitude": float(c.latitude) if c.latitude else None,
            "longitude": float(c.longitude) if c.longitude else None,
            "status": c.status,
            "service_type": c.service_type,
            "mst_box_id": c.mst_box_id,
            "type": "client"
        }
        for c in clients_result.scalars().all()
    ]
    
    return MapData(
        mst_boxes=mst_boxes,
        fibre_routes=fibre_routes,
        clients=clients
    )


@router.get("/route/{route_id}/cores")
async def get_route_cores(route_id: int, db: AsyncSession = Depends(get_db)):
    """Get all fibre cores for a specific route"""
    cores_query = select(FibreCore).where(FibreCore.route_id == route_id)
    cores_result = await db.execute(cores_query)
    cores = cores_result.scalars().all()
    
    color_map = {
        1: "#0066CC", 2: "#FF6600", 3: "#00CC00", 4: "#9933FF",
        5: "#FFFFFF", 6: "#FFFF00", 7: "#00FFFF", 8: "#FF00FF",
        9: "#99FF00", 10: "#FFCC00", 11: "#0099FF", 12: "#FF3366"
    }
    
    return [
        {
            "id": core.id,
            "core_number": core.core_number,
            "color_code": color_map.get(core.core_number, "#808080"),
            "color_name": core.color_name,
            "status": core.status,
            "connected_to": core.connected_to
        }
        for core in cores
    ]