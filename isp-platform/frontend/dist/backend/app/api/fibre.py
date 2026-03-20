from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from decimal import Decimal
from math import radians, sin, cos, sqrt, atan2

from ..core.database import get_db
from ..models import (
    FibreRoute, FibreCore, MSTBox, Client, ActivityLog,
    FibreCoreStatus, get_fiber_color
)
from ..schemas import (
    FibreRoute, FibreRouteCreate, FibreRouteUpdate,
    FibreCore, FibreCoreCreate, FibreCoreUpdate
)
from ..core.security import get_current_user

router = APIRouter(prefix="/fibre", tags=["Fibre Routes"])


def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in meters"""
    R = 6371000  # Earth's radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)
    
    a = sin(delta_phi/2)**2 + cos(phi1)*cos(phi2)*sin(delta_lambda/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


@router.get("/routes", response_model=List[FibreRoute])
async def get_fibre_routes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all fibre routes"""
    result = await db.execute(
        select(FibreRoute).offset(skip).limit(limit).order_by(FibreRoute.created_at.desc())
    )
    return result.scalars().all()


@router.get("/routes/{route_id}", response_model=FibreRoute)
async def get_fibre_route(
    route_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific fibre route"""
    result = await db.execute(
        select(FibreRoute).where(FibreRoute.id == route_id)
    )
    route = result.scalar_one_or_none()
    
    if not route:
        raise HTTPException(status_code=404, detail="Fibre route not found")
    
    return route


@router.post("/routes", response_model=FibreRoute, status_code=status.HTTP_201_CREATED)
async def create_fibre_route(
    route_data: FibreRouteCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new fibre route with automatic core generation"""
    # Validate start MST
    start_mst_result = await db.execute(
        select(MSTBox).where(MSTBox.id == route_data.start_mst_id)
    )
    start_mst = start_mst_result.scalar_one_or_none()
    if not start_mst:
        raise HTTPException(status_code=400, detail="Start MST not found")
    
    # Validate end point (MST or client)
    end_lat, end_lon = None, None
    if route_data.end_mst_id:
        end_mst_result = await db.execute(
            select(MSTBox).where(MSTBox.id == route_data.end_mst_id)
        )
        end_mst = end_mst_result.scalar_one_or_none()
        if not end_mst:
            raise HTTPException(status_code=400, detail="End MST not found")
        end_lat, end_lon = float(end_mst.latitude), float(end_mst.longitude)
    elif route_data.end_client_id:
        end_client_result = await db.execute(
            select(Client).where(Client.id == route_data.end_client_id)
        )
        end_client = end_client_result.scalar_one_or_none()
        if not end_client:
            raise HTTPException(status_code=400, detail="End client not found")
        end_lat, end_lon = float(end_client.latitude), float(end_client.longitude)
    else:
        raise HTTPException(status_code=400, detail="Either end_mst_id or end_client_id must be provided")
    
    # Calculate distance
    distance = calculate_distance(
        float(start_mst.latitude), float(start_mst.longitude),
        end_lat, end_lon
    )
    
    # Create route geometry (simple line for now)
    geom = f"LINESTRING({start_mst.longitude} {start_mst.latitude}, {end_lon} {end_lat})"
    
    route = FibreRoute(
        **route_data.model_dump(exclude={"route_coordinates"}),
        total_cores=route_data.fibre_type,
        distance_meters=Decimal(distance),
        route_path=geom
    )
    
    db.add(route)
    await db.flush()
    
    # Automatically create fibre cores
    for core_num in range(1, route_data.fibre_type + 1):
        core = FibreCore(
            route_id=route.id,
            core_number=core_num,
            color=get_fiber_color(core_num),
            status=FibreCoreStatus.FREE
        )
        db.add(core)
    
    # Activity log
    log = ActivityLog(
        action_type="fibre_route_created",
        action_description=f"Fibre route '{route.name}' created with {route_data.fibre_type} cores",
        user_id=current_user.id,
        fibre_route_id=route.id,
        after_state={
            "route_id": route.route_id,
            "fibre_type": route.fibre_type,
            "distance_meters": float(distance)
        }
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(route)
    
    return route


@router.get("/routes/{route_id}/cores", response_model=List[FibreCore])
async def get_route_cores(
    route_id: int,
    status_filter: Optional[FibreCoreStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all cores for a fibre route"""
    query = select(FibreCore).where(FibreCore.route_id == route_id)
    
    if status_filter:
        query = query.where(FibreCore.status == status_filter)
    
    result = await db.execute(query.order_by(FibreCore.core_number))
    return result.scalars().all()


@router.get("/cores/{core_id}", response_model=FibreCore)
async def get_core(
    core_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific fibre core"""
    result = await db.execute(
        select(FibreCore).where(FibreCore.id == core_id)
    )
    core = result.scalar_one_or_none()
    
    if not core:
        raise HTTPException(status_code=404, detail="Fibre core not found")
    
    return core


@router.put("/cores/{core_id}", response_model=FibreCore)
async def update_core(
    core_id: int,
    core_data: FibreCoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a fibre core"""
    result = await db.execute(
        select(FibreCore).where(FibreCore.id == core_id)
    )
    core = result.scalar_one_or_none()
    
    if not core:
        raise HTTPException(status_code=404, detail="Fibre core not found")
    
    before_state = {"status": core.status, "client_id": core.client_id}
    
    update_data = core_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(core, field, value)
    
    log = ActivityLog(
        action_type="fibre_core_updated",
        action_description=f"Fibre core {core.core_number} ({core.color}) updated",
        user_id=current_user.id,
        after_state=update_data
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(core)
    
    return core


@router.post("/cores/{core_id}/assign-client/{client_id}", response_model=FibreCore)
async def assign_core_to_client(
    core_id: int,
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Assign a fibre core to a client"""
    # Get core
    core_result = await db.execute(
        select(FibreCore).where(FibreCore.id == core_id)
    )
    core = core_result.scalar_one_or_none()
    if not core:
        raise HTTPException(status_code=404, detail="Fibre core not found")
    
    if core.status == FibreCoreStatus.USED:
        raise HTTPException(status_code=400, detail="Core is already in use")
    
    # Get client
    client_result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Assign core
    core.client_id = client_id
    core.status = FibreCoreStatus.USED
    client.fibre_core_id = core_id
    
    log = ActivityLog(
        action_type="fibre_core_assigned",
        action_description=f"Core {core.core_number} ({core.color}) assigned to client '{client.name}'",
        user_id=current_user.id,
        client_id=client_id,
        after_state={"core_id": core_id, "core_color": core.color}
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(core)
    
    return core


@router.get("/stats", response_model=dict)
async def get_fibre_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get fibre network statistics"""
    total_routes = await db.execute(select(func.count(FibreRoute.id)))
    total_cores = await db.execute(select(func.sum(FibreRoute.total_cores)))
    used_cores = await db.execute(
        select(func.count(FibreCore.id)).where(FibreCore.status == FibreCoreStatus.USED)
    )
    free_cores = await db.execute(
        select(func.count(FibreCore.id)).where(FibreCore.status == FibreCoreStatus.FREE)
    )
    faulty_cores = await db.execute(
        select(func.count(FibreCore.id)).where(FibreCore.status == FibreCoreStatus.FAULTY)
    )
    total_distance = await db.execute(select(func.sum(FibreRoute.distance_meters)))
    
    return {
        "total_routes": total_routes.scalar() or 0,
        "total_cores": total_cores.scalar() or 0,
        "used_cores": used_cores.scalar() or 0,
        "free_cores": free_cores.scalar() or 0,
        "faulty_cores": faulty_cores.scalar() or 0,
        "total_distance_km": float((total_distance.scalar() or 0) / 1000)
    }